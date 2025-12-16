import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { AdminGuard } from '@/common/guards/admin.guard';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';
import { InvestorsService } from './investors.service';
import {
  CreateInvestorDto,
  UpdateInvestorDto,
  InvestorResponseDto,
  InvestorQueryDto,
} from './dto/investor.dto';

@ApiTags('Investors')
@Controller('investors')
export class InvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  // Public endpoints (read-only)
  @Get()
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get all active investors with optional filters' })
  async findAll(@Query() query: InvestorQueryDto): Promise<InvestorResponseDto[]> {
    return this.investorsService.findAll(query);
  }

  @Get('stats')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get investor statistics' })
  async getStats() {
    return this.investorsService.getStats();
  }

  // Admin endpoints - must come before :id route
  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get all investors (admin only)' })
  async findAllAdmin(): Promise<InvestorResponseDto[]> {
    return this.investorsService.findAllAdmin();
  }

  @Get(':id')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get a specific investor' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InvestorResponseDto> {
    return this.investorsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Create a new investor (admin only)' })
  async create(@Body() dto: CreateInvestorDto): Promise<InvestorResponseDto> {
    return this.investorsService.create(dto);
  }

  @Post('bulk')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Bulk create investors (admin only)' })
  async bulkCreate(@Body() dtos: CreateInvestorDto[]): Promise<{ created: number }> {
    return this.investorsService.bulkCreate(dtos);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Update an investor (admin only)' })
  @ApiParam({ name: 'id', type: 'string' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestorDto,
  ): Promise<InvestorResponseDto> {
    return this.investorsService.update(id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Partially update an investor (admin only)' })
  @ApiParam({ name: 'id', type: 'string' })
  async partialUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestorDto,
  ): Promise<InvestorResponseDto> {
    return this.investorsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AdminGuard)
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete an investor (admin only)' })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    await this.investorsService.delete(id);
    return { success: true };
  }
}
