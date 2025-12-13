import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { SupabaseStorageService } from '@/common/supabase/supabase-storage.service';
import { RagService } from '@/common/rag/rag.service';
import { UploadPdfDto, RagDomain, RagSector } from './dto';
import { ListEmbeddingsQueryDto, EmbeddingResponseDto } from './dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

interface UploadResult {
  id: string;
  status: string;
  storagePath: string;
  domain: string;
  sector: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly storage: SupabaseStorageService,
    private readonly ragService: RagService,
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
    
    // Storage path: domain/sector/fileId/filename
    const storagePath = `${dto.domain}/${dto.sector}/${fileId}/${dto.filename}`;

    // 1. Upload to Supabase Storage
    const uploadResult = await this.storage.upload(storagePath, fileBuffer, contentType);
    this.logger.log(`File uploaded to storage: ${uploadResult.path}`);

    // 2. Register with RAG service (lazy vectorization)
    if (this.ragService.isAvailable()) {
      const registerResult = await this.ragService.registerFile({
        fileId,
        filename: dto.filename,
        storagePath: uploadResult.path,
        domain: dto.domain,
        sector: dto.sector,
        contentType,
      });

      if (!registerResult.success) {
        // Rollback: delete from storage if registration fails
        await this.storage.delete(storagePath);
        throw new BadRequestException(`RAG registration failed: ${registerResult.message}`);
      }

      this.logger.log(`File registered with RAG: ${fileId} (${dto.domain}/${dto.sector})`);
    } else {
      this.logger.warn('RAG service not available - file uploaded but not registered');
    }

    return {
      id: fileId,
      status: 'pending', // Vectors will be created on first query
      storagePath: uploadResult.path,
      domain: dto.domain,
      sector: dto.sector,
    };
  }

  /**
   * Force vectorization of a specific file.
   */
  async forceVectorize(fileId: string): Promise<{ chunksCreated: number }> {
    if (!this.ragService.isAvailable()) {
      throw new BadRequestException('RAG service not configured');
    }

    const result = await this.ragService.vectorizeFile(fileId);
    
    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return { chunksCreated: result.chunksCreated };
  }

  /**
   * List all embeddings with optional domain/sector filter.
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
      const domain = query.domain as RagDomain | undefined;
      const sector = query.sector as RagSector | undefined;
      const result = await this.ragService.listFiles(domain, sector);

      const embeddings: EmbeddingResponseDto[] = result.files.map((file) => ({
        id: file.id,
        filename: file.filename,
        storagePath: file.storagePath,
        domain: file.domain,
        sector: file.sector,
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
    // Get file info first
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
