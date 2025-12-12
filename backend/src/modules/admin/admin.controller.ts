import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UploadPdfDto, ListEmbeddingsQueryDto, EmbeddingResponseDto } from './dto';
import { AdminGuard } from '@/common/guards/admin.guard';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('embeddings/upload')
  @ApiOperation({ summary: 'Upload PDF for embedding' })
  @ApiResponse({ status: 201, description: 'PDF uploaded' })
  async uploadPdf(@Body() dto: UploadPdfDto): Promise<ApiResponseDto<{ id: string; status: string }>> {
    const result = await this.adminService.uploadPdf(dto);
    return ApiResponseDto.success(result, 'PDF uploaded for processing');
  }

  @Get('embeddings')
  @ApiOperation({ summary: 'List all embeddings' })
  @ApiResponse({ status: 200, description: 'Embeddings list' })
  async listEmbeddings(
    @Query() query: ListEmbeddingsQueryDto,
  ): Promise<ApiResponseDto<PaginatedResult<EmbeddingResponseDto>>> {
    const result = await this.adminService.listEmbeddings(query);
    return ApiResponseDto.success(result);
  }

  @Get('embeddings/:id')
  @ApiOperation({ summary: 'Get embedding by ID' })
  @ApiResponse({ status: 200, description: 'Embedding found' })
  @ApiResponse({ status: 404, description: 'Embedding not found' })
  async getEmbedding(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<EmbeddingResponseDto>> {
    const embedding = await this.adminService.getEmbedding(id);
    return ApiResponseDto.success(embedding);
  }

  @Delete('embeddings/:id')
  @ApiOperation({ summary: 'Delete embedding' })
  @ApiResponse({ status: 200, description: 'Embedding deleted' })
  async deleteEmbedding(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<null>> {
    await this.adminService.deleteEmbedding(id);
    return ApiResponseDto.message('Embedding deleted successfully');
  }
}
