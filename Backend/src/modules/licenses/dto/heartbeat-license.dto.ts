import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class HeartbeatLicenseDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  activationToken: string;

  @IsString()
  @MinLength(16)
  @MaxLength(256)
  machineFingerprint: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;
}
