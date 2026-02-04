// /dev/api.ts
import {areParamsEqual, loadMockData, type MockDataType} from './mockDataLoader.ts';
import {keyBridgeClient} from './key-bridge/KeyBridgeClient.ts';

interface ToastMethods {
    success: (message: string, options?: unknown) => void;
    error: (message: string, options?: unknown) => void;
    warning: (message: string, options?: unknown) => void;
    info: (message: string, options?: unknown) => void;
    clear: () => void;
    isActive: (id: number) => boolean;
}

interface AxiosMethods {
    get<T = unknown>(url: string, config?: unknown): Promise<T>;

    post<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;

    put<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;

    delete<T = unknown>(url: string, config?: unknown): Promise<T>;
}

interface ApiMethods {
    b24Call: <T = unknown>(method: string, params?: unknown) => Promise<T>;
    b24Auth: <T = unknown>() => Promise<T>;
    toast: ToastMethods;
    axios: AxiosMethods;
    openCustomScript: (...args: unknown[]) => void;
    setUserfieldValue: (value: unknown) => void;
}

export interface ApiObjectType {
    methods: ApiMethods;
    fields: ApiObjectFieldsType;
}

export type ApiObjectFieldsType = {
    placement: unknown;
    [key: string]: unknown;
};

declare global {
    interface Window {
        __GLOBAL_API__?: () => ApiObjectType;
        Toast?: ToastMethods;
        Axios?: AxiosMethods;
        OpenCustomScript?: () => void;
    }
}

const getMockData = (): MockDataType => {
    if (import.meta.env.DEV) {
        try {
            return loadMockData();
        } catch {
            console.warn('[API] Failed to load mock data');
        }
    }
    return {latestFields: {placement: null}, methodMocks: []};
};

const {latestFields, methodMocks} = getMockData();

const findMock = async <T = unknown>(
    method: string,
    params: unknown = {}
): Promise<T> => {
    // Use comparison function with normalization instead of direct JSON.stringify
    const mock = methodMocks.find(
        (m) =>
            m.method === method &&
            areParamsEqual(m.params ?? {}, params)
    );

    if (!mock) {
        const indentedParams = JSON.stringify(params, null, 2)
            .split('\n')
            .map((line) => '  ' + line)
            .join(' \n');

        console.log(
            '%c[API]📥 Need to save mock request results\n' +
            '%c  Method: %c \n    ' + method + '\n' +
            '%c  Parameters: %c \n ' + indentedParams,

            // REQUIRED in this order:
            'color: #1A1A1A; background: #faf9f0; padding: 6px; border-radius: 4px; font-weight: bold', // [API]
            'color: #1A1A1A; background: #faf9f0; font-weight: bold', // "  Method: "
            'color: #1976D2; background: #faf9f0; font-weight: bold; cursor: text', // Method value
            'color: #1A1A1A; background: #faf9f0; font-weight: bold', // "  Parameters: "
            'color: #1976D2; background: #faf9f0; white-space: pre; cursor: text' // Parameter values
        );
        return {result: []} as T;
    }

    if (mock.delay) {
        await new Promise((resolve) => setTimeout(resolve, mock.delay));
    }
    return mock.result as T;
};

const createDevApi = (): ApiObjectType => {
    if (latestFields === null) {
        console.log('%c[API] ⚠️ Input data not loaded ' +
            '\n\tYou need to go to the application, get the input data and save it in the /src/mock folder ',
            'color: #8B0000; font-weight: bold; background: #FFF0F5; padding: 2px 5px; border-radius: 3px; border-left: 2px solid #FF6B6B;',
        );
    }
    return {
        methods: {
            b24Call: async <T = unknown>(method: string, params?: unknown): Promise<T> => {
                return keyBridgeClient.executeOrFallback<T>(
                    {method: 'b24Call', params: [method, params]},
                    () => findMock<T>(method, params)
                );
            },
            b24Auth: async <T = unknown>(): Promise<T> => {
                return keyBridgeClient.executeOrFallback<T>(
                    {method: 'b24Auth'},
                    async () => {
                        console.log(
                            '%c[b24Auth]📥 Not implemented in non-KeyBridge mode. Returning stub.',
                            'color: #D35400; background: #FDF5E6; padding: 2px 5px; border-radius: 3px; font-weight: bold; border-left: 2px solid #F39C12;'
                        );

                        const mock = methodMocks.find(m => m.method === 'b24Auth');
                        if (mock) {
                            if (mock.delay) {
                                await new Promise(resolve => setTimeout(resolve, mock.delay));
                            }
                            return mock.result as T;
                        }
                        // If no mock, return empty object of the required type
                        return {} as T;
                    }
                );
            },
            toast: window.Toast ?? ({} as ToastMethods),
            axios: window.Axios ?? ({} as AxiosMethods),
            openCustomScript: (...args: unknown[]) => {
                window.Toast?.warning?.(
                    `Method "openCustomScript" is not available in dev mode. Arguments: ${JSON.stringify(args)}`
                );
            },
            setUserfieldValue: (value: unknown) => {
                console.log(
                    '%c[DEV] ⚠️ setUserfieldValue' +
                    '\n\tMethod is not available in development mode \n\t→ For testing use production build \n\t→ Passed value: ' + JSON.stringify(value),
                    'color: #D35400; background: #FDF5E6; padding: 2px 5px; border-radius: 3px; font-weight: bold; border-left: 2px solid #F39C12;',
                )
                ;
            }
        },
        fields: latestFields === null ? {placement: null} : latestFields
    };
};

export const api = (): ApiObjectType => {
    if (import.meta.env.DEV) {
        return createDevApi();
    }

    if (typeof window.__GLOBAL_API__ === 'function') {
        return window.__GLOBAL_API__();
    }
    throw new Error('[API] Global API is not available');
};