import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto, WebhookResponseDto } from './dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateWebhookDto,
  ): Promise<ApiResponseDto<WebhookResponseDto>> {
    const webhook = await this.webhooksService.create(user.id, dto);
    return ApiResponseDto.success(webhook, 'Webhook created');
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  @ApiResponse({ status: 200, description: 'Webhooks list' })
  async findAll(@CurrentUser() user: CurrentUserPayload): Promise<ApiResponseDto<WebhookResponseDto[]>> {
    const webhooks = await this.webhooksService.findByUserId(user.id);
    return ApiResponseDto.success(webhooks);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook found' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<WebhookResponseDto>> {
    const webhook = await this.webhooksService.findById(id, user.id);
    return ApiResponseDto.success(webhook);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<ApiResponseDto<WebhookResponseDto>> {
    const webhook = await this.webhooksService.update(id, user.id, dto);
    return ApiResponseDto.success(webhook, 'Webhook updated');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.webhooksService.delete(id, user.id);
    return ApiResponseDto.message('Webhook deleted');
  }

  @Post(':id/regenerate-secret')
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  @ApiResponse({ status: 200, description: 'Secret regenerated' })
  async regenerateSecret(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ secret: string }>> {
    const result = await this.webhooksService.regenerateSecret(id, user.id);
    return ApiResponseDto.success(result, 'Secret regenerated');
  }
}
