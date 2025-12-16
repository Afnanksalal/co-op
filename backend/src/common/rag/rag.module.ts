import { Module, forwardRef } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagCacheService } from './rag-cache.service';
import { ClaraRagService } from './clara-rag.service';
import { CircuitBreakerModule } from '@/common/circuit-breaker/circuit-breaker.module';
import { LlmModule } from '@/common/llm/llm.module';

/**
 * RAG Module
 * 
 * Provides RAG (Retrieval-Augmented Generation) services including:
 * - RagService: Core RAG query and document management
 * - RagCacheService: Query result caching
 * - ClaraRagService: Apple CLaRA-7B-Instruct for intelligent context processing
 * 
 * CLaRA provides:
 * - 16×/128× semantic document compression
 * - Query-aware context extraction
 * - Document analysis and classification
 * - Relevance scoring for RAG chunks
 */
@Module({
  imports: [
    CircuitBreakerModule,
    forwardRef(() => LlmModule),
  ],
  providers: [RagService, RagCacheService, ClaraRagService],
  exports: [RagService, RagCacheService, ClaraRagService],
})
export class RagModule {}
