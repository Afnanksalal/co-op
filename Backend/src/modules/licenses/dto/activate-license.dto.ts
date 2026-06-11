import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ActivateLicenseDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(20)
  @MaxLength(64)
  licenseKey: string;

  @IsString()
  @MinLength(16)
  @MaxLength(256)
  machineFingerprint: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  installId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;
}
