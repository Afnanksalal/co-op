import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyCreatedResponseDto } from './dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiResponseDto<ApiKeyCreatedResponseDto>> {
    const apiKey = await this.apiKeysService.create(user.id, dto);
    return ApiResponseDto.success(apiKey, 'API key created. Save the key now - it will not be shown again.');
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiResponse({ status: 200, description: 'API keys list' })
  async findAll(@CurrentUser() user: CurrentUserPayload): Promise<ApiResponseDto<ApiKeyResponseDto[]>> {
    const keys = await this.apiKeysService.findByUser(user.id);
    return ApiResponseDto.success(keys);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revoke(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.apiKeysService.revoke(user.id, id);
    return ApiResponseDto.message('API key revoked');
  }
}
