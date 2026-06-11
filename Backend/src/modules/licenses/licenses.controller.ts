import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '@/common/guards/admin.guard';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { ActivateLicenseDto, ActivationResponseDto, CreateLicenseDto, CreatedLicenseDto, DeactivateLicenseDto, HeartbeatLicenseDto, LicenseEntitlementDto, LicenseSummaryDto } from './dto';
import { LicensesService } from './licenses.service';

@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post('activate')
  async activate(@Body() dto: ActivateLicenseDto): Promise<ApiResponseDto<ActivationResponseDto>> {
    const result = await this.licensesService.activate(dto);
    return ApiResponseDto.success(result, 'License activated');
  }

  @Post('heartbeat')
  async heartbeat(@Body() dto: HeartbeatLicenseDto): Promise<ApiResponseDto<LicenseEntitlementDto>> {
    const result = await this.licensesService.heartbeat(dto);
    return ApiResponseDto.success(result, 'License heartbeat accepted');
  }

  @Post('deactivate')
  async deactivate(@Body() dto: DeactivateLicenseDto): Promise<ApiResponseDto<null>> {
    await this.licensesService.deactivate(dto);
    return ApiResponseDto.message('License deactivated');
  }

  @Get()
  @UseGuards(AdminGuard)
  async listLicenses(): Promise<ApiResponseDto<LicenseSummaryDto[]>> {
    const result = await this.licensesService.listLicenses();
    return ApiResponseDto.success(result);
  }

  @Post()
  @UseGuards(AdminGuard)
  async createLicense(@Body() dto: CreateLicenseDto): Promise<ApiResponseDto<CreatedLicenseDto>> {
    const result = await this.licensesService.createLicense(dto);
    return ApiResponseDto.success(result, 'License generated');
  }
}
