import { Module, Global } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { LlmRouterService } from '@/common/llm/llm-router.service';
import { GroqProvider } from '@/common/llm/providers/groq.provider';
import { GoogleProvider } from '@/common/llm/providers/google.provider';
import { HuggingFaceProvider } from '@/common/llm/providers/huggingface.provider';

@Global()
@Module({
  controllers: [InsightsController],
  providers: [
    InsightsService,
    LlmRouterService,
    GroqProvider,
    GoogleProvider,
    HuggingFaceProvider,
  ],
  exports: [InsightsService],
})
export class InsightsModule {}
