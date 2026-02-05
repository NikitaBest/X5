export declare class MonitorError extends Error {
    readonly errorCode: number;
    constructor(errorCode: number, m: string);
}
