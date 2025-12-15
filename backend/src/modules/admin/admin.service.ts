import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { SupabaseStorageService } from '@/common/supabase/supabase-storage.service';
import { RagService } from '@/common/rag/rag.service';
import { AuditService } from '@/common/audit/audit.service';
import { UploadPdfDto } from './dto';
import { ListEmbeddingsQueryDto, EmbeddingResponseDto } from './dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

interface UploadResult {
  id: string;
  status: string;
  storagePath: string;
  domain: string;
  sector: string;
  region: string;
  jurisdictions: string[];
  documentType: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly storage: SupabaseStorageService,
    private readonly ragService: RagService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Upload PDF to Supabase Storage, then register with RAG service.
   * Vectors are NOT created immediately (lazy loading on first query).
   */
  async uploadPdf(
    dto: UploadPdfDto,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    const fileId = uuid();

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = dto.filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 255);

    // Storage path: domain/sector/region/fileId/filename
    const region = dto.region ?? 'global';
    const storagePath = `${dto.domain}/${dto.sector}/${region}/${fileId}/${sanitizedFilename}`;

    // 1. Upload to Supabase Storage
    const uploadResult = await this.storage.upload(storagePath, fileBuffer, contentType);
    this.logger.log(`File uploaded to storage: ${uploadResult.path}`);

    // Prepare jurisdiction data
    const jurisdictions = dto.jurisdictions ?? ['general'];
    const documentType = dto.documentType ?? 'guide';

    // 2. Register with RAG service (lazy vectorization)
    if (this.ragService.isAvailable()) {
      const registerResult = await this.ragService.registerFile({
        fileId,
        filename: sanitizedFilename,
        storagePath: uploadResult.path,
        domain: dto.domain,
        sector: dto.sector,
        contentType,
        region,
        jurisdictions,
        documentType,
      });

      if (!registerResult.success) {
        // Rollback: delete from storage if registration fails
        await this.storage.delete(storagePath);
        throw new BadRequestException(`RAG registration failed: ${registerResult.message}`);
      }

      this.logger.log(
        `File registered with RAG: ${fileId} (${dto.domain}/${dto.sector}/${region}, jurisdictions: ${jurisdictions.join(',')})`,
      );
    } else {
      this.logger.warn('RAG service not available - file uploaded but not registered');
    }

    // Audit log
    await this.audit.log({
      userId: null, // Admin action
      action: 'embedding.uploaded',
      resource: 'embedding',
      resourceId: fileId,
      oldValue: null,
      newValue: {
        filename: sanitizedFilename,
        domain: dto.domain,
        sector: dto.sector,
        region,
        jurisdictions,
        documentType,
      },
      ipAddress: null,
      userAgent: null,
      metadata: { storagePath: uploadResult.path },
    });

    return {
      id: fileId,
      status: 'pending',
      storagePath: uploadResult.path,
      domain: dto.domain,
      sector: dto.sector,
      region,
      jurisdictions,
      documentType,
    };
  }

  /**
   * Force vectorization of a specific file.
   */
  async forceVectorize(fileId: string): Promise<{ chunksCreated: number }> {
    if (!this.ragService.isAvailable()) {
      throw new BadRequestException('RAG service not configured');
    }

    const fileInfo = await this.ragService.getFile(fileId);
    if (fileInfo) {
      this.logger.log(`Vectorizing file: ${fileId}`);
      this.logger.log(`Storage path: ${fileInfo.storagePath}`);
      this.logger.log(`Domain: ${fileInfo.domain}, Sector: ${fileInfo.sector}`);
      this.logger.log(`Region: ${fileInfo.region ?? 'global'}, Jurisdictions: ${fileInfo.jurisdictions?.join(',') ?? 'general'}`);
    }

    const result = await this.ragService.vectorizeFile(fileId);

    if (!result.success) {
      this.logger.error(`Vectorization failed for ${fileId}: ${result.message}`);
      throw new BadRequestException(result.message);
    }

    this.logger.log(`Vectorization successful: ${result.chunksCreated} chunks created`);
    return { chunksCreated: result.chunksCreated };
  }

  /**
   * List all embeddings with optional domain/sector/region filter.
   */
  async listEmbeddings(
    query: ListEmbeddingsQueryDto,
  ): Promise<PaginatedResult<EmbeddingResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (!this.ragService.isAvailable()) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    try {
      const domain = query.domain;
      const sector = query.sector;
      const region = query.region;
      const result = await this.ragService.listFiles(domain, sector, region);

      const embeddings: EmbeddingResponseDto[] = result.files.map((file) => ({
        id: file.id,
        filename: file.filename,
        storagePath: file.storagePath,
        domain: file.domain,
        sector: file.sector,
        region: file.region ?? 'global',
        jurisdictions: file.jurisdictions ?? ['general'],
        documentType: file.documentType ?? 'guide',
        status: file.vectorStatus,
        chunksCreated: file.chunkCount,
        lastAccessed: file.lastAccessed ? new Date(file.lastAccessed) : undefined,
        createdAt: new Date(file.createdAt),
      }));

      // Paginate
      const total = embeddings.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedData = embeddings.slice(startIndex, startIndex + limit);

      return {
        data: paginatedData,
        meta: { total, page, limit, totalPages },
      };
    } catch (error) {
      this.logger.error('Failed to list embeddings', error);
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }
  }

  /**
   * Get embedding by ID.
   */
  async getEmbedding(id: string): Promise<EmbeddingResponseDto> {
    if (!this.ragService.isAvailable()) {
      throw new NotFoundException('RAG service not configured');
    }

    const file = await this.ragService.getFile(id);

    if (!file) {
      throw new NotFoundException('Document not found');
    }

    return {
      id: file.id,
      filename: file.filename,
      storagePath: file.storagePath,
      domain: file.domain,
      sector: file.sector,
      region: file.region ?? 'global',
      jurisdictions: file.jurisdictions ?? ['general'],
      documentType: file.documentType ?? 'guide',
      status: file.vectorStatus,
      chunksCreated: file.chunkCount,
      lastAccessed: file.lastAccessed ? new Date(file.lastAccessed) : undefined,
      createdAt: new Date(file.createdAt),
    };
  }

  /**
   * Delete embedding and its vectors + storage file.
   */
  async deleteEmbedding(id: string): Promise<void> {
    const file = await this.ragService.getFile(id);

    if (!file) {
      throw new NotFoundException('Document not found');
    }

    // 1. Delete from RAG service (vectors + metadata)
    const result = await this.ragService.deleteFile(id);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    // 2. Delete from Supabase Storage
    try {
      await this.storage.delete(file.storagePath);
      this.logger.log(`Deleted from storage: ${file.storagePath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete from storage: ${file.storagePath}`, error);
    }

    // Audit log
    await this.audit.log({
      userId: null,
      action: 'embedding.deleted',
      resource: 'embedding',
      resourceId: id,
      oldValue: {
        filename: file.filename,
        domain: file.domain,
        sector: file.sector,
        region: file.region,
        jurisdictions: file.jurisdictions,
      },
      newValue: null,
      ipAddress: null,
      userAgent: null,
      metadata: { chunksDeleted: result.chunksDeleted },
    });

    this.logger.log(`Document deleted: ${id} (${String(result.chunksDeleted)} chunks)`);
  }

  /**
   * Trigger cleanup of expired vectors (not accessed in X days).
   */
  async cleanupExpiredVectors(days = 30): Promise<{ filesCleaned: number; vectorsRemoved: number }> {
    if (!this.ragService.isAvailable()) {
      throw new BadRequestException('RAG service not configured');
    }

    const result = await this.ragService.cleanupExpired(days);

    this.logger.log(`Cleanup completed: ${String(result.filesCleaned)} files, ${String(result.vectorsRemoved)} vectors`);

    return result;
  }
}
