import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Client for RAG Python service - User Document operations.
 * Handles embedding, search, and deletion of user document vectors.
 * 
 * NOTE: Content is encrypted in the RAG service before storage in Upstash Vector.
 * This service sends plaintext - encryption/decryption happens in RAG service.
 */

interface EmbedChunkResponse {
  success: boolean;
  vector_id: string;
  message: string;
}

interface SearchResult {
  document_id: string;
  chunk_index: number;
  score: number;
  filename: string;
  content: string; // Decrypted content
}

interface SearchResponse {
  results: SearchResult[];
  query_embedding_time_ms: number;
  search_time_ms: number;
  error?: string;
}

interface ChunkResult {
  document_id: string;
  chunk_index: number;
  content: string;
  filename: string;
}

interface GetChunksResponse {
  chunks: ChunkResult[];
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  vectors_deleted: number;
  message: string;
}

@Injectable()
export class UserDocsRagService {
  private readonly logger = new Logger(UserDocsRagService.name);
  private readonly ragUrl: string;
  private readonly ragApiKey: string;
  private readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.ragUrl = this.config.get<string>('RAG_SERVICE_URL', '');
    this.ragApiKey = this.config.get<string>('RAG_API_KEY', '');
    this.isConfigured = Boolean(this.ragUrl);

    if (this.isConfigured) {
      this.logger.log(`User docs RAG service configured: ${this.ragUrl}`);
    } else {
      this.logger.warn('RAG_SERVICE_URL not set - user document semantic search disabled');
    }
  }

  /**
   * Check if RAG service is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Embed a document chunk and store in Upstash Vector.
   * Content is encrypted by the RAG service before storage.
   */
  async embedChunk(
    documentId: string,
    chunkIndex: number,
    userId: string,
    content: string,
    filename: string,
  ): Promise<string | null> {
    if (!this.isConfigured) {
      this.logger.warn('RAG service not configured - cannot embed chunk');
      return null;
    }

    try {
      const response = await fetch(`${this.ragUrl}/user-docs/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.ragApiKey,
        },
        body: JSON.stringify({
          document_id: documentId,
          chunk_index: chunkIndex,
          user_id: userId,
          content, // Plaintext - RAG service encrypts
          filename,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to embed chunk ${chunkIndex}: HTTP ${response.status} - ${error}`);
        return null;
      }

      const data = (await response.json()) as EmbedChunkResponse;
      if (data.success) {
        return data.vector_id;
      }

      this.logger.error(`Embedding failed for chunk ${chunkIndex}: ${data.message}`);
      return null;
    } catch (error) {
      this.logger.error(`Embed chunk error for chunk ${chunkIndex}:`, error);
      return null;
    }
  }

  /**
   * Search user documents using semantic similarity.
   * Returns decrypted content for LLM context.
   */
  async searchDocuments(
    query: string,
    userId: string,
    documentIds?: string[],
    limit = 5,
    minScore = 0.5,
  ): Promise<{ documentId: string; chunkIndex: number; score: number; content: string; filename: string }[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const response = await fetch(`${this.ragUrl}/user-docs/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.ragApiKey,
        },
        body: JSON.stringify({
          query,
          user_id: userId,
          document_ids: documentIds,
          limit,
          min_score: minScore,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.warn(`Search failed: ${response.status} - ${error}`);
        return [];
      }

      const data = (await response.json()) as SearchResponse;
      if (data.error) {
        this.logger.warn(`Search error: ${data.error}`);
        return [];
      }

      return data.results.map((r) => ({
        documentId: r.document_id,
        chunkIndex: r.chunk_index,
        score: r.score,
        content: r.content,
        filename: r.filename,
      }));
    } catch (error) {
      this.logger.error(`Search documents error: ${error}`);
      return [];
    }
  }

  /**
   * Get specific chunks by indices with decrypted content.
   */
  async getChunks(
    documentId: string,
    userId: string,
    chunkIndices: number[],
  ): Promise<ChunkResult[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const response = await fetch(`${this.ragUrl}/user-docs/chunks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.ragApiKey,
        },
        body: JSON.stringify({
          document_id: documentId,
          user_id: userId,
          chunk_indices: chunkIndices,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.warn(`Get chunks failed: ${response.status} - ${error}`);
        return [];
      }

      const data = (await response.json()) as GetChunksResponse;
      if (data.error) {
        this.logger.warn(`Get chunks error: ${data.error}`);
        return [];
      }

      return data.chunks;
    } catch (error) {
      this.logger.error(`Get chunks error: ${error}`);
      return [];
    }
  }

  /**
   * Delete all vectors for a specific document
   */
  async deleteDocumentVectors(documentId: string, chunkCount = 100): Promise<boolean> {
    if (!this.isConfigured) {
      return true;
    }

    try {
      const response = await fetch(
        `${this.ragUrl}/user-docs/${documentId}?chunk_count=${chunkCount}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': this.ragApiKey,
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.warn(`Delete vectors failed: ${response.status} - ${error}`);
        return false;
      }

      const data = (await response.json()) as DeleteResponse;
      this.logger.log(`Deleted vectors for document ${documentId}: ${data.vectors_deleted}`);
      return data.success;
    } catch (error) {
      this.logger.error(`Delete document vectors error: ${error}`);
      return false;
    }
  }

  /**
   * Delete ALL vectors for a user (purge operation)
   */
  async deleteUserVectors(userId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return true;
    }

    try {
      const response = await fetch(`${this.ragUrl}/user-docs/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': this.ragApiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.warn(`Purge user vectors failed: ${response.status} - ${error}`);
        return false;
      }

      const data = (await response.json()) as DeleteResponse;
      this.logger.log(`Purged vectors for user ${userId}: ${data.vectors_deleted}`);
      return data.success;
    } catch (error) {
      this.logger.error(`Purge user vectors error: ${error}`);
      return false;
    }
  }
}
