import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, lt } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { UserDocsRagService } from '@/common/rag/user-docs-rag.service';
import * as schema from '@/database/schema';
import { userDocuments } from '@/database/schema/user-documents.schema';

/** Default document expiry in days */
const DEFAULT_EXPIRY_DAYS = 30;

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Chunk size in characters (roughly 500 tokens) */
const CHUNK_SIZE = 2000;

/** Chunk overlap in characters */
const CHUNK_OVERLAP = 200;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ALLOWED_MIME_TYPES = ['application/pdf'] as const;

export interface SecureDocumentResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  chunkCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface DocumentChunkContext {
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
}

@Injectable()
export class SecureDocumentsService {
  private readonly logger = new Logger(SecureDocumentsService.name);
  private readonly expiryDays: number;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
    private readonly userDocsRag: UserDocsRagService,
  ) {
    this.expiryDays = this.config.get<number>('DOCUMENT_EXPIRY_DAYS', DEFAULT_EXPIRY_DAYS);
  }


  /**
   * Process and securely store a document.
   * Flow: Extract text → Chunk → Embed to Upstash (with encryption) → Delete original
   * 
   * NOTE: Content is stored encrypted in Upstash Vector, NOT in PostgreSQL.
   * This eliminates the need for a separate chunks table.
   */
  async processDocument(
    userId: string,
    file: Express.Multer.File,
    sessionId?: string,
    expiryDays?: number,
  ): Promise<SecureDocumentResponse> {
    this.validateFile(file);

    const documentId = uuid();
    const expiry = expiryDays ?? this.expiryDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiry);

    // Create document record (metadata only)
    await this.db
      .insert(userDocuments)
      .values({
        id: documentId,
        userId,
        sessionId: sessionId ?? null,
        filename: `${documentId}.processed`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: 'processing',
        expiresAt,
      });

    try {
      // Extract text from document
      const text = await this.extractText(file);
      
      // Chunk the text
      const chunks = this.chunkText(text);
      
      // Embed each chunk via RAG service (encryption happens in RAG service)
      let successCount = 0;
      let lastError = '';
      for (let i = 0; i < chunks.length; i++) {
        if (this.userDocsRag.isAvailable()) {
          const vectorId = await this.userDocsRag.embedChunk(
            documentId,
            i,
            userId,
            chunks[i], // Plaintext - RAG service encrypts before storage
            file.originalname,
          );
          if (vectorId) {
            successCount++;
          } else {
            lastError = 'Embedding returned null - check RAG service logs';
          }
        } else {
          lastError = 'RAG service not available';
        }
      }

      // If RAG is not available, still allow document upload (just won't have semantic search)
      if (!this.userDocsRag.isAvailable()) {
        this.logger.warn(`RAG service not available - document ${documentId} uploaded without embeddings`);
        // Update document status to ready anyway
        const [updated] = await this.db
          .update(userDocuments)
          .set({
            status: 'ready',
            chunkCount: chunks.length,
            updatedAt: new Date(),
          })
          .where(eq(userDocuments.id, documentId))
          .returning();

        return this.toResponse(updated);
      }

      if (successCount === 0) {
        throw new BadRequestException(`Failed to embed document chunks: ${lastError || 'Unknown error'}`);
      }

      // Update document status
      const [updated] = await this.db
        .update(userDocuments)
        .set({
          status: 'ready',
          chunkCount: chunks.length,
          updatedAt: new Date(),
        })
        .where(eq(userDocuments.id, documentId))
        .returning();

      this.logger.log(`Document processed: ${documentId} (${chunks.length} chunks, vector-only storage)`);
      
      return this.toResponse(updated);
    } catch (error) {
      // Mark as failed
      await this.db
        .update(userDocuments)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(userDocuments.id, documentId));
      
      this.logger.error(`Document processing failed: ${documentId}`, error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process document');
    }
  }

  /**
   * Get decrypted chunks for a document (for LLM context).
   * Fetches from Upstash Vector and decrypts via RAG service.
   */
  async getDecryptedChunks(
    documentId: string,
    userId: string,
    chunkIndices?: number[],
  ): Promise<DocumentChunkContext[]> {
    // Verify ownership and get document
    const [document] = await this.db
      .select()
      .from(userDocuments)
      .where(and(
        eq(userDocuments.id, documentId),
        eq(userDocuments.userId, userId),
        eq(userDocuments.status, 'ready'),
        eq(userDocuments.isExpired, false),
      ))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found or expired');
    }

    // Update last accessed
    await this.db
      .update(userDocuments)
      .set({ lastAccessedAt: new Date() })
      .where(eq(userDocuments.id, documentId));

    // Get chunks from RAG service (decrypted)
    if (!this.userDocsRag.isAvailable()) {
      return [];
    }

    const indices = chunkIndices ?? Array.from({ length: document.chunkCount }, (_, i) => i);
    const result = await this.userDocsRag.getChunks(documentId, userId, indices);
    
    return result.map(chunk => ({
      documentId: chunk.document_id,
      filename: chunk.filename,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
    }));
  }

  /**
   * Semantic search across user's documents using Upstash Vector.
   * Returns relevant chunks with decrypted content.
   */
  async searchUserDocuments(
    userId: string,
    query: string,
    documentIds?: string[],
    limit = 5,
    minScore = 0.5,
  ): Promise<{ documentId: string; chunkIndex: number; score: number; content: string; filename: string }[]> {
    if (!this.userDocsRag.isAvailable()) {
      this.logger.warn('RAG service not available, returning empty results');
      return [];
    }

    return this.userDocsRag.searchDocuments(query, userId, documentIds, limit, minScore);
  }


  /**
   * Get all documents for a user.
   */
  async findByUser(userId: string, sessionId?: string): Promise<SecureDocumentResponse[]> {
    const whereClause = sessionId
      ? and(eq(userDocuments.userId, userId), eq(userDocuments.sessionId, sessionId))
      : eq(userDocuments.userId, userId);

    const documents = await this.db
      .select()
      .from(userDocuments)
      .where(whereClause)
      .orderBy(desc(userDocuments.createdAt));

    return documents.map(d => this.toResponse(d));
  }

  /**
   * Delete a document and all its vectors.
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    const [doc] = await this.db
      .select()
      .from(userDocuments)
      .where(and(eq(userDocuments.id, documentId), eq(userDocuments.userId, userId)))
      .limit(1);

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Delete vectors from Upstash
    if (this.userDocsRag.isAvailable()) {
      await this.userDocsRag.deleteDocumentVectors(documentId, doc.chunkCount);
    }

    // Delete document metadata
    await this.db
      .delete(userDocuments)
      .where(eq(userDocuments.id, documentId));

    this.logger.log(`Document deleted: ${documentId}`);
  }

  /**
   * Delete ALL documents for a user (purge all data).
   */
  async purgeUserDocuments(userId: string): Promise<{ documentsDeleted: number }> {
    const documents = await this.db
      .select({ id: userDocuments.id })
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId));

    // Delete all vectors from Upstash
    if (this.userDocsRag.isAvailable()) {
      await this.userDocsRag.deleteUserVectors(userId);
    }

    // Delete all document metadata
    await this.db
      .delete(userDocuments)
      .where(eq(userDocuments.userId, userId));

    this.logger.log(`User data purged: ${userId} (${documents.length} docs)`);

    return {
      documentsDeleted: documents.length,
    };
  }

  /**
   * Cleanup expired documents (run via cron job).
   */
  async cleanupExpired(): Promise<{ documentsExpired: number }> {
    const now = new Date();

    // Find expired documents
    const expiredDocs = await this.db
      .select()
      .from(userDocuments)
      .where(and(
        lt(userDocuments.expiresAt, now),
        eq(userDocuments.isExpired, false),
      ));

    if (expiredDocs.length === 0) {
      return { documentsExpired: 0 };
    }

    // Delete vectors and mark documents as expired
    for (const doc of expiredDocs) {
      if (this.userDocsRag.isAvailable()) {
        await this.userDocsRag.deleteDocumentVectors(doc.id, doc.chunkCount);
      }

      await this.db
        .update(userDocuments)
        .set({ isExpired: true, status: 'expired', updatedAt: new Date() })
        .where(eq(userDocuments.id, doc.id));
    }

    this.logger.log(`Expired documents cleaned: ${expiredDocs.length} docs`);

    return {
      documentsExpired: expiredDocs.length,
    };
  }

  /**
   * Extend document expiry.
   */
  async extendExpiry(documentId: string, userId: string, additionalDays: number): Promise<SecureDocumentResponse> {
    const [document] = await this.db
      .select()
      .from(userDocuments)
      .where(and(
        eq(userDocuments.id, documentId),
        eq(userDocuments.userId, userId),
        eq(userDocuments.isExpired, false),
      ))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found or already expired');
    }

    const newExpiry = new Date(document.expiresAt || new Date());
    newExpiry.setDate(newExpiry.getDate() + additionalDays);

    const [updated] = await this.db
      .update(userDocuments)
      .set({ expiresAt: newExpiry, updatedAt: new Date() })
      .where(eq(userDocuments.id, documentId))
      .returning();

    return this.toResponse(updated);
  }

  // Private helper methods

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    if (file.mimetype === 'application/pdf') {
      return;
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf') {
      return;
    }

    throw new BadRequestException('Only PDF files are supported');
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    try {
      // pdf-parse v2.x uses PDFParse class with LoadParameters
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('pdf-parse');
      
      // Create parser with buffer data
      const parser = new PDFParse({ data: file.buffer });
      
      // Extract text from all pages
      const result = await parser.getText();
      const text = result.text;
      
      // Cleanup parser resources
      await parser.destroy();
      
      if (!text || text.trim().length < 10) {
        throw new BadRequestException(
          `Could not extract text from "${file.originalname}". The PDF may be empty or contain only images/scans.`
        );
      }
      
      this.logger.log(`PDF extracted: ${file.originalname} (${result.total} pages, ${text.length} chars)`);
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`PDF extraction failed for ${file.originalname}: ${errorMessage}`, error);
      throw new BadRequestException(
        `Failed to process "${file.originalname}". The PDF may be corrupted or password-protected.`
      );
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    const effectiveOverlap = Math.min(CHUNK_OVERLAP, CHUNK_SIZE - 1);

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end));
      
      const nextStart = end - effectiveOverlap;
      
      if (nextStart <= start) {
        start = end;
      } else {
        start = nextStart;
      }
      
      if (start >= text.length - effectiveOverlap) break;
    }

    return chunks.filter(c => c.trim().length > 0);
  }

  private toResponse(doc: typeof userDocuments.$inferSelect): SecureDocumentResponse {
    return {
      id: doc.id,
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      status: doc.status,
      chunkCount: doc.chunkCount,
      expiresAt: doc.expiresAt?.toISOString() ?? null,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
