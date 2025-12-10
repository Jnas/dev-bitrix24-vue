// KeyBridgeClient.ts
// Main client class for interacting with the KeyBridge server

import {keyBridgeConfig} from "./keyBridgeConfig.ts";
import {api} from "../api.ts";

// ===== DATA TYPES =====
type AxiosErrorResponseType = {
    response?: {
        status: number;
        data?: {
            message?: string;
        };
    };
    message?: string;
}

/**
 * Type for describing an API call
 */
export type ApiCallType = {
    method: string;         // API method name
    params?: unknown[];     // Call parameters
};

/**
 * Type for request in batch processing
 */
export type BatchRequestType = {
    requestKey: string;     // Unique request identifier
    call: ApiCallType;      // API call data
    resolve: (value: unknown) => void;  // Promise resolve function
    reject: (reason?: unknown) => void; // Promise reject function
    timestamp: number;      // Creation timestamp
};

/**
 * Server result type
 */
export type ServerResultType = {
    requestKey: string;     // Request identifier
    status: 'done';         // Execution status
    result?: unknown;       // Execution result
    isError?: boolean;      // Error flag
};

/**
 * Server batch response type
 */
export type ServerBatchResponseType = {
    ok: boolean;            // Operation success flag
    data: {
        intervalMs?: number;                    // Current polling interval
        results?: ServerResultType[];           // Completed request results
        created?: Array<{ requestKey: string; status: string }>; // Created requests
        cleanupCount?: number;                  // Cleaned up records count
    };
};

// Axios response type
type AxiosResponseType<T = unknown> = {
    data: T;
    status: number;
    statusText: string;
    headers: unknown;
    config: unknown;
    request?: unknown;
};

/**
 * KeyBridge client state type
 */
export type KeyBridgeStateType = {
    connected: boolean;     // Active connection flag
    processing: boolean;    // Operation execution flag
    error: string | null;   // Last error text
    pollRate: number;
    queues: {
        pending: number;    // Number of pending requests
        active: number;     // Number of active requests
        completed: number;  // Number of completed requests
    };
};

// ===== MAIN CLIENT CLASS =====

/**
 * Client for interacting with the KeyBridge server
 *
 * Manages request queues, provides batch processing
 * and automatic recovery on connection errors
 */
class KeyBridgeClient {
    // Private connection state fields
    private connection = {
        key: null as string | null,     // Current connection key
        pollRate: 500,                  // Polling interval in milliseconds
        broken: false                   // Critical connection break flag
    };

    // Queues for request management
    private queues = {
        pending: new Map<string, BatchRequestType>(),   // Requests awaiting sending
        active: new Map<string, BatchRequestType>(),    // Sent but not executed requests
        completed: new Set<string>()                    // Completed requests (for cleanup)
    };

    // Internal client state
    private state = {
        processing: false,              // Batch operation execution flag
        error: null as string | null    // Last error text
    };

    // State change subscribers
    private stateListeners = new Set<(state: KeyBridgeStateType) => void>();

    /**
     * Returns current client state
     */
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

    /**
     * Subscribes a listener to state changes
     * @param listener - State change handler function
     * @returns Unsubscribe function
     */
    onStateChange(listener: (state: KeyBridgeStateType) => void): () => void {
        this.stateListeners.add(listener);
        listener(this.getState());
        return () => this.stateListeners.delete(listener);
    }

    /**
     * Notifies all subscribers about state change
     */
    private notifyStateChange(): void {
        const state = this.getState();
        this.stateListeners.forEach(listener => listener(state));
    }

    /**
     * Sets or resets the connection key
     * @param key - Connection key or null to reset
     */
    async setKey(key: string | null): Promise<void> {
        // Reset error flags
        this.connection.broken = false;
        this.state.error = null;
        this.resetState();

        // Set new key (or null)
        this.connection.key = (key || '').trim() || null;

        if (!this.connection.key) {
            this.notifyStateChange();
            return;
        }

        try {
            // Initialize connection with the server
            await this.initializeConnection();
            this.notifyStateChange();
        } catch (error) {
            this.state.error = this.getErrorMessage(error);
            this.notifyStateChange();
            throw error;
        }
    }

    /**
     * Executes API call through KeyBridge or uses fallback when unavailable
     * @param apiCall - API call data
     * @param fallback - Fallback function in case KeyBridge is unavailable
     * @returns Promise with execution result
     */
    async executeOrFallback<T>(apiCall: ApiCallType, fallback: () => Promise<T>): Promise<T> {
        // If connection is broken or key not set - use fallback
        if (this.connection.broken || !this.connection.key) {
            return fallback();
        }

        // Create new request and add to queue
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

    /**
     * Initializes connection with the KeyBridge server
     */
    private async initializeConnection(): Promise<void> {
        if (!this.connection.key) throw new Error('No connection key');
        // Send test request to check connection
        try {
            const response: AxiosResponseType<unknown> = await api().methods.axios.post(
                keyBridgeConfig.getPushUrl(),
                {key: this.connection.key, init: true},
                {timeout: 5000}
            );
            // Validate and transform response
            const serverResponse = this.validateInitResponse(response.data);

            // Update polling interval
            if (typeof serverResponse.intervalMs === 'number' && serverResponse.intervalMs > 0) {
                this.connection.pollRate = Math.max(500, Math.min(10000, serverResponse.intervalMs));
            }

        } catch (error: unknown) {
            const axiosError = error as AxiosErrorResponseType;
            // Handle case when key not found on server
            if (axiosError.response?.status === 404) {
                this.connection.broken = true;
                this.state.error = axiosError.response.data?.message || 'Session not found. Create key again.';
                this.connection.key = null;
                throw new Error('KEY_NOT_FOUND');
            }
            throw error;
        }
    }

    /**
     * Validates server response on initialization
     */
    private validateInitResponse(data: unknown): ServerBatchResponseType['data'] {
        // Check that response has expected structure
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid response structure');
        }

        // Use type guards for safe checking
        const hasOkAndData = (obj: object): obj is ServerBatchResponseType =>
            'ok' in obj && 'data' in obj;

        const hasDirectData = (obj: object): obj is ServerBatchResponseType['data'] =>
            'intervalMs' in obj || 'results' in obj || 'created' in obj || 'cleanupCount' in obj;

        // Option 1: Server returns data in wrapper { ok, data }
        if (hasOkAndData(data)) {
            const batchResponse = data as ServerBatchResponseType;
            if (!batchResponse.ok) {
                throw new Error('Server returned error status');
            }
            return batchResponse.data;
        }

        // Option 2: Server returns data directly
        if (hasDirectData(data)) {
            return data as ServerBatchResponseType['data'];
        }

        throw new Error('Unrecognized response format');
    }

    /**
     * Checks need for processing and starts batch processing
     */
    private async processIfNeeded(): Promise<void> {
        // Check conditions for starting processing
        if (this.connection.broken || this.state.processing || !this.connection.key) return;

        // Check if there is work in queues
        const hasWork = this.queues.pending.size > 0 || this.queues.active.size > 0 || this.queues.completed.size > 0;
        if (!hasWork) return;

        // Set processing flag and notify subscribers
        this.state.processing = true;
        this.notifyStateChange();

        try {
            await this.processBatch();
        } finally {
            this.state.processing = false;
            this.notifyStateChange();
        }
    }

    /**
     * Executes batch request processing
     */
    private async processBatch(): Promise<void> {
        if (this.connection.broken || !this.connection.key) return;

        // Form payload for sending to server
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

        // Save current state for possible recovery on error
        const batchToSend = new Map(this.queues.pending);
        const completedSnapshot = new Set(this.queues.completed);

        // Clear queues before sending
        this.queues.pending.clear();
        this.queues.completed.clear();

        try {
            // Send batch request to server
            const response: AxiosResponseType<unknown> = await api().methods.axios.post(
                keyBridgeConfig.getPushUrl(),
                payload,
                {timeout: this.connection.pollRate * 2}
            );

            // Validate server response
            const responseData = this.validateInitResponse(response.data);

            if (!responseData) {
                throw new Error('Invalid batch response');
            }

            // Process successful response
            this.handleBatchResponse(responseData, batchToSend);

            // Schedule next processing if there are unprocessed requests
            if (this.queues.pending.size > 0 || this.queues.active.size > 0) {
                setTimeout(() => this.processIfNeeded(), this.connection.pollRate);
            }

        } catch (error) {
            // Restore state and handle error
            this.handleBatchError(error, batchToSend, completedSnapshot);
        }
    }

    /**
     * Processes successful response from server
     * @param data - Response data from server
     * @param batchToSend - Original batch of requests
     */
    private handleBatchResponse(data: ServerBatchResponseType['data'], batchToSend: Map<string, BatchRequestType>): void {
        // Update polling interval if received from server
        if (typeof data.intervalMs === 'number') {
            this.connection.pollRate = Math.max(500, Math.min(10000, data.intervalMs));
        }

        // Process results of completed requests
        data.results?.forEach((result: ServerResultType) => {
            const request = this.queues.active.get(result.requestKey);
            if (!request) return;

            if (result.status === 'done') {
                if (result.isError) {
                    // Reject promise with error
                    request.reject(new Error(typeof result.result === 'string' ? result.result : 'Execution failed'));
                } else {
                    // Resolve promise with result
                    request.resolve(this.parseResult(result.result));
                }
                this.queues.active.delete(result.requestKey);
                this.queues.completed.add(result.requestKey);
            }
        });

        // Process confirmations of new request creation
        data.created?.forEach((item: { requestKey: string; status: string }) => {
            const request = batchToSend.get(item.requestKey);
            if (!request) return;

            if (item.status === 'pending') {
                // Move request to active
                this.queues.active.set(item.requestKey, request);
            } else {
                // Reject request that failed to create
                request.reject(new Error('Failed to enqueue request'));
            }
        });

        this.notifyStateChange();
    }

    /**
     * Handles error during batch processing
     * @param error - Error object
     * @param batchToSend - Original batch of requests
     * @param completedSnapshot - Snapshot of completed requests
     */
    private handleBatchError(
        error: unknown,
        batchToSend: Map<string, BatchRequestType>,
        completedSnapshot: Set<string>
    ): void {
        // Restore queues from snapshot
        batchToSend.forEach((request, key) => {
            this.queues.pending.set(key, request);
        });
        completedSnapshot.forEach(key => this.queues.completed.add(key));

        // Save error text
        this.state.error = this.getErrorMessage(error);

        // Check if error is critical
        const axiosError = error as AxiosErrorResponseType;
        const isCriticalError = axiosError.response?.status === 404 || axiosError.response?.status === 500;

        if (isCriticalError) {
            // Break connection on critical errors
            this.connection.broken = true;

            // If it's 404 error (key not found), reset key
            if (axiosError.response?.status === 404) {
                this.connection.key = null;
                this.state.error = axiosError.response.data?.message || 'Session not found. Create key again.';
            }

            this.resetState();
        } else {
            // Schedule retry on non-critical errors
            setTimeout(() => this.processIfNeeded(), Math.min(2000, this.connection.pollRate));
        }

        this.notifyStateChange();
    }

    /**
     * Resets client state and rejects all pending requests
     */
    private resetState(): void {
        // Reject all pending and active requests
        [...this.queues.pending.values(), ...this.queues.active.values()].forEach(req => {
            req.reject(new Error('Connection reset'));
        });

        // Clear all queues
        this.queues.pending.clear();
        this.queues.active.clear();
        this.queues.completed.clear();
        this.state.processing = false;
        this.notifyStateChange();
    }

    /**
     * Generates unique key for request
     */
    private generateRequestKey(): string {
        return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    /**
     * Parses request execution result
     * @param result - Result from server
     */
    private parseResult(result: unknown): unknown {
        if (typeof result === 'string') {
            try {
                return JSON.parse(result);
            } catch {
                return result;
            }
        }
        return result;
    }

    /**
     * Extracts text message from error object
     * @param error - Error object
     */
    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'Unknown error';
    }

    // Compatibility with old code

    /**
     * Checks connection activity
     */
    get isConnected(): boolean {
        // Connection is considered active only if:
        // - No critical connection error
        // - Key is set
        // - No state error (e.g., 404 from server)
        return !this.connection.broken &&
            !!this.connection.key &&
            !this.state.error;
    }

    /**
     * Returns last error text
     */
    getLastError(): string | null {
        return this.state.error;
    }
}

// Export single client instance (singleton)
export const keyBridgeClient = new KeyBridgeClient();
