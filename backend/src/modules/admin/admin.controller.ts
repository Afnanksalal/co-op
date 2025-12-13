import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UploadPdfDto, ListEmbeddingsQueryDto, EmbeddingResponseDto } from './dto';
import { AdminGuard } from '@/common/guards/admin.guard';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('embeddings/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload PDF for RAG embedding (lazy vectorization)' })
  @ApiResponse({ status: 201, description: 'PDF uploaded to storage, vectors created on first query' })
  async uploadPdf(
    @UploadedFile() file: UploadedFileType,
    @Body() dto: UploadPdfDto,
  ): Promise<ApiResponseDto<{ id: string; status: string; storagePath: string; domain: string; sector: string }>> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    const result = await this.adminService.uploadPdf(dto, file.buffer, file.mimetype);

    return ApiResponseDto.success(result, `PDF uploaded to ${dto.domain}/${dto.sector} (vectors created on first query)`);
  }

  @Get('embeddings')
  @ApiOperation({ summary: 'List all embeddings with optional domain/sector filter' })
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
  @ApiOperation({ summary: 'Delete embedding and its vectors' })
  @ApiResponse({ status: 200, description: 'Embedding deleted' })
  async deleteEmbedding(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<null>> {
    await this.adminService.deleteEmbedding(id);
    return ApiResponseDto.message('Embedding deleted successfully');
  }

  @Post('embeddings/:id/vectorize')
  @ApiOperation({ summary: 'Force vectorization of a specific file' })
  @ApiResponse({ status: 200, description: 'File vectorized' })
  async forceVectorize(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ chunksCreated: number }>> {
    const result = await this.adminService.forceVectorize(id);
    return ApiResponseDto.success(result, `Vectorized ${String(result.chunksCreated)} chunks`);
  }

  @Post('embeddings/cleanup')
  @ApiOperation({ summary: 'Cleanup expired vectors (not accessed in X days)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days of inactivity (default: 30)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupExpiredVectors(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ): Promise<ApiResponseDto<{ filesCleaned: number; vectorsRemoved: number }>> {
    const result = await this.adminService.cleanupExpiredVectors(days ?? 30);
    return ApiResponseDto.success(result, `Cleaned ${String(result.filesCleaned)} files`);
  }
}
