import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SecureDocumentsController } from './secure-documents.controller';
import { SecureDocumentsService } from './secure-documents.service';
import { DatabaseModule } from '@/database/database.module';
import { EncryptionService } from '@/common/encryption/encryption.service';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [SecureDocumentsController],
  providers: [SecureDocumentsService, EncryptionService],
  exports: [SecureDocumentsService],
})
export class SecureDocumentsModule {}
