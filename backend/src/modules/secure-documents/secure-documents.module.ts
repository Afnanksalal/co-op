import { Module } from '@nestjs/common';
import { SecureDocumentsController } from './secure-documents.controller';
import { SecureDocumentsService } from './secure-documents.service';
import { DatabaseModule } from '@/database/database.module';
import { EncryptionService } from '@/common/encryption/encryption.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SecureDocumentsController],
  providers: [SecureDocumentsService, EncryptionService],
  exports: [SecureDocumentsService],
})
export class SecureDocumentsModule {}
