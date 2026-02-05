import { FrameData, Size } from '../common/types';
import { VideoStreamProvider } from './video-stream-provider';
export interface HandleFrame {
    (image: FrameData): void;
}
export interface FrameExtractor {
    start(): void;
    setFrameHandler(handleFrame: HandleFrame): void;
    resetTime(): void;
}
export interface HealthMonitorCamera {
    open(): Promise<void>;
    close(): void;
    setFrameHandler(handleFrame: HandleFrame): void;
    resetTime(): void;
}
export interface HealthMonitorCameraOptions {
    videoElement: HTMLVideoElement;
    cameraDeviceId: string;
    frameDimensions: Size;
    mediaStreamProvider: VideoStreamProvider;
    frameExtractor: FrameExtractor;
}
export interface MediaStreamProvider {
    getStream(imageDimensions: Size, deviceId: string): Promise<MediaStream>;
}
