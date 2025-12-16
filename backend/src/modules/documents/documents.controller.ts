import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto, DocumentResponseDto, DocumentUrlResponseDto } from './dto/document.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @RateLimit({ limit: 20, ttl: 60, keyPrefix: 'documents:upload' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document for chat context' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        sessionId: { type: 'string', format: 'uuid' },
        description: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async upload(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ): Promise<ApiResponseDto<DocumentResponseDto>> {
    const document = await this.documentsService.upload(user.id, file, dto.sessionId, dto.description);
    return ApiResponseDto.success(document, 'Document uploaded');
  }

  @Get()
  @ApiOperation({ summary: 'Get user documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sessionId') sessionId?: string,
  ): Promise<ApiResponseDto<DocumentResponseDto[]>> {
    const documents = await this.documentsService.findByUser(user.id, sessionId);
    return ApiResponseDto.success(documents);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document found' })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<DocumentResponseDto>> {
    const document = await this.documentsService.findById(id, user.id);
    return ApiResponseDto.success(document);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed URL for document' })
  @ApiResponse({ status: 200, description: 'Signed URL generated' })
  async getUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<DocumentUrlResponseDto>> {
    const result = await this.documentsService.getSignedUrl(id, user.id);
    return ApiResponseDto.success(result);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document' })
  @ApiResponse({ status: 200, description: 'Document content' })
  async download(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { content, mimeType, filename } = await this.documentsService.getContent(id, user.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  @Get(':id/text')
  @ApiOperation({ summary: 'Extract text content from document' })
  @ApiResponse({ status: 200, description: 'Text content extracted' })
  async extractText(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ content: string }>> {
    const content = await this.documentsService.extractTextContent(id, user.id);
    return ApiResponseDto.success({ content });
  }

  @Delete(':id')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'documents:delete' })
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.documentsService.delete(id, user.id);
    return ApiResponseDto.message('Document deleted');
  }
}
