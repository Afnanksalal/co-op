import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import {
  AdminUserResponseDto,
  AdminUserListQueryDto,
  CreateUserDto,
  UpdateUserDto,
  ResetUsageDto,
  BulkActionDto,
  BulkSuspendDto,
  UserStatsDto,
} from './dto/admin-user.dto';
import { AdminGuard } from '@/common/guards/admin.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  // ============================================
  // LIST & STATS
  // ============================================

  @Get()
  @RateLimit({ limit: 100, ttl: 60, keyPrefix: 'admin:users:list' })
  @ApiOperation({ summary: 'List all users with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Users list' })
  async listUsers(
    @Query() query: AdminUserListQueryDto,
  ): Promise<ApiResponseDto<PaginatedResult<AdminUserResponseDto>>> {
    const result = await this.adminUsersService.listUsers(query);
    return ApiResponseDto.success(result);
  }

  @Get('stats')
  @RateLimit({ limit: 60, ttl: 60, keyPrefix: 'admin:users:stats' })
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getStats(): Promise<ApiResponseDto<UserStatsDto>> {
    const stats = await this.adminUsersService.getStats();
    return ApiResponseDto.success(stats);
  }

  // ============================================
  // SINGLE USER OPERATIONS
  // ============================================

  @Get(':id')
  @RateLimit({ limit: 100, ttl: 60, keyPrefix: 'admin:users:get' })
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<AdminUserResponseDto>> {
    const user = await this.adminUsersService.getUser(id);
    return ApiResponseDto.success(user);
  }

  @Post()
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'admin:users:create' })
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<AdminUserResponseDto>> {
    const user = await this.adminUsersService.createUser(dto, admin.id);
    return ApiResponseDto.success(user, 'User created successfully');
  }

  @Patch(':id')
  @RateLimit({ limit: 60, ttl: 60, keyPrefix: 'admin:users:update' })
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<AdminUserResponseDto>> {
    const user = await this.adminUsersService.updateUser(id, dto, admin.id);
    return ApiResponseDto.success(user, 'User updated successfully');
  }

  @Delete(':id')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'admin:users:delete' })
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.adminUsersService.deleteUser(id, admin.id);
    return ApiResponseDto.message('User deleted successfully');
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  @Post(':id/suspend')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'admin:users:suspend' })
  @ApiOperation({ summary: 'Suspend user' })
  @ApiResponse({ status: 200, description: 'User suspended' })
  async suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<AdminUserResponseDto>> {
    const user = await this.adminUsersService.suspendUser(id, body.reason, admin.id);
    return ApiResponseDto.success(user, 'User suspended');
  }

  @Post(':id/activate')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'admin:users:activate' })
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated' })
  async activateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<AdminUserResponseDto>> {
    const user = await this.adminUsersService.activateUser(id, admin.id);
    return ApiResponseDto.success(user, 'User activated');
  }

  // ============================================
  // USAGE MANAGEMENT
  // ============================================

  @Post(':id/reset-usage')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'admin:users:reset' })
  @ApiOperation({ summary: 'Reset user pilot usage (agent requests)' })
  @ApiResponse({ status: 200, description: 'Usage reset' })
  async resetUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetUsageDto,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<AdminUserResponseDto>> {
    const user = await this.adminUsersService.resetUsage(id, dto, admin.id);
    return ApiResponseDto.success(user, 'Usage reset successfully');
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  @Post('bulk/suspend')
  @RateLimit({ limit: 10, ttl: 60, keyPrefix: 'admin:users:bulk:suspend' })
  @ApiOperation({ summary: 'Bulk suspend users' })
  @ApiResponse({ status: 200, description: 'Users suspended' })
  async bulkSuspend(
    @Body() dto: BulkSuspendDto,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<{ suspended: number }>> {
    const result = await this.adminUsersService.bulkSuspend(dto.userIds, dto.reason, admin.id);
    return ApiResponseDto.success(result, `${result.suspended} users suspended`);
  }

  @Post('bulk/activate')
  @RateLimit({ limit: 10, ttl: 60, keyPrefix: 'admin:users:bulk:activate' })
  @ApiOperation({ summary: 'Bulk activate users' })
  @ApiResponse({ status: 200, description: 'Users activated' })
  async bulkActivate(
    @Body() dto: BulkActionDto,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<{ activated: number }>> {
    const result = await this.adminUsersService.bulkActivate(dto.userIds, admin.id);
    return ApiResponseDto.success(result, `${result.activated} users activated`);
  }

  @Post('bulk/delete')
  @RateLimit({ limit: 5, ttl: 60, keyPrefix: 'admin:users:bulk:delete' })
  @ApiOperation({ summary: 'Bulk delete users' })
  @ApiResponse({ status: 200, description: 'Users deleted' })
  async bulkDelete(
    @Body() dto: BulkActionDto,
    @CurrentUser() admin: CurrentUserPayload,
  ): Promise<ApiResponseDto<{ deleted: number }>> {
    const result = await this.adminUsersService.bulkDelete(dto.userIds, admin.id);
    return ApiResponseDto.success(result, `${result.deleted} users deleted`);
  }
}
