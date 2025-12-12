import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StartupsService } from './startups.service';
import { CreateStartupDto, UpdateStartupDto, StartupResponseDto } from './dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { AdminGuard } from '@/common/guards/admin.guard';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

@ApiTags('Startups')
@Controller('startups')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class StartupsController {
  constructor(private readonly startupsService: StartupsService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new startup (admin only)' })
  @ApiResponse({ status: 201, description: 'Startup created' })
  async create(@Body() dto: CreateStartupDto): Promise<ApiResponseDto<StartupResponseDto>> {
    const startup = await this.startupsService.create(dto);
    return ApiResponseDto.success(startup, 'Startup created');
  }

  @Get()
  @ApiOperation({ summary: 'Get all startups' })
  @ApiResponse({ status: 200, description: 'Startups list' })
  async findAll(): Promise<ApiResponseDto<StartupResponseDto[]>> {
    const startups = await this.startupsService.findAll();
    return ApiResponseDto.success(startups);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get startup by ID' })
  @ApiResponse({ status: 200, description: 'Startup found' })
  @ApiResponse({ status: 404, description: 'Startup not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<StartupResponseDto>> {
    const startup = await this.startupsService.findById(id);
    return ApiResponseDto.success(startup);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update startup (admin only)' })
  @ApiResponse({ status: 200, description: 'Startup updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStartupDto,
  ): Promise<ApiResponseDto<StartupResponseDto>> {
    const startup = await this.startupsService.update(id, dto);
    return ApiResponseDto.success(startup, 'Startup updated');
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete startup (admin only)' })
  @ApiResponse({ status: 200, description: 'Startup deleted' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<null>> {
    await this.startupsService.delete(id);
    return ApiResponseDto.message('Startup deleted');
  }
}
