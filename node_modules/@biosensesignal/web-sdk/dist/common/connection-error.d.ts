export declare class ConnectionError extends Error {
    readonly code: number;
    constructor(code: number, m: string);
}
