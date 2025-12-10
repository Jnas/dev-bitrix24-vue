// /dev/mockDataLoader.ts
import type {ApiObjectFieldsType} from "./api.ts";

type MockMethodType = {
    method: string;
    params?: Record<string, unknown> | unknown[];
    result: unknown;
    delay?: number;
};

type FieldsFileType = {
    data: ApiObjectFieldsType;
    mtime: Date;
};

export type MockDataType = {
    latestFields: ApiObjectFieldsType;
    methodMocks: MockMethodType[];
};

const env = import.meta.env;

// ----------- TYPE GUARDS -----------
function isApiObjectFieldsType(obj: unknown): obj is ApiObjectFieldsType {
    return typeof obj === "object" && obj !== null && "placement" in obj;
}

function isMockMethodType(obj: unknown): obj is MockMethodType {
    if (typeof obj !== "object" || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return (
        typeof o.method === "string" &&
        "result" in o
    );
}

// ----------- PARAMS NORMALIZATION -----------
/**
 * Normalizes parameters for comparison
 * Empty arrays [] are converted to empty objects {}
 * This is needed because in Bitrix24 API empty parameters can be passed both as [] and as {}
 */
function normalizeParams(params: unknown): Record<string, unknown> | unknown[] {
    if (Array.isArray(params) && params.length === 0) {
        return {};
    }
    if (typeof params === 'object' && params !== null && Object.keys(params).length === 0) {
        return {};
    }
    return params as Record<string, unknown> | unknown[];
}

/**
 * Compares parameters with normalization taken into account
 */
function areParamsEqual(params1: unknown, params2: unknown): boolean {
    const normalized1 = normalizeParams(params1);
    const normalized2 = normalizeParams(params2);

    return JSON.stringify(normalized1) === JSON.stringify(normalized2);
}

// ----------- MAIN LOADER -----------
export function loadMockData(): MockDataType {
    if (!env?.DEV) {
        return {latestFields: {placement: null}, methodMocks: []};
    }

    try {
        const mockModules = import.meta.glob<unknown>("/src/mock/*.json", {
            eager: true,
            import: "default"
        });

        const fieldsFiles: FieldsFileType[] = [];
        const methodMocks: MockMethodType[] = [];

        Object.values(mockModules).forEach((content: unknown) => {
            if (isApiObjectFieldsType(content)) {
                fieldsFiles.push({
                    data: content,
                    mtime: new Date()
                });
            } else if (isMockMethodType(content)) {
                // Normalize parameters when loading mock data
                const normalizedParams = normalizeParams(content.params ?? {});

                methodMocks.push({
                    method: content.method,
                    params: normalizedParams,
                    result: content.result,
                    delay: content.delay
                });
            }
        });

        fieldsFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        return {
            latestFields: fieldsFiles[0]?.data || null,
            methodMocks
        };
    } catch {
        console.error("Error loading mock data");
        return {latestFields: {placement: null}, methodMocks: []};
    }
}

// Export normalization function for use in other modules
export {normalizeParams, areParamsEqual};
