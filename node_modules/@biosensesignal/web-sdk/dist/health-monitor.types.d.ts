import { FaceSessionOptions, HealthMonitorSession } from './session/session.types';
import { LicenseInfo } from './license/license.types';
export interface HealthMonitorManagerOptions {
    readonly licenseKey: string;
    readonly productId?: string;
    readonly licenseInfo?: LicenseInfo;
}
export interface HealthMonitorManagerType {
    reset(): void;
    getMaxSessions(): number;
    initialize(options: HealthMonitorManagerOptions): Promise<void>;
    createFaceSession(sessionOptions: FaceSessionOptions): Promise<HealthMonitorSession>;
}
