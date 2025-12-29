import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, ilike, or, desc, asc, sql, count } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { CacheService, CACHE_PREFIX } from '@/common/cache/cache.service';
import { AuditService } from '@/common/audit/audit.service';
import { RedisService } from '@/common/redis/redis.service';
import * as schema from '@/database/schema';
import { PILOT_LIMITS } from '@/database/schema/user-settings.schema';
import {
  AdminUserResponseDto,
  AdminUserListQueryDto,
  CreateUserDto,
  UpdateUserDto,
  ResetUsageDto,
  UserStatsDto,
  PilotUsageDto,
} from './dto/admin-user.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get current month key for usage tracking (matches agents.service.ts format)
   */
  private getUsageKey(userId: string): string {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `usage:${userId}:${month}`;
  }

  /**
   * Get pilot usage stats for a user from Redis and database
   */
  private async getPilotUsage(userId: string): Promise<PilotUsageDto> {
    const now = new Date();
    const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get agent requests usage from Redis (same key format as agents.service.ts)
    const usageKey = this.getUsageKey(userId);
    const agentRequestsUsed = await this.redis.get<number>(usageKey) ?? 0;

    // Get API keys count from Redis (stored as hash)
    const apiKeysHash = await this.redis.hgetall<Record<string, unknown>>(`user:apikeys:${userId}`);
    const apiKeysUsed = apiKeysHash ? Object.keys(apiKeysHash).length : 0;

    // Get counts from database for other limits
    const [webhooksCount] = await this.db
      .select({ count: count() })
      .from(schema.webhooks)
      .where(eq(schema.webhooks.userId, userId));

    const [leadsCount] = await this.db
      .select({ count: count() })
      .from(schema.leads)
      .where(eq(schema.leads.userId, userId));

    const [campaignsCount] = await this.db
      .select({ count: count() })
      .from(schema.campaigns)
      .where(eq(schema.campaigns.userId, userId));

    return {
      agentRequestsUsed,
      agentRequestsLimit: PILOT_LIMITS.agentRequests.limit,
      apiKeysUsed,
      webhooksUsed: Number(webhooksCount?.count ?? 0),
      leadsUsed: Number(leadsCount?.count ?? 0),
      campaignsUsed: Number(campaignsCount?.count ?? 0),
      resetsAt: resetsAt.toISOString(),
    };
  }

  /**
   * Escape ILIKE special characters to prevent SQL pattern injection
   */
  private escapeIlikePattern(input: string): string {
    return input
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape percent signs
      .replace(/_/g, '\\_');   // Escape underscores
  }

  /**
   * List all users with filtering, pagination, and sorting
   */
  async listUsers(query: AdminUserListQueryDto): Promise<PaginatedResult<AdminUserResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [isNull(schema.users.deletedAt)];

    if (query.search) {
      const escapedSearch = this.escapeIlikePattern(query.search);
      conditions.push(
        or(
          ilike(schema.users.email, `%${escapedSearch}%`),
          ilike(schema.users.name, `%${escapedSearch}%`),
        )!,
      );
    }

    if (query.role) {
      conditions.push(eq(schema.users.role, query.role));
    }

    if (query.onboardingCompleted !== undefined) {
      conditions.push(eq(schema.users.onboardingCompleted, query.onboardingCompleted));
    }

    // Add status filter condition
    // Users without settings are considered 'active'
    if (query.status && query.status !== 'all') {
      if (query.status === 'active') {
        conditions.push(
          or(
            isNull(schema.userSettings.status),
            eq(schema.userSettings.status, 'active'),
          )!,
        );
      } else {
        conditions.push(eq(schema.userSettings.status, 'suspended'));
      }
    }

    // Get users with settings
    const orderColumn = query.sortBy === 'name' ? schema.users.name
      : query.sortBy === 'email' ? schema.users.email
      : schema.users.createdAt;
    const orderFn = query.sortOrder === 'asc' ? asc : desc;

    const users = await this.db
      .select()
      .from(schema.users)
      .leftJoin(schema.userSettings, eq(schema.users.id, schema.userSettings.userId))
      .leftJoin(schema.startups, eq(schema.users.startupId, schema.startups.id))
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset);

    // Get total count with same filters
    const countResult = await this.db
      .select({ count: count() })
      .from(schema.users)
      .leftJoin(schema.userSettings, eq(schema.users.id, schema.userSettings.userId))
      .where(and(...conditions));
    const total = countResult[0]?.count ?? 0;

    // Build response with pilot usage for each user
    const data = await Promise.all(
      users.map(row => this.toAdminUserResponse(row.users, row.user_settings, row.startups))
    );

    return {
      data,
      meta: {
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  /**
   * Get single user details
   */
  async getUser(userId: string): Promise<AdminUserResponseDto> {
    const result = await this.db
      .select()
      .from(schema.users)
      .leftJoin(schema.userSettings, eq(schema.users.id, schema.userSettings.userId))
      .leftJoin(schema.startups, eq(schema.users.startupId, schema.startups.id))
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('User not found');
    }

    return this.toAdminUserResponse(result[0].users, result[0].user_settings, result[0].startups);
  }

  /**
   * Create a new user (admin action)
   */
  async createUser(dto: CreateUserDto, adminId: string): Promise<AdminUserResponseDto> {
    // Check for existing user (including soft-deleted to prevent email reuse issues)
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].deletedAt) {
        throw new ConflictException('Email was previously registered. Contact support to restore the account.');
      }
      throw new ConflictException('Email already registered');
    }

    // Create user
    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: dto.email.toLowerCase(),
        name: dto.name,
        role: dto.role ?? 'user',
      })
      .returning();

    // Create user settings
    const [settings] = await this.db
      .insert(schema.userSettings)
      .values({
        userId: user.id,
        status: 'active',
      })
      .returning();

    // Audit log
    await this.audit.log({
      userId: adminId,
      action: 'admin.user.created',
      resource: 'user',
      resourceId: user.id,
      oldValue: null,
      newValue: { email: user.email, name: user.name, role: user.role },
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });

    this.logger.log(`Admin ${adminId} created user ${user.id}`);
    return this.toAdminUserResponse(user, settings, null);
  }

  /**
   * Update user details
   */
  async updateUser(userId: string, dto: UpdateUserDto, adminId: string): Promise<AdminUserResponseDto> {
    const existing = await this.getUser(userId);

    // Prevent admin from changing their own role (security measure)
    if (userId === adminId && dto.role && dto.role !== existing.role) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const updateData: Partial<schema.NewUser> = { updatedAt: new Date() };
    if (dto.name) updateData.name = dto.name;
    if (dto.role) updateData.role = dto.role;

    await this.db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, userId));

    // Handle status change
    if (dto.status && dto.status !== existing.status) {
      // Prevent self-suspension via update
      if (userId === adminId && dto.status === 'suspended') {
        throw new ForbiddenException('Cannot suspend your own account');
      }
      await this.updateUserStatus(userId, dto.status, adminId);
    }

    // Handle admin notes
    if (dto.adminNotes !== undefined) {
      await this.ensureUserSettings(userId);
      await this.db
        .update(schema.userSettings)
        .set({ adminNotes: dto.adminNotes, updatedAt: new Date() })
        .where(eq(schema.userSettings.userId, userId));
    }

    // Invalidate cache
    await this.cache.invalidate(`${CACHE_PREFIX.USER}${userId}`);

    // Audit log
    await this.audit.log({
      userId: adminId,
      action: 'admin.user.updated',
      resource: 'user',
      resourceId: userId,
      oldValue: { name: existing.name, role: existing.role, status: existing.status },
      newValue: { name: dto.name ?? existing.name, role: dto.role ?? existing.role, status: dto.status ?? existing.status },
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });

    return this.getUser(userId);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, adminId: string): Promise<void> {
    // Prevent admin from deleting themselves
    if (userId === adminId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const user = await this.getUser(userId);

    await this.db
      .update(schema.users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    // Invalidate cache
    await this.cache.invalidate(`${CACHE_PREFIX.USER}${userId}`);

    // Audit log
    await this.audit.log({
      userId: adminId,
      action: 'admin.user.deleted',
      resource: 'user',
      resourceId: userId,
      oldValue: { email: user.email, name: user.name },
      newValue: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });

    this.logger.log(`Admin ${adminId} deleted user ${userId}`);
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string, reason: string | undefined, adminId: string): Promise<AdminUserResponseDto> {
    // Prevent admin from suspending themselves
    if (userId === adminId) {
      throw new ForbiddenException('Cannot suspend your own account');
    }

    await this.updateUserStatus(userId, 'suspended', adminId, reason);
    return this.getUser(userId);
  }

  /**
   * Activate user
   */
  async activateUser(userId: string, adminId: string): Promise<AdminUserResponseDto> {
    await this.updateUserStatus(userId, 'active', adminId);
    return this.getUser(userId);
  }

  /**
   * Reset user's pilot usage (agent requests stored in Redis)
   */
  async resetUsage(userId: string, dto: ResetUsageDto, adminId: string): Promise<AdminUserResponseDto> {
    const user = await this.getUser(userId);
    const resetType = dto.type ?? 'agentRequests';

    if (resetType === 'agentRequests' || resetType === 'all') {
      // Delete the Redis key for agent usage (same format as agents.service.ts)
      const usageKey = this.getUsageKey(userId);
      await this.redis.del(usageKey);
      this.logger.log(`Reset agent usage for user ${userId} (key: ${usageKey})`);
    }

    // Audit log
    await this.audit.log({
      userId: adminId,
      action: 'admin.user.usage.reset',
      resource: 'user',
      resourceId: userId,
      oldValue: { agentRequestsUsed: user.pilotUsage.agentRequestsUsed },
      newValue: { agentRequestsUsed: 0, resetType },
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });

    this.logger.log(`Admin ${adminId} reset ${resetType} usage for user ${userId}`);
    return this.getUser(userId);
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspend(userIds: string[], reason: string | undefined, adminId: string): Promise<{ suspended: number }> {
    // Filter out admin's own ID to prevent self-suspension
    const filteredIds = userIds.filter(id => id !== adminId);
    
    let suspended = 0;
    for (const userId of filteredIds) {
      try {
        await this.updateUserStatus(userId, 'suspended', adminId, reason);
        suspended++;
      } catch (error) {
        this.logger.warn(`Failed to suspend user ${userId}:`, error);
      }
    }

    this.logger.log(`Admin ${adminId} bulk suspended ${suspended} users`);
    return { suspended };
  }

  /**
   * Bulk activate users
   */
  async bulkActivate(userIds: string[], adminId: string): Promise<{ activated: number }> {
    let activated = 0;
    for (const userId of userIds) {
      try {
        await this.updateUserStatus(userId, 'active', adminId);
        activated++;
      } catch (error) {
        this.logger.warn(`Failed to activate user ${userId}:`, error);
      }
    }

    this.logger.log(`Admin ${adminId} bulk activated ${activated} users`);
    return { activated };
  }

  /**
   * Bulk delete users
   */
  async bulkDelete(userIds: string[], adminId: string): Promise<{ deleted: number }> {
    // Filter out admin's own ID to prevent self-deletion
    const filteredIds = userIds.filter(id => id !== adminId);
    
    let deleted = 0;
    for (const userId of filteredIds) {
      try {
        await this.deleteUserInternal(userId, adminId);
        deleted++;
      } catch (error) {
        this.logger.warn(`Failed to delete user ${userId}:`, error);
      }
    }

    this.logger.log(`Admin ${adminId} bulk deleted ${deleted} users`);
    return { deleted };
  }

  /**
   * Internal delete without self-check (for bulk operations where we already filtered)
   */
  private async deleteUserInternal(userId: string, adminId: string): Promise<void> {
    const user = await this.getUser(userId);

    await this.db
      .update(schema.users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    // Invalidate cache
    await this.cache.invalidate(`${CACHE_PREFIX.USER}${userId}`);

    // Audit log
    await this.audit.log({
      userId: adminId,
      action: 'admin.user.deleted',
      resource: 'user',
      resourceId: userId,
      oldValue: { email: user.email, name: user.name },
      newValue: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStatsDto> {
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(isNull(schema.users.deletedAt));

    const [adminResult] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(and(isNull(schema.users.deletedAt), eq(schema.users.role, 'admin')));

    const [onboardedResult] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(and(isNull(schema.users.deletedAt), eq(schema.users.onboardingCompleted, true)));

    const [suspendedResult] = await this.db
      .select({ count: count() })
      .from(schema.userSettings)
      .where(eq(schema.userSettings.status, 'suspended'));

    // Users created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [thisMonthResult] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(and(
        isNull(schema.users.deletedAt),
        sql`${schema.users.createdAt} >= ${startOfMonth}`,
      ));

    const total = Number(totalResult?.count ?? 0);
    const suspended = Number(suspendedResult?.count ?? 0);

    return {
      totalUsers: total,
      activeUsers: total - suspended,
      suspendedUsers: suspended,
      adminUsers: Number(adminResult?.count ?? 0),
      usersThisMonth: Number(thisMonthResult?.count ?? 0),
      onboardedUsers: Number(onboardedResult?.count ?? 0),
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async updateUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    adminId: string,
    reason?: string,
  ): Promise<void> {
    const updateData: Partial<schema.NewUserSettings> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'suspended') {
      updateData.suspendedAt = new Date();
      updateData.suspendedReason = reason ?? null;
    } else {
      updateData.suspendedAt = null;
      updateData.suspendedReason = null;
    }

    // Ensure settings exist
    await this.ensureUserSettings(userId);

    await this.db
      .update(schema.userSettings)
      .set(updateData)
      .where(eq(schema.userSettings.userId, userId));

    // Invalidate cache
    await this.cache.invalidate(`${CACHE_PREFIX.USER}${userId}`);

    // Audit log
    await this.audit.log({
      userId: adminId,
      action: status === 'suspended' ? 'admin.user.suspended' : 'admin.user.activated',
      resource: 'user',
      resourceId: userId,
      oldValue: null,
      newValue: { status, reason },
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });
  }

  private async ensureUserSettings(userId: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      await this.db.insert(schema.userSettings).values({
        userId,
        status: 'active',
      });
    }
  }

  private async toAdminUserResponse(
    user: schema.User,
    settings: schema.UserSettings | null,
    startup: schema.Startup | null,
  ): Promise<AdminUserResponseDto> {
    const pilotUsage = await this.getPilotUsage(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authProvider: user.authProvider,
      onboardingCompleted: user.onboardingCompleted,
      startupId: user.startupId,
      startupName: startup?.companyName ?? null,
      status: (settings?.status as 'active' | 'suspended') ?? 'active',
      suspendedReason: settings?.suspendedReason ?? null,
      adminNotes: settings?.adminNotes ?? null,
      pilotUsage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActiveAt: settings?.lastActiveAt ?? null,
    };
  }
}
