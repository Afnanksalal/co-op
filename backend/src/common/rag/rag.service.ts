import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '@/common/circuit-breaker/circuit-breaker.service';
import {
  RagDomain,
  RagSector,
  RegisterFileRequest,
  RegisterFileResponse,
  VectorizeResponse,
  QueryRequest,
  QueryResponse,
  RagFileInfo,
  ListFilesResponse,
  DeleteFileResponse,
  CleanupResponse,
} from './rag.types';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly ragBaseUrl: string;
  private readonly ragApiKey: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.ragBaseUrl = this.configService.get<string>('RAG_SERVICE_URL', '');
    this.ragApiKey = this.configService.get<string>('RAG_API_KEY', '');
    this.isConfigured = Boolean(this.ragBaseUrl);

    if (this.isConfigured) {
      this.logger.log(`RAG service configured: ${this.ragBaseUrl}`);
    } else {
      this.logger.warn('RAG service not configured - semantic search disabled');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.ragApiKey) {
      headers['X-API-Key'] = this.ragApiKey;
    }
    return headers;
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Register a file that's already in Supabase Storage.
   * Vectors are NOT created yet (lazy loading on first query).
   */
  async registerFile(request: RegisterFileRequest): Promise<RegisterFileResponse> {
    if (!this.isConfigured) {
      return { success: false, fileId: request.fileId, message: 'RAG service not configured' };
    }

    try {
      const response = await fetch(`${this.ragBaseUrl}/rag/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          file_id: request.fileId,
          filename: request.filename,
          storage_path: request.storagePath,
          domain: request.domain,
          sector: request.sector,
          content_type: request.contentType,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = (await response.json()) as { success: boolean; file_id: string; message: string };
      return { success: data.success, fileId: data.file_id, message: data.message };
    } catch (error) {
      this.logger.error('File registration failed', error);
      return {
        success: false,
        fileId: request.fileId,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Force vectorization of a specific file.
   */
  async vectorizeFile(fileId: string): Promise<VectorizeResponse> {
    if (!this.isConfigured) {
      return { success: false, fileId, chunksCreated: 0, message: 'RAG service not configured' };
    }

    try {
      const response = await fetch(`${this.ragBaseUrl}/rag/vectorize/${fileId}`, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(120000), // 2 min for large files
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = (await response.json()) as { success: boolean; file_id: string; chunks_created: number; message: string };
      return {
        success: data.success,
        fileId: data.file_id,
        chunksCreated: data.chunks_created,
        message: data.message,
      };
    } catch (error) {
      this.logger.error('Vectorization failed', error);
      return {
        success: false,
        fileId,
        chunksCreated: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query RAG with domain and sector filtering.
   * Automatically vectorizes pending files (lazy loading).
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    if (!this.isConfigured) {
      return {
        answer: 'RAG service not configured',
        sources: [],
        domain: request.domain,
        sector: request.sector,
        vectorsLoaded: 0,
      };
    }

    const queryFn = async (): Promise<QueryResponse> => {
      const response = await fetch(`${this.ragBaseUrl}/rag/query`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          query: request.query,
          domain: request.domain,
          sector: request.sector,
          limit: request.limit ?? 5,
        }),
        signal: AbortSignal.timeout(60000), // Longer timeout for lazy loading
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        answer: string;
        sources: { file_id: string; filename: string; score: number; domain: string; sector: string }[];
        domain: string;
        sector: string;
        vectors_loaded: number;
      };

      return {
        answer: data.answer,
        sources: data.sources.map((s) => ({
          fileId: s.file_id,
          filename: s.filename,
          score: s.score,
          domain: s.domain,
          sector: s.sector,
        })),
        domain: data.domain,
        sector: data.sector,
        vectorsLoaded: data.vectors_loaded,
      };
    };

    try {
      return await this.circuitBreaker.execute('rag-query', queryFn, () => ({
        answer: 'RAG service temporarily unavailable',
        sources: [],
        domain: request.domain,
        sector: request.sector,
        vectorsLoaded: 0,
      }));
    } catch (error) {
      this.logger.error('RAG query failed', error);
      return {
        answer: 'Failed to query RAG service',
        sources: [],
        domain: request.domain,
        sector: request.sector,
        vectorsLoaded: 0,
      };
    }
  }

  /**
   * Get relevant context for an agent prompt.
   */
  async getContext(
    query: string,
    domain: RagDomain,
    sector: RagSector,
    limit = 5,
  ): Promise<string> {
    const result = await this.query({ query, domain, sector, limit });

    if (!result.sources.length) {
      return '';
    }

    const sourceList = result.sources
      .map((s, i) => `[${String(i + 1)}] ${s.filename} (score: ${s.score.toFixed(2)})`)
      .join('\n');

    return `\n\n--- RAG Context (${domain}/${sector}) ---\n${result.answer}\n\nSources:\n${sourceList}\n--- End RAG Context ---\n`;
  }

  /**
   * Get file info by ID.
   */
  async getFile(fileId: string): Promise<RagFileInfo | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const response = await fetch(`${this.ragBaseUrl}/rag/files/${fileId}`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Get file failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        id: string;
        filename: string;
        storage_path: string;
        domain: string;
        sector: string;
        vector_status: string;
        chunk_count: number;
        last_accessed: string | null;
        created_at: string;
      };

      return {
        id: data.id,
        filename: data.filename,
        storagePath: data.storage_path,
        domain: data.domain,
        sector: data.sector,
        vectorStatus: data.vector_status as 'pending' | 'indexed' | 'expired',
        chunkCount: data.chunk_count,
        lastAccessed: data.last_accessed,
        createdAt: data.created_at,
      };
    } catch (error) {
      this.logger.error('Get file failed', error);
      return null;
    }
  }

  /**
   * List files with optional domain/sector filter.
   */
  async listFiles(domain?: RagDomain, sector?: RagSector): Promise<ListFilesResponse> {
    if (!this.isConfigured) {
      return { files: [], count: 0 };
    }

    try {
      const params = new URLSearchParams();
      if (domain) params.append('domain', domain);
      if (sector) params.append('sector', sector);

      const url = `${this.ragBaseUrl}/rag/files${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`List files failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        files: {
          id: string;
          filename: string;
          storage_path: string;
          domain: string;
          sector: string;
          vector_status: string;
          chunk_count: number;
          last_accessed: string | null;
          created_at: string;
        }[];
        count: number;
      };

      return {
        files: data.files.map((f) => ({
          id: f.id,
          filename: f.filename,
          storagePath: f.storage_path,
          domain: f.domain,
          sector: f.sector,
          vectorStatus: f.vector_status as 'pending' | 'indexed' | 'expired',
          chunkCount: f.chunk_count,
          lastAccessed: f.last_accessed,
          createdAt: f.created_at,
        })),
        count: data.count,
      };
    } catch (error) {
      this.logger.error('List files failed', error);
      return { files: [], count: 0 };
    }
  }

  /**
   * Delete a file and its vectors.
   */
  async deleteFile(fileId: string): Promise<DeleteFileResponse> {
    if (!this.isConfigured) {
      return { success: false, message: 'RAG service not configured', chunksDeleted: 0 };
    }

    try {
      const response = await fetch(`${this.ragBaseUrl}/rag/files/${fileId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { success: boolean; message: string; chunks_deleted: number };
      return {
        success: data.success,
        message: data.message,
        chunksDeleted: data.chunks_deleted,
      };
    } catch (error) {
      this.logger.error('Delete file failed', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        chunksDeleted: 0,
      };
    }
  }

  /**
   * Cleanup expired vectors (not accessed in X days).
   */
  async cleanupExpired(days = 30): Promise<CleanupResponse> {
    if (!this.isConfigured) {
      return { filesCleaned: 0, vectorsRemoved: 0, message: 'RAG service not configured' };
    }

    try {
      const response = await fetch(`${this.ragBaseUrl}/rag/cleanup?days=${String(days)}`, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`Cleanup failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { files_cleaned: number; vectors_removed: number; message: string };
      return {
        filesCleaned: data.files_cleaned,
        vectorsRemoved: data.vectors_removed,
        message: data.message,
      };
    } catch (error) {
      this.logger.error('Cleanup failed', error);
      return {
        filesCleaned: 0,
        vectorsRemoved: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
