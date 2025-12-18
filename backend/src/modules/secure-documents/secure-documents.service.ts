import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, lt } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { EncryptionService } from '@/common/encryption/encryption.service';
import { UserDocsRagService } from '@/common/rag/user-docs-rag.service';
import * as schema from '@/database/schema';
import { userDocuments, userDocumentChunks } from '@/database/schema/user-documents.schema';

/** Default document expiry in days */
const DEFAULT_EXPIRY_DAYS = 30;

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Chunk size in characters (roughly 500 tokens) */
const CHUNK_SIZE = 2000;

/** Chunk overlap in characters */
const CHUNK_OVERLAP = 200;

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
  content: string; // Decrypted content
}

@Injectable()
export class SecureDocumentsService {
  private readonly logger = new Logger(SecureDocumentsService.name);
  private readonly expiryDays: number;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly userDocsRag: UserDocsRagService,
  ) {
    this.expiryDays = this.config.get<number>('DOCUMENT_EXPIRY_DAYS', DEFAULT_EXPIRY_DAYS);
  }


  /**
   * Process and securely store a document.
   * Flow: Extract text → Chunk → Encrypt chunks → Generate embeddings → Delete original
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

    // Create document record first
    const [document] = await this.db
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
      })
      .returning();

    try {
      // Extract text from document
      const text = await this.extractText(file);
      
      // Chunk the text
      const chunks = this.chunkText(text);
      
      // Encrypt and store each chunk, then embed via RAG service
      for (let i = 0; i < chunks.length; i++) {
        const encryptedContent = this.encryption.encrypt(chunks[i]);
        
        // Call RAG service to embed chunk (uses Upstash Vector)
        // This is done BEFORE encryption since we need plaintext for embedding
        let vectorId: string | null = null;
        if (this.userDocsRag.isAvailable()) {
          vectorId = await this.userDocsRag.embedChunk(
            documentId,
            i,
            userId,
            chunks[i], // Plaintext for embedding
            file.originalname,
          );
        }
        
        await this.db.insert(userDocumentChunks).values({
          documentId,
          userId,
          chunkIndex: i,
          encryptedContent,
          vectorId, // Store Upstash vector ID for later deletion
          tokenCount: Math.ceil(chunks[i].length / 4), // Rough estimate
        });
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

      this.logger.log(`Document processed securely: ${documentId} (${chunks.length} chunks)`);
      
      // Original file buffer is NOT stored - it's garbage collected after this function
      return this.toResponse(updated);
    } catch (error) {
      // Mark as failed
      await this.db
        .update(userDocuments)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(userDocuments.id, documentId));
      
      this.logger.error(`Document processing failed: ${documentId}`, error);
      
      // Preserve specific error messages (e.g., from OCR)
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process document securely');
    }
  }

  /**
   * Get decrypted chunks for a document (for LLM context).
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

    // Get chunks
    let query = this.db
      .select()
      .from(userDocumentChunks)
      .where(eq(userDocumentChunks.documentId, documentId))
      .orderBy(userDocumentChunks.chunkIndex);

    const chunks = await query;

    // Filter by indices if specified
    const filteredChunks = chunkIndices
      ? chunks.filter(c => chunkIndices.includes(c.chunkIndex))
      : chunks;

    // Decrypt and return
    return filteredChunks.map(chunk => ({
      documentId: chunk.documentId,
      filename: document.originalName,
      chunkIndex: chunk.chunkIndex,
      content: this.encryption.decrypt(chunk.encryptedContent),
    }));
  }

  /**
   * Semantic search across user's documents using Upstash Vector.
   * Returns relevant chunk indices without decrypting content.
   */
  async searchUserDocuments(
    userId: string,
    query: string,
    documentIds?: string[],
    limit = 5,
    minScore = 0.5,
  ): Promise<{ documentId: string; chunkIndex: number; score: number }[]> {
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
   * Delete a document and all its chunks (user-controlled deletion).
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

    // Delete vectors from Upstash first
    if (this.userDocsRag.isAvailable()) {
      await this.userDocsRag.deleteDocumentVectors(documentId, doc.chunkCount);
    }

    // Delete chunks from database
    await this.db
      .delete(userDocumentChunks)
      .where(eq(userDocumentChunks.documentId, documentId));

    // Delete document
    await this.db
      .delete(userDocuments)
      .where(eq(userDocuments.id, documentId));

    this.logger.log(`Document deleted by user: ${documentId}`);
  }

  /**
   * Delete ALL documents for a user (purge all data).
   */
  async purgeUserDocuments(userId: string): Promise<{ documentsDeleted: number; chunksDeleted: number }> {
    // Count before deletion
    const documents = await this.db
      .select({ id: userDocuments.id })
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId));

    const chunks = await this.db
      .select({ id: userDocumentChunks.id })
      .from(userDocumentChunks)
      .where(eq(userDocumentChunks.userId, userId));

    // Delete all vectors from Upstash first
    if (this.userDocsRag.isAvailable()) {
      await this.userDocsRag.deleteUserVectors(userId);
    }

    // Delete all chunks from database
    await this.db
      .delete(userDocumentChunks)
      .where(eq(userDocumentChunks.userId, userId));

    // Delete all documents
    await this.db
      .delete(userDocuments)
      .where(eq(userDocuments.userId, userId));

    this.logger.log(`User data purged: ${userId} (${documents.length} docs, ${chunks.length} chunks)`);

    return {
      documentsDeleted: documents.length,
      chunksDeleted: chunks.length,
    };
  }

  /**
   * Cleanup expired documents (run via cron job).
   */
  async cleanupExpired(): Promise<{ documentsExpired: number; chunksDeleted: number }> {
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
      return { documentsExpired: 0, chunksDeleted: 0 };
    }

    let chunksDeleted = 0;

    // Delete chunks, vectors, and mark documents as expired
    for (const doc of expiredDocs) {
      // Delete vectors from Upstash first
      if (this.userDocsRag.isAvailable()) {
        await this.userDocsRag.deleteDocumentVectors(doc.id, doc.chunkCount);
      }

      const deleted = await this.db
        .delete(userDocumentChunks)
        .where(eq(userDocumentChunks.documentId, doc.id))
        .returning();
      
      chunksDeleted += deleted.length;

      await this.db
        .update(userDocuments)
        .set({ isExpired: true, status: 'expired', updatedAt: new Date() })
        .where(eq(userDocuments.id, doc.id));
    }

    this.logger.log(`Expired documents cleaned: ${expiredDocs.length} docs, ${chunksDeleted} chunks`);

    return {
      documentsExpired: expiredDocs.length,
      chunksDeleted,
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
    
    // Check MIME type
    if (file.mimetype === 'application/pdf') {
      return;
    }

    // Fallback: check file extension (browsers sometimes send wrong MIME type)
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf') {
      return;
    }

    throw new BadRequestException('Only PDF files are supported');
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse');
      const data = await pdfParse(file.buffer);
      
      if (!data.text || data.text.trim().length < 10) {
        throw new BadRequestException(
          `Could not extract text from "${file.originalname}". The PDF may be empty or contain only images/scans.`
        );
      }
      
      this.logger.log(`PDF extracted: ${file.originalname} (${data.numpages} pages, ${data.text.length} chars)`);
      return data.text;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`PDF extraction failed for ${file.originalname}`, error);
      throw new BadRequestException(
        `Failed to process "${file.originalname}". The PDF may be corrupted or password-protected.`
      );
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end));
      start = end - CHUNK_OVERLAP;
      if (start >= text.length - CHUNK_OVERLAP) break;
    }

    // Ensure we don't have empty chunks
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
