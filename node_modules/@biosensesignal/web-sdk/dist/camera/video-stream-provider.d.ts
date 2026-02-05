import { Size } from '../common/types';
import { MediaStreamProvider } from './camera.types';
export declare class VideoStreamProvider implements MediaStreamProvider {
    getStream(frameDimensions: Size, deviceId: string): Promise<MediaStream>;
    private getCameraDeviceId;
    private validateCameraPermission;
    private getUserMediaConstraints;
}
