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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { UserThrottleGuard } from '@/common/guards/user-throttle.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';
import { CapTableService } from './cap-table.service';
import {
  CreateCapTableDto,
  UpdateCapTableDto,
  CreateShareholderDto,
  UpdateShareholderDto,
  CreateRoundDto,
  UpdateRoundDto,
  CreateScenarioDto,
  ExportCapTableDto,
  CapTableResponseDto,
  ShareholderResponseDto,
  RoundResponseDto,
  ScenarioResponseDto,
  CapTableSummaryDto,
} from './dto/cap-table.dto';

@ApiTags('Cap Table')
@Controller('cap-tables')
@UseGuards(AuthGuard, UserThrottleGuard)
@ApiBearerAuth()
export class CapTableController {
  constructor(private readonly capTableService: CapTableService) {}

  // ============================================
  // CAP TABLE CRUD
  // ============================================

  @Post()
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Create a new cap table' })
  @ApiResponse({ status: 201, type: CapTableResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('startupId') startupId: string | null,
    @Body() dto: CreateCapTableDto,
  ) {
    return this.capTableService.createCapTable(userId, startupId, dto);
  }

  @Get()
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'List all cap tables' })
  @ApiResponse({ status: 200, type: [CapTableResponseDto] })
  async findAll(@CurrentUser('id') userId: string) {
    return this.capTableService.findAllCapTables(userId);
  }

  @Get(':id')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get cap table by ID' })
  @ApiResponse({ status: 200, type: CapTableResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.capTableService.findCapTable(id, userId);
  }

  @Get(':id/summary')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get full cap table summary with shareholders and rounds' })
  @ApiResponse({ status: 200, type: CapTableSummaryDto })
  async getSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.capTableService.getCapTableSummary(id, userId);
  }

  @Patch(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Update cap table' })
  @ApiResponse({ status: 200, type: CapTableResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCapTableDto,
  ) {
    return this.capTableService.updateCapTable(id, userId, dto);
  }

  @Delete(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete cap table' })
  @ApiResponse({ status: 204 })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.capTableService.deleteCapTable(id, userId);
  }

  // ============================================
  // SHAREHOLDERS
  // ============================================

  @Post(':id/shareholders')
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Add a shareholder' })
  @ApiResponse({ status: 201, type: ShareholderResponseDto })
  async addShareholder(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateShareholderDto,
  ) {
    return this.capTableService.addShareholder(capTableId, userId, dto);
  }

  @Get(':id/shareholders')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'List shareholders' })
  @ApiResponse({ status: 200, type: [ShareholderResponseDto] })
  async getShareholders(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.capTableService.getShareholders(capTableId, userId);
  }

  @Patch(':id/shareholders/:shareholderId')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Update shareholder' })
  @ApiResponse({ status: 200, type: ShareholderResponseDto })
  async updateShareholder(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @Param('shareholderId', ParseUUIDPipe) shareholderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateShareholderDto,
  ) {
    return this.capTableService.updateShareholder(capTableId, shareholderId, userId, dto);
  }

  @Delete(':id/shareholders/:shareholderId')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Remove shareholder' })
  @ApiResponse({ status: 204 })
  async deleteShareholder(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @Param('shareholderId', ParseUUIDPipe) shareholderId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.capTableService.deleteShareholder(capTableId, shareholderId, userId);
  }

  // ============================================
  // FUNDING ROUNDS
  // ============================================

  @Post(':id/rounds')
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Add a funding round' })
  @ApiResponse({ status: 201, type: RoundResponseDto })
  async addRound(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRoundDto,
  ) {
    return this.capTableService.addRound(capTableId, userId, dto);
  }

  @Get(':id/rounds')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'List funding rounds' })
  @ApiResponse({ status: 200, type: [RoundResponseDto] })
  async getRounds(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.capTableService.getRounds(capTableId, userId);
  }

  @Patch(':id/rounds/:roundId')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Update funding round' })
  @ApiResponse({ status: 200, type: RoundResponseDto })
  async updateRound(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoundDto,
  ) {
    return this.capTableService.updateRound(capTableId, roundId, userId, dto);
  }

  @Delete(':id/rounds/:roundId')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete funding round' })
  @ApiResponse({ status: 204 })
  async deleteRound(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.capTableService.deleteRound(capTableId, roundId, userId);
  }

  // ============================================
  // SCENARIOS (What-if modeling)
  // ============================================

  @Post(':id/scenarios')
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Create a what-if scenario' })
  @ApiResponse({ status: 201, type: ScenarioResponseDto })
  async createScenario(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateScenarioDto,
  ) {
    return this.capTableService.createScenario(capTableId, userId, dto);
  }

  @Get(':id/scenarios')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'List scenarios' })
  @ApiResponse({ status: 200, type: [ScenarioResponseDto] })
  async getScenarios(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.capTableService.getScenarios(capTableId, userId);
  }

  @Delete(':id/scenarios/:scenarioId')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete scenario' })
  @ApiResponse({ status: 204 })
  async deleteScenario(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @Param('scenarioId', ParseUUIDPipe) scenarioId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.capTableService.deleteScenario(capTableId, scenarioId, userId);
  }

  // ============================================
  // EXPORT
  // ============================================

  @Post(':id/export')
  @RateLimit({ limit: 10, ttl: 60, keyPrefix: 'cap-table:export' })
  @ApiOperation({ summary: 'Export cap table (JSON, CSV, or Carta format)' })
  async export(
    @Param('id', ParseUUIDPipe) capTableId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ExportCapTableDto,
    @Res() res: Response,
  ) {
    const result = await this.capTableService.exportCapTable(capTableId, userId, dto.format);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }
}
