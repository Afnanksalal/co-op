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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload PDF for embedding' })
  @ApiResponse({ status: 201, description: 'PDF uploaded' })
  async uploadPdf(
    @UploadedFile() file: UploadedFileType,
    @Body() dto: UploadPdfDto,
  ): Promise<ApiResponseDto<{ id: string; status: string; path: string }>> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const result = await this.adminService.uploadPdf(dto, file.buffer, file.mimetype);

    return ApiResponseDto.success(result, 'PDF uploaded for processing');
  }

  @Get('embeddings')
  @ApiOperation({ summary: 'List all embeddings' })
  @ApiResponse({ status: 200, description: 'Embeddings list' })
  listEmbeddings(
    @Query() query: ListEmbeddingsQueryDto,
  ): ApiResponseDto<PaginatedResult<EmbeddingResponseDto>> {
    const result = this.adminService.listEmbeddings(query);
    return ApiResponseDto.success(result);
  }

  @Get('embeddings/:id')
  @ApiOperation({ summary: 'Get embedding by ID' })
  @ApiResponse({ status: 200, description: 'Embedding found' })
  @ApiResponse({ status: 404, description: 'Embedding not found' })
  getEmbedding(@Param('id', ParseUUIDPipe) id: string): ApiResponseDto<EmbeddingResponseDto> {
    const embedding = this.adminService.getEmbedding(id);
    return ApiResponseDto.success(embedding);
  }

  @Delete('embeddings/:id')
  @ApiOperation({ summary: 'Delete embedding' })
  @ApiResponse({ status: 200, description: 'Embedding deleted' })
  async deleteEmbedding(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<null>> {
    // Note: In production, fetch the actual path from database
    // For now, we delete the folder containing the file
    await this.adminService.deleteEmbedding(id);
    return ApiResponseDto.message('Embedding deleted successfully');
  }
}
