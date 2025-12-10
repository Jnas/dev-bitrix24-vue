/**
 * Creates a delay for the specified number of milliseconds
 * @param ms - the number of milliseconds to wait
 * @returns A Promise that resolves after the specified time
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}