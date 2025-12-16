import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '@/common/circuit-breaker/circuit-breaker.service';
import { RagCacheService } from './rag-cache.service';
import { ClaraRagService } from './clara-rag.service';
import {
  RagDomain,
  RagSector,
  RagRegion,
  RagJurisdiction,
  RegisterFileRequest,
  RegisterFileResponse,
  VectorizeResponse,
  QueryRequest,
  QueryResponse,
  RagFileInfo,
  ListFilesResponse,
  DeleteFileResponse,
  CleanupResponse,
  getRegionFromCountry,
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
    @Inject(forwardRef(() => RagCacheService))
    private readonly cacheService: RagCacheService,
    @Optional()
    @Inject(forwardRef(() => ClaraRagService))
    private readonly claraService?: ClaraRagService,
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
          // New jurisdiction fields
          region: request.region ?? 'global',
          jurisdictions: request.jurisdictions ?? ['general'],
          document_type: request.documentType ?? 'guide',
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
        signal: AbortSignal.timeout(120000),
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
   * Query RAG with domain, sector, and jurisdiction filtering.
   * Returns context (document chunks) - NO LLM generation.
   * Results are cached for 30 minutes to reduce latency.
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    if (!this.isConfigured) {
      return {
        context: '',
        sources: [],
        domain: request.domain,
        sector: request.sector,
        region: request.region,
        jurisdictions: request.jurisdictions,
        vectorsLoaded: 0,
        chunksFound: 0,
        error: 'RAG service not configured',
      };
    }

    // Check cache first
    const cached = await this.cacheService.get(request);
    if (cached) {
      this.logger.debug('RAG query cache hit');
      return cached;
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
          // New jurisdiction fields
          region: request.region ?? null,
          jurisdictions: request.jurisdictions ?? null,
          document_type: request.documentType ?? null,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        context: string;
        sources: {
          file_id: string;
          filename: string;
          score: number;
          domain: string;
          sector: string;
          chunk_index: number;
          region?: string;
          jurisdictions?: string[];
          document_type?: string;
        }[];
        domain: string;
        sector: string;
        region?: string;
        jurisdictions?: string[];
        vectors_loaded: number;
        chunks_found: number;
        error?: string;
      };

      return {
        context: data.context,
        sources: data.sources.map((s) => ({
          fileId: s.file_id,
          filename: s.filename,
          score: s.score,
          domain: s.domain,
          sector: s.sector,
          chunkIndex: s.chunk_index,
          region: s.region,
          jurisdictions: s.jurisdictions,
          documentType: s.document_type,
        })),
        domain: data.domain,
        sector: data.sector,
        region: data.region,
        jurisdictions: data.jurisdictions,
        vectorsLoaded: data.vectors_loaded,
        chunksFound: data.chunks_found,
        error: data.error,
      };
    };

    try {
      const result = await this.circuitBreaker.execute('rag-query', queryFn, () => ({
        context: '',
        sources: [],
        domain: request.domain,
        sector: request.sector,
        region: request.region,
        jurisdictions: request.jurisdictions,
        vectorsLoaded: 0,
        chunksFound: 0,
        error: 'RAG service temporarily unavailable',
      }));

      // Cache successful results
      if (result.chunksFound > 0 && !result.error) {
        await this.cacheService.set(request, result);
      }

      return result;
    } catch (error) {
      this.logger.error('RAG query failed', error);
      return {
        context: '',
        sources: [],
        domain: request.domain,
        sector: request.sector,
        region: request.region,
        jurisdictions: request.jurisdictions,
        vectorsLoaded: 0,
        chunksFound: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get relevant context for an agent prompt with jurisdiction filtering.
   * Returns formatted context from RAG - the LLM Council will use this to generate answers.
   * 
   * If CLaRA is available, context is processed through semantic compression
   * for better relevance and reduced token usage.
   * 
   * @param query - The user's question
   * @param domain - legal or finance
   * @param sector - fintech, greentech, healthtech, saas, ecommerce
   * @param country - User's country (will be mapped to region)
   * @param jurisdictions - Specific regulatory frameworks to filter by
   * @param limit - Max number of chunks to return
   * @param useClara - Whether to use CLaRA for context processing (default: true)
   */
  async getContext(
    query: string,
    domain: RagDomain,
    sector: RagSector,
    country?: string,
    jurisdictions?: RagJurisdiction[],
    limit = 5,
    useClara = true,
  ): Promise<string> {
    // Map country to region
    const region: RagRegion | undefined = country ? getRegionFromCountry(country) : undefined;

    const result = await this.query({
      query,
      domain,
      sector,
      limit,
      region,
      jurisdictions,
    });

    if (!result.context || result.chunksFound === 0) {
      return '';
    }

    // Use CLaRA for intelligent context processing if available
    if (useClara && this.claraService?.isReady()) {
      const sources = result.sources.map(s => ({
        fileId: s.fileId,
        filename: s.filename,
        score: s.score,
        domain: s.domain,
        sector: s.sector,
      }));

      const councilContext = await this.claraService.prepareCouncilContext(
        result.context,
        query,
        domain,
        sources,
      );

      this.logger.debug(
        `CLaRA processed context: compressed=${councilContext.compressed}, ` +
        `ratio=${councilContext.compressionRatio?.toFixed(2) ?? 'N/A'}, ` +
        `time=${councilContext.processingTimeMs}ms`,
      );

      return councilContext.context;
    }

    // Fallback: Build source list with jurisdiction info (no CLaRA)
    const sourceList = result.sources
      .map((s, i) => {
        const regionInfo = s.region ? ` [${s.region.toUpperCase()}]` : '';
        const jurisInfo = s.jurisdictions?.length ? ` (${s.jurisdictions.join(', ')})` : '';
        return `[${String(i + 1)}] ${s.filename}${regionInfo}${jurisInfo} - relevance: ${(s.score * 100).toFixed(0)}%`;
      })
      .join('\n');

    const regionLabel = region ? ` | Region: ${region.toUpperCase()}` : '';
    const jurisLabel = jurisdictions?.length ? ` | Jurisdictions: ${jurisdictions.join(', ')}` : '';

    return `\n\n--- RAG Context (${domain}/${sector}${regionLabel}${jurisLabel}) ---\n${result.context}\n\nSources:\n${sourceList}\n--- End RAG Context ---\n`;
  }

  /**
   * Check if CLaRA RAG specialist is available
   */
  isClaraAvailable(): boolean {
    return this.claraService?.isReady() ?? false;
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
        region?: string;
        jurisdictions?: string[];
        document_type?: string;
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
        region: data.region,
        jurisdictions: data.jurisdictions,
        documentType: data.document_type,
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
   * List files with optional domain/sector/region filter.
   */
  async listFiles(
    domain?: RagDomain,
    sector?: RagSector,
    region?: RagRegion,
  ): Promise<ListFilesResponse> {
    if (!this.isConfigured) {
      return { files: [], count: 0 };
    }

    try {
      const params = new URLSearchParams();
      if (domain) params.append('domain', domain);
      if (sector) params.append('sector', sector);
      if (region) params.append('region', region);

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
          region?: string;
          jurisdictions?: string[];
          document_type?: string;
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
          region: f.region,
          jurisdictions: f.jurisdictions,
          documentType: f.document_type,
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
