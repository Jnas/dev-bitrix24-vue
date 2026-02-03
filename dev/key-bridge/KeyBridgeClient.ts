// KeyBridgeClient.ts
import {keyBridgeConfig} from "./keyBridgeConfig.ts";
import {api} from "../api.ts";

type AxiosErrorResponseType = {
    response?: {
        status: number;
        data?: {
            message?: string;
        };
    };
    message?: string;
}

export type ApiCallType = {
    method: string;
    params?: unknown[];
};

export type BatchRequestType = {
    requestKey: string;
    call: ApiCallType;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timestamp: number;
};

export type ServerResultType = {
    requestKey: string;
    status: 'done' | 'pending';
    result?: unknown;
    isError?: boolean;
};

export type ServerBatchResponseType = {
    ok: boolean;
    data: {
        intervalMs?: number;
        results?: ServerResultType[];
        created?: Array<{ requestKey: string; status: string }>;
        cleanupCount?: number;
    };
};

type AxiosResponseType<T = unknown> = {
    data: T;
    status: number;
    statusText: string;
    headers: unknown;
    config: unknown;
    request?: unknown;
};

export type KeyBridgeStateType = {
    connected: boolean;
    processing: boolean;
    error: string | null;
    pollRate: number;
    queues: {
        pending: number;
        active: number;
        completed: number;
    };
};

class KeyBridgeClient {
    private connection = {
        key: null as string | null,
        pollRate: 500,
        broken: false
    };

    private queues = {
        pending: new Map<string, BatchRequestType>(),
        active: new Map<string, BatchRequestType>(),
        completed: new Set<string>()
    };

    private state = {
        processing: false,
        error: null as string | null
    };

    private stateListeners = new Set<(state: KeyBridgeStateType) => void>();

    getState(): KeyBridgeStateType {
        return {
            connected: !this.connection.broken && !!this.connection.key,
            processing: this.state.processing,
            error: this.state.error,
            pollRate: this.connection.pollRate,
            queues: {
                pending: this.queues.pending.size,
                active: this.queues.active.size,
                completed: this.queues.completed.size
            }
        };
    }

    onStateChange(listener: (state: KeyBridgeStateType) => void): () => void {
        this.stateListeners.add(listener);
        listener(this.getState());
        return () => this.stateListeners.delete(listener);
    }

    private notifyStateChange(): void {
        const state = this.getState();
        this.stateListeners.forEach(listener => listener(state));
    }

    async setKey(key: string | null): Promise<void> {
        this.connection.broken = false;
        this.state.error = null;
        this.resetState();
        this.connection.key = (key || '').trim() || null;

        if (!this.connection.key) {
            this.notifyStateChange();
            return;
        }

        try {
            await this.initializeConnection();
            this.notifyStateChange();
        } catch (error) {
            this.state.error = this.getErrorMessage(error);
            this.notifyStateChange();
            throw error;
        }
    }

    async executeOrFallback<T>(apiCall: ApiCallType, fallback: () => Promise<T>): Promise<T> {
        if (this.connection.broken || !this.connection.key) {
            return fallback();
        }

        return new Promise<T>((resolve, reject) => {
            const requestKey = this.generateRequestKey();
            const request: BatchRequestType = {
                requestKey,
                call: apiCall,
                resolve: (value) => resolve(value as T),
                reject,
                timestamp: Date.now()
            };

            this.queues.pending.set(requestKey, request);
            this.notifyStateChange();
            this.processIfNeeded();
        });
    }

    private async initializeConnection(): Promise<void> {
        if (!this.connection.key) throw new Error('No connection key');
        try {
            const response: AxiosResponseType<unknown> = await api().methods.axios.post(
                keyBridgeConfig.getPushUrl(),
                {key: this.connection.key, init: true},
                {timeout: 5000}
            );
            const serverResponse = this.validateInitResponse(response.data);

            if (typeof serverResponse.intervalMs === 'number' && serverResponse.intervalMs > 0) {
                this.connection.pollRate = Math.max(500, Math.min(10000, serverResponse.intervalMs));
            }

        } catch (error: unknown) {
            const axiosError = error as AxiosErrorResponseType;
            if (axiosError.response?.status === 404) {
                this.connection.broken = true;
                this.state.error = axiosError.response.data?.message || 'Session not found. Create key again.';
                this.connection.key = null;
                throw new Error('KEY_NOT_FOUND');
            }
            throw error;
        }
    }

    private validateInitResponse(data: unknown): ServerBatchResponseType['data'] {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid response structure');
        }

        const hasOkAndData = (obj: object): obj is ServerBatchResponseType =>
            'ok' in obj && 'data' in obj;

        const hasDirectData = (obj: object): obj is ServerBatchResponseType['data'] =>
            'intervalMs' in obj || 'results' in obj || 'created' in obj || 'cleanupCount' in obj;

        if (hasOkAndData(data)) {
            const batchResponse = data as ServerBatchResponseType;
            if (!batchResponse.ok) {
                throw new Error('Server returned error status');
            }
            return batchResponse.data;
        }

        if (hasDirectData(data)) {
            return data as ServerBatchResponseType['data'];
        }

        throw new Error('Unrecognized response format');
    }

    private async processIfNeeded(): Promise<void> {
        if (this.connection.broken || this.state.processing || !this.connection.key) return;

        const hasWork = this.queues.pending.size > 0 ||
            this.queues.active.size > 0 ||
            this.queues.completed.size > 0;

        if (!hasWork) return;

        this.state.processing = true;
        this.notifyStateChange();

        try {
            await this.processBatch();
        } finally {
            this.state.processing = false;
            this.notifyStateChange();
        }
    }

    private async processBatch(): Promise<void> {
        if (this.connection.broken || !this.connection.key) return;

        const payload = {
            key: this.connection.key,
            completedKeys: Array.from(this.queues.completed),
            statusRequestKeys: Array.from(this.queues.active.keys()),
            calls: Array.from(this.queues.pending.values()).map(req => ({
                requestKey: req.requestKey,
                method: req.call.method,
                params: req.call.params || []
            }))
        };

        const batchToSend = new Map(this.queues.pending);
        const completedSnapshot = new Set(this.queues.completed);

        this.queues.pending.clear();
        this.queues.completed.clear();

        try {
            const response: AxiosResponseType<unknown> = await api().methods.axios.post(
                keyBridgeConfig.getPushUrl(),
                payload,
                {timeout: this.connection.pollRate * 2}
            );

            const responseData = this.validateInitResponse(response.data);

            if (!responseData) {
                throw new Error('Invalid batch response');
            }

            this.handleBatchResponse(responseData, batchToSend);

            const shouldScheduleNext = this.queues.pending.size > 0 ||
                this.queues.active.size > 0 ||
                this.queues.completed.size > 0;

            if (shouldScheduleNext) {
                setTimeout(() => this.processIfNeeded(), this.connection.pollRate);
            }

        } catch (error) {
            this.handleBatchError(error, batchToSend, completedSnapshot);
        }
    }

    private handleBatchResponse(data: ServerBatchResponseType['data'], batchToSend: Map<string, BatchRequestType>): void {
        if (typeof data.intervalMs === 'number') {
            this.connection.pollRate = Math.max(500, Math.min(10000, data.intervalMs));
        }

        if (data.results && data.results.length > 0) {
            data.results.forEach((result: ServerResultType) => {
                const request = this.queues.active.get(result.requestKey);
                if (!request) return;

                if (result.status === 'done') {
                    if (result.isError) {
                        request.reject(new Error(typeof result.result === 'string' ? result.result : 'Execution failed'));
                    } else {
                        request.resolve(this.parseResult(result.result));
                    }

                    this.queues.active.delete(result.requestKey);
                    this.queues.completed.add(result.requestKey);
                }
            });
        }

        if (data.created && data.created.length > 0) {
            data.created.forEach((item: { requestKey: string; status: string }) => {
                const request = batchToSend.get(item.requestKey);
                if (!request) return;

                if (item.status === 'pending') {
                    this.queues.active.set(item.requestKey, request);
                } else {
                    request.reject(new Error('Failed to enqueue request'));
                }
            });
        }

        this.notifyStateChange();
    }

    private handleBatchError(
        error: unknown,
        batchToSend: Map<string, BatchRequestType>,
        completedSnapshot: Set<string>
    ): void {
        const errorMsg = this.getErrorMessage(error);

        batchToSend.forEach((request, key) => {
            this.queues.pending.set(key, request);
        });

        completedSnapshot.forEach(key => {
            this.queues.completed.add(key);
        });

        this.state.error = errorMsg;

        const axiosError = error as AxiosErrorResponseType;
        const isCriticalError = axiosError.response?.status === 404 || axiosError.response?.status === 500;

        if (isCriticalError) {
            this.connection.broken = true;

            if (axiosError.response?.status === 404) {
                this.connection.key = null;
                this.state.error = axiosError.response.data?.message || 'Session not found. Create key again.';
            }

            this.resetState();
        } else {
            setTimeout(() => this.processIfNeeded(), Math.min(2000, this.connection.pollRate));
        }

        this.notifyStateChange();
    }

    private resetState(): void {
        [...this.queues.pending.values(), ...this.queues.active.values()].forEach(req => {
            req.reject(new Error('Connection reset'));
        });

        this.queues.pending.clear();
        this.queues.active.clear();
        this.queues.completed.clear();
        this.state.processing = false;
        this.notifyStateChange();
    }

    private generateRequestKey(): string {
        return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    private parseResult(result: unknown): unknown {
        if (typeof result === 'string') {
            try {
                const parsed = JSON.parse(result);
                if (parsed && typeof parsed === 'object' && parsed.result !== undefined) {
                    return parsed.result;
                }
                return parsed;
            } catch {
                return result;
            }
        }
        if (result && typeof result === 'object') {
            const obj = result as Record<string, unknown>;
            if (obj.method !== undefined && obj.result !== undefined) {
                return obj.result;
            }
            return result;
        }
        return result;
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'Unknown error';
    }

    get isConnected(): boolean {
        return !this.connection.broken &&
            !!this.connection.key &&
            !this.state.error;
    }

    getLastError(): string | null {
        return this.state.error;
    }
}

export const keyBridgeClient = new KeyBridgeClient();
