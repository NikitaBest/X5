import { LicenseOptions } from './license.types';
import { LicenseManager } from './license-manager';
export declare class LicenseManagerProvider {
    private static instance;
    static createLicenseManager(licenseOptions: LicenseOptions): Promise<void>;
    static get(): LicenseManager;
}
