const baseUrl = 'https://app.akfinance.ae/api/bitrix24-forms-dynamic'

// Configuration for KeyBridge client
export const keyBridgeConfig = {
    // Returns the full URL for push request
    getPushUrl(): string {
        return `${baseUrl}/key/client-batch`;
    },
};