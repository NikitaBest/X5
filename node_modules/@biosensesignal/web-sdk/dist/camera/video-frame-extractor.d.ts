import { FrameExtractor, HandleFrame } from './camera.types';
export declare class VideoFrameExtractor implements FrameExtractor {
    private video;
    private lastFrameTime;
    private lastProcessedFrameTime;
    private context;
    private startTime;
    private handleFrame;
    private firstTimeStamp;
    private width;
    private height;
    constructor(video: HTMLVideoElement);
    setFrameHandler(handleFrame: HandleFrame): void;
    start(): void;
    hasFrameDimensionsChanged(): boolean;
    private convertImageFormatToNative;
    private startAsync;
    resetTime(): void;
    private isNewFrameReady;
    private extractFrameData;
    private setupCanvasContext;
    private logFrame;
    private log;
}
