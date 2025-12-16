import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagCacheService } from './rag-cache.service';
import { CircuitBreakerModule } from '@/common/circuit-breaker/circuit-breaker.module';

/**
 * RAG Module - Retrieval-Augmented Generation services
 */
@Module({
  imports: [CircuitBreakerModule],
  providers: [RagService, RagCacheService],
  exports: [RagService, RagCacheService],
})
export class RagModule {}
