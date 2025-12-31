import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { SupabaseStorageService } from '@/common/supabase/supabase-storage.service';
import * as schema from '@/database/schema';
import { DocumentResponseDto, DocumentUrlResponseDto, ALLOWED_MIME_TYPES } from './dto/document.dto';

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Supabase storage bucket for chat documents */
const CHAT_DOCUMENTS_BUCKET = 'chat-documents';

/** Signed URL expiration time in seconds (1 hour) */
const SIGNED_URL_EXPIRY = 3600;

/**
 * Service for managing user-uploaded documents.
 * Handles file upload, storage, retrieval, and deletion using Supabase Storage.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly storage: SupabaseStorageService,
  ) {}

  /**
   * Upload a document for a user
   * @param userId - The user's ID
   * @param file - The uploaded file
   * @param sessionId - Optional session to associate the document with
   * @param description - Optional description of the document
   * @returns The created document metadata
   * @throws BadRequestException if file validation fails
   */
  async upload(
    userId: string,
    file: Express.Multer.File,
    sessionId?: string,
    description?: string,
  ): Promise<DocumentResponseDto> {
    this.validateFile(file);

    const fileId = uuid();
    const ext = this.getFileExtension(file.originalname);
    const filename = `${fileId}.${ext}`;
    const storagePath = `${userId}/${filename}`;

    // Upload to storage
    try {
      await this.storage.upload(storagePath, file.buffer, file.mimetype, CHAT_DOCUMENTS_BUCKET);
    } catch (error) {
      this.logger.error(`Failed to upload file to storage: ${storagePath}`, error);
      throw new BadRequestException('Failed to upload file to storage');
    }

    // Save metadata to database
    try {
      const [document] = await this.db
        .insert(schema.documents)
        .values({
          id: fileId,
          userId,
          sessionId: sessionId ?? null,
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          storagePath,
          description: description ?? null,
        })
        .returning();

      this.logger.log(`Document uploaded: ${document.id} (${file.originalname})`);
      return this.toResponse(document);
    } catch (error) {
      // Cleanup storage on database failure
      await this.storage.delete(storagePath, CHAT_DOCUMENTS_BUCKET).catch(() => {});
      this.logger.error(`Failed to save document metadata: ${fileId}`, error);
      throw new BadRequestException('Failed to save document');
    }
  }

  /**
   * Find all documents for a user, optionally filtered by session
   * @param userId - The user's ID
   * @param sessionId - Optional session ID to filter by
   * @returns Array of document metadata
   */
  async findByUser(userId: string, sessionId?: string): Promise<DocumentResponseDto[]> {
    const whereClause = sessionId
      ? and(eq(schema.documents.userId, userId), eq(schema.documents.sessionId, sessionId))
      : eq(schema.documents.userId, userId);

    const documents = await this.db
      .select()
      .from(schema.documents)
      .where(whereClause)
      .orderBy(desc(schema.documents.createdAt));

    return documents.map(d => this.toResponse(d));
  }

  /**
   * Find a document by ID, ensuring user ownership
   * @param id - The document ID
   * @param userId - The user's ID (for ownership verification)
   * @returns Document metadata
   * @throws NotFoundException if document doesn't exist or user doesn't own it
   */
  async findById(id: string, userId: string): Promise<DocumentResponseDto> {
    const [document] = await this.db
      .select()
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.toResponse(document);
  }

  /**
   * Get a signed URL for downloading a document
   * @param id - The document ID
   * @param userId - The user's ID (for ownership verification)
   * @returns Signed URL and expiration time
   */
  async getSignedUrl(id: string, userId: string): Promise<DocumentUrlResponseDto> {
    const document = await this.findById(id, userId);

    try {
      const { signedUrl, expiresAt } = await this.storage.getSignedUrl(
        document.storagePath,
        SIGNED_URL_EXPIRY,
        CHAT_DOCUMENTS_BUCKET,
      );
      return { url: signedUrl, expiresAt };
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for document: ${id}`, error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  /**
   * Get the raw content of a document
   * @param id - The document ID
   * @param userId - The user's ID (for ownership verification)
   * @returns Document content, MIME type, and filename
   */
  async getContent(
    id: string, 
    userId: string
  ): Promise<{ content: Buffer; mimeType: string; filename: string }> {
    const document = await this.findById(id, userId);

    try {
      const content = await this.storage.download(document.storagePath, CHAT_DOCUMENTS_BUCKET);
      return {
        content,
        mimeType: document.mimeType,
        filename: document.originalName,
      };
    } catch (error) {
      this.logger.error(`Failed to download document content: ${id}`, error);
      throw new BadRequestException('Failed to retrieve document content');
    }
  }

  /**
   * Delete a document and its storage file
   * @param id - The document ID
   * @param userId - The user's ID (for ownership verification)
   */
  async delete(id: string, userId: string): Promise<void> {
    const document = await this.findById(id, userId);

    // Delete from storage (best effort - don't fail if storage delete fails)
    try {
      await this.storage.delete(document.storagePath, CHAT_DOCUMENTS_BUCKET);
    } catch (error) {
      this.logger.warn(`Failed to delete file from storage: ${document.storagePath}`, error);
    }

    // Delete from database
    await this.db
      .delete(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)));

    this.logger.log(`Document deleted: ${id}`);
  }

  /**
   * Extract text content from a document for use in chat context.
   * 
   * @param id - The document ID
   * @param userId - The user's ID (for ownership verification)
   * @returns Extracted text content or placeholder
   */
  async extractTextContent(id: string, userId: string): Promise<string> {
    const document = await this.findById(id, userId);
    const { content, mimeType } = await this.getContent(id, userId);

    // Text files - return content directly
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return content.toString('utf-8');
    }

    // PDF files - extract text using pdf-parse
    if (mimeType === 'application/pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: content });
        const result = await parser.getText();
        const text = result.text;
        await parser.destroy();

        if (!text || text.trim().length < 10) {
          return `[PDF Document: ${document.originalName}]\n\nNote: Could not extract text. The PDF may contain only images or scans.`;
        }

        this.logger.log(`PDF extracted: ${document.originalName} (${result.total} pages, ${text.length} chars)`);
        return text;
      } catch (error) {
        this.logger.warn(`PDF extraction failed for ${document.originalName}:`, error);
        return `[PDF Document: ${document.originalName}]\n\nNote: PDF text extraction failed. The document may be corrupted or password-protected.`;
      }
    }

    // Word documents - placeholder
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return `[Word Document: ${document.originalName}]\n\nNote: Word document text extraction is not yet implemented.`;
    }

    // Images - return description if available
    if (mimeType.startsWith('image/')) {
      const desc = document.description ? `\nDescription: ${document.description}` : '';
      return `[Image: ${document.originalName}]${desc}`;
    }

    return `[Document: ${document.originalName}]`;
  }

  // Private helper methods

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      const maxMB = MAX_FILE_SIZE / 1024 / 1024;
      throw new BadRequestException(`File size exceeds maximum of ${maxMB}MB`);
    }

    // Check MIME type first
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      return; // Valid MIME type
    }

    // Fallback: check file extension for common cases where browser sends wrong MIME type
    const ext = this.getFileExtension(file.originalname).toLowerCase();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp'];
    
    if (allowedExtensions.includes(ext)) {
      return; // Valid extension
    }

    throw new BadRequestException(
      `File type "${file.mimetype}" is not allowed. Supported types: PDF, DOC, DOCX, TXT, MD, PNG, JPG, WebP`
    );
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin';
  }

  private toResponse(document: schema.Document): DocumentResponseDto {
    return {
      id: document.id,
      userId: document.userId,
      sessionId: document.sessionId ?? undefined,
      filename: document.filename,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      storagePath: document.storagePath,
      description: document.description ?? undefined,
      createdAt: document.createdAt,
    };
  }
}
