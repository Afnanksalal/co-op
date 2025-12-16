import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { RagModule } from '@/common/rag/rag.module';

/**
 * Documents Module
 * 
 * Handles user-uploaded documents with:
 * - Supabase Storage for file storage
 * - CLaRA-powered document analysis (when available)
 * - Text extraction for chat context
 */
@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    RagModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
