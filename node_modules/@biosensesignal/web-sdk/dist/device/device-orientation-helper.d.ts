import { OrientationHelper, DeviceOrientation } from './types';
export declare class DefaultOrientationHelper implements OrientationHelper {
    private validOrientation;
    private resetValid;
    private isValid;
    constructor();
    resetValidOrientation(): void;
    isOrientationValid(): boolean;
}
export declare class ConstantOrientationHelper implements OrientationHelper {
    private validOrientations;
    private resetValid;
    private isValid;
    constructor(deviceOrientation: DeviceOrientation);
    resetValidOrientation(): void;
    isOrientationValid(): boolean;
}
