import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagCacheService } from './rag-cache.service';
import { CircuitBreakerModule } from '@/common/circuit-breaker/circuit-breaker.module';

@Module({
  imports: [CircuitBreakerModule],
  providers: [RagService, RagCacheService],
  exports: [RagService, RagCacheService],
})
export class RagModule {}
