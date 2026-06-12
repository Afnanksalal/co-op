import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { ActivateLicenseDto, ActivationResponseDto, CreateLicenseDto, CreatedLicenseDto, DeactivateLicenseDto, HeartbeatLicenseDto, LicenseEntitlementDto, LicenseSummaryDto } from './dto';
import { canonicalLicenseKey, generateActivationToken, generateLicenseKey, hashSecret, isValidLicenseKey, licensePrefix, timingSafeEqualString } from './license-crypto';

const DEFAULT_LICENSE_PEPPER = 'co-op-development-license-pepper';

@Injectable()
export class LicensesService {
  private readonly pepper: string;
  private readonly offlineGraceDays: number;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {
    this.pepper = this.configService.get<string>('LICENSE_KEY_PEPPER') ?? DEFAULT_LICENSE_PEPPER;
    this.offlineGraceDays = this.configService.get<number>('LICENSE_OFFLINE_GRACE_DAYS', 14);
  }

  async createLicense(dto: CreateLicenseDto): Promise<CreatedLicenseDto> {
    const licenseKey = generateLicenseKey();
    const now = new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('expiresAt must be a valid ISO timestamp');
    }

    const [license] = await this.db
      .insert(schema.licenses)
      .values({
        customerEmail: dto.customerEmail.toLowerCase(),
        licenseHash: this.hashLicenseKey(licenseKey),
        licensePrefix: licensePrefix(licenseKey),
        plan: dto.plan ?? 'team',
        status: 'active',
        seats: dto.seats ?? 1,
        maxDevices: dto.maxDevices ?? 2,
        expiresAt,
        metadata: dto.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.recordEvent(license.id, null, 'license.created', {
      plan: license.plan,
      seats: license.seats,
      maxDevices: license.maxDevices,
    });

    return {
      id: license.id,
      customerEmail: license.customerEmail,
      licenseKey,
      licensePrefix: license.licensePrefix,
      plan: license.plan,
      status: license.status,
      seats: license.seats,
      maxDevices: license.maxDevices,
      expiresAt: license.expiresAt,
      createdAt: license.createdAt,
    };
  }

  async listLicenses(): Promise<LicenseSummaryDto[]> {
    const rows = await this.db.select().from(schema.licenses).orderBy(desc(schema.licenses.createdAt)).limit(250);

    return this.toSummaries(rows);
  }

  async listLicensesForCustomer(email: string): Promise<LicenseSummaryDto[]> {
    const rows = await this.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.customerEmail, email.toLowerCase()))
      .orderBy(desc(schema.licenses.createdAt))
      .limit(25);

    return this.toSummaries(rows);
  }

  async createSelfServiceLicense(email: string): Promise<CreatedLicenseDto> {
    const customerEmail = email.toLowerCase();
    const now = new Date();

    return this.db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`self-service:${customerEmail}`}))`);

      const existingRows = await tx
        .select()
        .from(schema.licenses)
        .where(and(eq(schema.licenses.customerEmail, customerEmail), eq(schema.licenses.status, 'active')))
        .orderBy(desc(schema.licenses.createdAt))
        .limit(1);

      const existingActiveLicense = existingRows.find(license => !license.expiresAt || license.expiresAt.getTime() > now.getTime());
      if (existingActiveLicense) {
        throw new BadRequestException('An active license already exists for this account');
      }

      const licenseKey = generateLicenseKey();
      const [license] = await tx
        .insert(schema.licenses)
        .values({
          customerEmail,
          licenseHash: this.hashLicenseKey(licenseKey),
          licensePrefix: licensePrefix(licenseKey),
          plan: 'solo',
          status: 'active',
          seats: 1,
          maxDevices: 2,
          expiresAt: null,
          metadata: { source: 'self_service_account_center' },
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await tx.insert(schema.licenseEvents).values({
        licenseId: license.id,
        activationId: null,
        eventType: 'license.self_service_created',
        metadata: {
          plan: license.plan,
          seats: license.seats,
          maxDevices: license.maxDevices,
        },
      });

      return {
        id: license.id,
        customerEmail: license.customerEmail,
        licenseKey,
        licensePrefix: license.licensePrefix,
        plan: license.plan,
        status: license.status,
        seats: license.seats,
        maxDevices: license.maxDevices,
        expiresAt: license.expiresAt,
        createdAt: license.createdAt,
      };
    });
  }

  async revokeLicenseForCustomer(email: string, licenseId: string): Promise<void> {
    const customerEmail = email.toLowerCase();
    const now = new Date();

    await this.db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`revoke:${licenseId}`}))`);

      const rows = await tx
        .select()
        .from(schema.licenses)
        .where(and(eq(schema.licenses.id, licenseId), eq(schema.licenses.customerEmail, customerEmail)))
        .limit(1);
      const license = rows[0];

      if (!license) {
        throw new NotFoundException('License not found for this account');
      }

      if (license.status !== 'cancelled') {
        await tx
          .update(schema.licenses)
          .set({
            status: 'cancelled',
            updatedAt: now,
            metadata: {
              ...(license.metadata && typeof license.metadata === 'object' ? license.metadata : {}),
              revokedBy: 'account_center',
              revokedAt: now.toISOString(),
            },
          })
          .where(eq(schema.licenses.id, license.id));
      }

      await tx
        .update(schema.licenseActivations)
        .set({
          status: 'deactivated',
          deactivatedAt: now,
        })
        .where(and(eq(schema.licenseActivations.licenseId, license.id), eq(schema.licenseActivations.status, 'active')));

      await tx.insert(schema.licenseEvents).values({
        licenseId: license.id,
        activationId: null,
        eventType: 'license.customer_revoked',
        metadata: {
          source: 'account_center',
        },
      });
    });
  }

  private async toSummaries(rows: schema.License[]): Promise<LicenseSummaryDto[]> {
    const summaries: LicenseSummaryDto[] = [];
    for (const license of rows) {
      const activeDevices = await this.countActiveDevices(license.id);
      summaries.push({
        id: license.id,
        customerEmail: license.customerEmail,
        licensePrefix: license.licensePrefix,
        plan: license.plan,
        status: license.status,
        seats: license.seats,
        maxDevices: license.maxDevices,
        activeDevices,
        expiresAt: license.expiresAt,
        createdAt: license.createdAt,
        updatedAt: license.updatedAt,
      });
    }

    return summaries;
  }

  async activate(dto: ActivateLicenseDto): Promise<ActivationResponseDto> {
    if (!isValidLicenseKey(dto.licenseKey)) {
      throw new UnauthorizedException('Invalid license key');
    }

    const license = await this.findByLicenseKey(dto.licenseKey);
    this.assertLicenseUsable(license, dto.email);

    const machineHash = this.hash(dto.machineFingerprint);
    const now = new Date();
    const activationToken = generateActivationToken();
    const activationTokenHash = this.hash(activationToken);

    const { activation, activeLicense } = await this.db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${license.id}))`);

      const lockedLicenseRows = await tx
        .select()
        .from(schema.licenses)
        .where(eq(schema.licenses.id, license.id))
        .limit(1);
      const lockedLicense = lockedLicenseRows[0];
      if (!lockedLicense) {
        throw new UnauthorizedException('Invalid license key');
      }
      this.assertLicenseUsable(lockedLicense, dto.email);

      const existingRows = await tx
        .select()
        .from(schema.licenseActivations)
        .where(and(
          eq(schema.licenseActivations.licenseId, lockedLicense.id),
          eq(schema.licenseActivations.machineFingerprintHash, machineHash),
          eq(schema.licenseActivations.status, 'active'),
        ))
        .limit(1);
      const existing = existingRows[0];

      if (existing) {
        const [reactivated] = await tx
          .update(schema.licenseActivations)
          .set({
            activationTokenHash,
            appVersion: dto.appVersion ?? existing.appVersion,
            deviceName: dto.deviceName ?? existing.deviceName,
            lastSeenAt: now,
          })
          .where(eq(schema.licenseActivations.id, existing.id))
          .returning();

        await tx.insert(schema.licenseEvents).values({
          licenseId: lockedLicense.id,
          activationId: reactivated.id,
          eventType: 'license.reactivated',
          metadata: {
            installId: dto.installId,
            appVersion: dto.appVersion,
          },
        });

        return { activation: reactivated, activeLicense: lockedLicense };
      }

      const activeDeviceRows = await tx
        .select({ value: count() })
        .from(schema.licenseActivations)
        .where(and(eq(schema.licenseActivations.licenseId, lockedLicense.id), eq(schema.licenseActivations.status, 'active')));

      if (Number(activeDeviceRows[0]?.value ?? 0) >= lockedLicense.maxDevices) {
        throw new ForbiddenException('License device limit reached');
      }

      const [created] = await tx
        .insert(schema.licenseActivations)
        .values({
          licenseId: lockedLicense.id,
          installId: dto.installId,
          machineFingerprintHash: machineHash,
          activationTokenHash,
          deviceName: dto.deviceName ?? null,
          appVersion: dto.appVersion ?? null,
          status: 'active',
          metadata: {},
          activatedAt: now,
          lastSeenAt: now,
        })
        .returning();

      await tx.insert(schema.licenseEvents).values({
        licenseId: lockedLicense.id,
        activationId: created.id,
        eventType: 'license.activated',
        metadata: {
          installId: dto.installId,
          appVersion: dto.appVersion,
        },
      });

      return { activation: created, activeLicense: lockedLicense };
    });

    return {
      activationToken,
      entitlement: this.toEntitlement(activeLicense, activation),
    };
  }

  async heartbeat(dto: HeartbeatLicenseDto): Promise<LicenseEntitlementDto> {
    const { license, activation } = await this.findActiveActivation(dto.activationToken, dto.machineFingerprint);
    this.assertLicenseUsable(license);

    const [updatedActivation] = await this.db
      .update(schema.licenseActivations)
      .set({
        appVersion: dto.appVersion ?? activation.appVersion,
        lastSeenAt: new Date(),
      })
      .where(eq(schema.licenseActivations.id, activation.id))
      .returning();

    await this.recordEvent(license.id, activation.id, 'license.heartbeat', {
      appVersion: dto.appVersion,
    });

    return this.toEntitlement(license, updatedActivation);
  }

  async deactivate(dto: DeactivateLicenseDto): Promise<void> {
    const { license, activation } = await this.findActiveActivation(dto.activationToken, dto.machineFingerprint);

    await this.db
      .update(schema.licenseActivations)
      .set({
        status: 'deactivated',
        deactivatedAt: new Date(),
      })
      .where(eq(schema.licenseActivations.id, activation.id));

    await this.recordEvent(license.id, activation.id, 'license.deactivated', {});
  }

  private async findByLicenseKey(licenseKey: string): Promise<schema.License> {
    const rows = await this.db
      .select()
      .from(schema.licenses)
      .where(eq(schema.licenses.licenseHash, this.hashLicenseKey(licenseKey)))
      .limit(1);

    const license = rows[0];
    if (!license) {
      throw new UnauthorizedException('Invalid license key');
    }

    return license;
  }

  private async findActiveActivation(
    activationToken: string,
    machineFingerprint: string,
  ): Promise<{ license: schema.License; activation: schema.LicenseActivation }> {
    const tokenHash = this.hash(activationToken);
    const rows = await this.db
      .select({
        activation: schema.licenseActivations,
        license: schema.licenses,
      })
      .from(schema.licenseActivations)
      .innerJoin(schema.licenses, eq(schema.licenseActivations.licenseId, schema.licenses.id))
      .where(and(eq(schema.licenseActivations.activationTokenHash, tokenHash), eq(schema.licenseActivations.status, 'active')))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new UnauthorizedException('Invalid activation token');
    }

    const machineHash = this.hash(machineFingerprint);
    if (!timingSafeEqualString(row.activation.machineFingerprintHash, machineHash)) {
      throw new UnauthorizedException('Activation is not valid for this device');
    }

    return row;
  }

  private async countActiveDevices(licenseId: string): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(schema.licenseActivations)
      .where(and(eq(schema.licenseActivations.licenseId, licenseId), eq(schema.licenseActivations.status, 'active')));

    return Number(rows[0]?.value ?? 0);
  }

  private assertLicenseUsable(license: schema.License, email?: string): void {
    if (license.status !== 'active') {
      throw new ForbiddenException('License is not active');
    }

    if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('License is expired');
    }

    if (email && license.customerEmail.toLowerCase() !== email.toLowerCase()) {
      throw new UnauthorizedException('License does not belong to this account');
    }
  }

  private toEntitlement(license: schema.License, activation?: schema.LicenseActivation): LicenseEntitlementDto {
    return {
      licenseId: license.id,
      activationId: activation?.id,
      customerEmail: license.customerEmail,
      plan: license.plan,
      status: license.status,
      seats: license.seats,
      maxDevices: license.maxDevices,
      expiresAt: license.expiresAt,
      features: this.featuresForPlan(license.plan),
      offlineGraceEndsAt: this.daysFromNow(this.offlineGraceDays),
    };
  }

  private featuresForPlan(plan: string): string[] {
    const common = ['local_data', 'license_heartbeat', 'ollama', 'openai_compatible_byok', 'audit_log'];
    if (plan === 'solo') return [...common, 'single_workspace'];
    if (plan === 'enterprise') return [...common, 'team_workspaces', 'policy_router', 'council_review', 'sso_ready'];
    if (plan === 'business') return [...common, 'team_workspaces', 'policy_router', 'council_review'];
    return [...common, 'team_workspaces', 'council_review'];
  }

  private daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private hash(value: string): string {
    return hashSecret(value, this.pepper);
  }

  private hashLicenseKey(value: string): string {
    return this.hash(canonicalLicenseKey(value));
  }

  private async recordEvent(
    licenseId: string | null,
    activationId: string | null,
    eventType: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(schema.licenseEvents).values({
      licenseId,
      activationId,
      eventType,
      metadata,
    });
  }
}
