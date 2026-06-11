import { IsEmail, IsIn, IsInt, IsISO8601, IsObject, IsOptional, Max, MaxLength, Min } from 'class-validator';

export class CreateLicenseDto {
  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsIn(['solo', 'team', 'business', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  seats?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxDevices?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  @MaxLength(64)
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
