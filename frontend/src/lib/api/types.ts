export type LicensePlan = 'solo' | 'team' | 'business' | 'enterprise';
export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'cancelled';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LicenseEntitlement {
  licenseId: string;
  activationId?: string;
  customerEmail: string;
  plan: LicensePlan | string;
  status: LicenseStatus | string;
  seats: number;
  maxDevices: number;
  expiresAt: string | null;
  features: string[];
  offlineGraceEndsAt: string;
}

export interface CreatedLicense {
  id: string;
  customerEmail: string;
  licenseKey: string;
  licensePrefix: string;
  plan: LicensePlan | string;
  status: LicenseStatus | string;
  seats: number;
  maxDevices: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface LicenseSummary {
  id: string;
  customerEmail: string;
  licensePrefix: string;
  plan: LicensePlan | string;
  status: LicenseStatus | string;
  seats: number;
  maxDevices: number;
  activeDevices: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLicenseRequest {
  customerEmail: string;
  plan?: LicensePlan;
  seats?: number;
  maxDevices?: number;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivateLicenseRequest {
  email?: string;
  licenseKey: string;
  machineFingerprint: string;
  installId: string;
  deviceName?: string;
  appVersion?: string;
}

export interface ActivationResponse {
  activationToken: string;
  entitlement: LicenseEntitlement;
}

export interface HeartbeatLicenseRequest {
  activationToken: string;
  machineFingerprint: string;
  appVersion?: string;
}
