import { HealthMonitorCamera, HealthMonitorCameraOptions } from './camera.types';
export declare class HealthMonitorCameraFactory {
    static create({ videoElement, cameraDeviceId, frameDimensions, }: Partial<HealthMonitorCameraOptions>): HealthMonitorCamera;
}
