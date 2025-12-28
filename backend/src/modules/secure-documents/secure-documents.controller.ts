import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { UserThrottleGuard } from '@/common/guards/user-throttle.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';
import { SecureDocumentsService, SecureDocumentResponse } from './secure-documents.service';

@ApiTags('Secure Documents')
@Controller('secure-documents')
@ApiBearerAuth()
@UseGuards(AuthGuard, UserThrottleGuard)
@RateLimit(RateLimitPresets.STANDARD) // Default: 100 req/min
export class SecureDocumentsController {
  constructor(private readonly service: SecureDocumentsService) {}

  @Post('upload')
  @RateLimit(RateLimitPresets.CREATE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and securely process a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        sessionId: { type: 'string', format: 'uuid' },
        expiryDays: { type: 'number' },
      },
    },
  })
  async upload(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId?: string,
    @Body('expiryDays') expiryDays?: string,
  ): Promise<SecureDocumentResponse> {
    return this.service.processDocument(
      user.id,
      file,
      sessionId,
      expiryDays ? parseInt(expiryDays, 10) : undefined,
    );
  }

  @Get()
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'List user documents' })
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sessionId') sessionId?: string,
  ): Promise<SecureDocumentResponse[]> {
    return this.service.findByUser(user.id, sessionId);
  }

  @Get(':id/context')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get decrypted document chunks for LLM context' })
  async getContext(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('chunks') chunks?: string, // comma-separated chunk indices
  ) {
    const chunkIndices = chunks
      ? chunks.split(',').map(c => parseInt(c.trim(), 10)).filter(n => !isNaN(n))
      : undefined;
    
    return this.service.getDecryptedChunks(id, user.id, chunkIndices);
  }

  @Post(':id/extend')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Extend document expiry' })
  async extendExpiry(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('days') days: number,
  ): Promise<SecureDocumentResponse> {
    return this.service.extendExpiry(id, user.id, days || 30);
  }

  @Delete(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete a document and all its data' })
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.service.deleteDocument(id, user.id);
    return { success: true };
  }

  @Delete('purge/all')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete ALL user documents (purge all data)' })
  async purgeAll(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ documentsDeleted: number }> {
    return this.service.purgeUserDocuments(user.id);
  }
}
