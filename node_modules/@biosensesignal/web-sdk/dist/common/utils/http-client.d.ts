export declare enum HttpRequestError {
    GENERIC = 0,
    TIMEOUT = 1
}
export declare class HttpClient {
    static performRequest(url: string, method: any, body?: any, timeout?: number): Promise<any>;
}
