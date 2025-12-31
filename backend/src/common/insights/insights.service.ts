import { Injectable, Logger } from '@nestjs/common';
import { LlmRouterService } from '@/common/llm/llm-router.service';
import { sanitizeResponse } from '@/common/llm/utils/response-sanitizer';

export interface InsightContext {
  toolName: string;
  data: Record<string, unknown>;
  userContext?: {
    companyName?: string;
    industry?: string;
    stage?: string;
    country?: string;
  };
}

export interface InsightResult {
  insights: Array<{
    type: 'tip' | 'warning' | 'action' | 'success';
    message: string;
  }>;
  generatedAt: string;
}

const INSIGHT_SYSTEM_PROMPT = `You are an AI advisor for startup founders. Generate 2-4 brief, actionable insights based on the provided data.

OUTPUT FORMAT (JSON only):
{
  "insights": [
    { "type": "tip|warning|action|success", "message": "Brief insight (max 100 chars)" }
  ]
}

RULES:
- tip: General advice or best practice
- warning: Potential risk or concern
- action: Specific action the user should take
- success: Positive observation or achievement
- Be specific to the data provided
- Keep messages concise and actionable
- Maximum 4 insights
- Return ONLY valid JSON, no markdown`;

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private readonly llmRouter: LlmRouterService) {}

  async generateInsights(context: InsightContext): Promise<InsightResult> {
    const prompt = this.buildPrompt(context);

    try {
      const result = await this.llmRouter.chatForPhase('draft', [
        { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ], {
        temperature: 0.7,
        maxTokens: 400,
      });

      const parsed = this.parseInsights(result.content);
      return {
        insights: parsed,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate insights', error);
      return {
        insights: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private buildPrompt(context: InsightContext): string {
    const parts: string[] = [];

    parts.push(`Tool: ${context.toolName}`);
    
    if (context.userContext) {
      const { companyName, industry, stage, country } = context.userContext;
      if (companyName) parts.push(`Company: ${companyName}`);
      if (industry) parts.push(`Industry: ${industry}`);
      if (stage) parts.push(`Stage: ${stage}`);
      if (country) parts.push(`Location: ${country}`);
    }

    parts.push(`\nData:\n${JSON.stringify(context.data, null, 2)}`);
    parts.push('\nGenerate insights based on this data:');

    return parts.join('\n');
  }

  private parseInsights(content: string): InsightResult['insights'] {
    try {
      // Clean up the response
      let cleaned = sanitizeResponse(content);
      
      // Try to extract JSON from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);
      
      if (Array.isArray(parsed.insights)) {
        return parsed.insights
          .filter((i: unknown) => 
            typeof i === 'object' && 
            i !== null &&
            'type' in i && 
            'message' in i
          )
          .map((i: { type: string; message: string }) => ({
            type: ['tip', 'warning', 'action', 'success'].includes(i.type) 
              ? i.type as 'tip' | 'warning' | 'action' | 'success'
              : 'tip',
            message: String(i.message).slice(0, 150),
          }))
          .slice(0, 4);
      }
      
      return [];
    } catch {
      this.logger.warn('Failed to parse insights JSON, returning empty');
      return [];
    }
  }
}
