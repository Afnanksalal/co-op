export interface LicenseEntitlementDto {
  licenseId: string;
  activationId?: string;
  customerEmail: string;
  plan: string;
  status: string;
  seats: number;
  maxDevices: number;
  expiresAt: Date | null;
  features: string[];
  offlineGraceEndsAt: Date;
}

export interface CreatedLicenseDto {
  id: string;
  customerEmail: string;
  licenseKey: string;
  licensePrefix: string;
  plan: string;
  status: string;
  seats: number;
  maxDevices: number;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface LicenseSummaryDto {
  id: string;
  customerEmail: string;
  licensePrefix: string;
  plan: string;
  status: string;
  seats: number;
  maxDevices: number;
  activeDevices: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivationResponseDto {
  activationToken: string;
  entitlement: LicenseEntitlementDto;
}
