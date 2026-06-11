import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeactivateLicenseDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  activationToken: string;

  @IsString()
  @MinLength(16)
  @MaxLength(256)
  machineFingerprint: string;
}
