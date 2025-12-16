import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HuggingFaceProvider } from '@/common/llm/providers/huggingface.provider';
import {
  ChatMessage,
  getRagSpecialistModel,
  ModelConfig,
} from '@/common/llm/types/llm.types';

/**
 * CLaRA RAG Specialist Service
 *
 * Uses Apple's CLaRA-7B-Instruct model for intelligent RAG processing.
 * CLaRA has 16×/128× semantic document compression and is instruction-tuned
 * for QA from compressed document representations.
 *
 * This service does NOT participate in council critique - it's specifically
 * for RAG context processing, document understanding, and preparing context
 * for the council models.
 *
 * Key capabilities:
 * - Semantic document compression
 * - Context relevance scoring
 * - Multi-document synthesis
 * - Query-aware context extraction
 */
@Injectable()
export class ClaraRagService implements OnModuleInit {
  private readonly logger = new Logger(ClaraRagService.name);
  private claraModel: ModelConfig | undefined;
  private isAvailable = false;

  constructor(private readonly huggingFaceProvider: HuggingFaceProvider) {}

  async onModuleInit(): Promise<void> {
    this.claraModel = getRagSpecialistModel();

    if (!this.claraModel) {
      this.logger.warn('CLaRA model not configured in AVAILABLE_MODELS');
      return;
    }

    if (!this.huggingFaceProvider.isAvailable()) {
      this.logger.warn('HuggingFace provider not available - CLaRA disabled');
      return;
    }

    // Test CLaRA availability
    try {
      await this.huggingFaceProvider.chat(
        [{ role: 'user', content: 'Reply with: OK' }],
        { model: this.claraModel.model, maxTokens: 10, temperature: 0 },
      );
      this.isAvailable = true;
      this.logger.log('CLaRA RAG Specialist initialized successfully');
    } catch (error) {
      this.logger.warn('CLaRA model not available - falling back to standard RAG', error);
      this.isAvailable = false;
    }
  }

  /**
   * Check if CLaRA is available for RAG processing
   */
  isReady(): boolean {
    return this.isAvailable && !!this.claraModel;
  }


  /**
   * Process and compress RAG context using CLaRA's semantic compression.
   * Extracts the most relevant information for the given query.
   *
   * @param rawContext - Raw context from RAG vector search
   * @param query - User's original query
   * @param domain - legal or finance
   * @returns Compressed, query-focused context
   */
  async compressContext(
    rawContext: string,
    query: string,
    domain: string,
  ): Promise<string> {
    if (!this.isReady() || !rawContext.trim()) {
      return rawContext;
    }

    const systemPrompt = `You are CLaRA, a specialized RAG context processor. Your task is to compress and focus document context for downstream AI models.

INSTRUCTIONS:
- Extract ONLY information directly relevant to the query
- Preserve key facts, numbers, dates, and legal/financial terms
- Remove redundant or tangential information
- Maintain source attribution markers [1], [2], etc.
- Output should be 30-50% of input length while retaining all critical information
- For ${domain} domain, prioritize regulatory requirements, compliance details, and actionable guidance

OUTPUT FORMAT:
- Plain text, no markdown
- Preserve numbered source references
- Group related information together`;

    const userPrompt = `QUERY: ${query}

RAW CONTEXT:
${rawContext}

Compress this context to focus on information relevant to the query. Preserve source markers.`;

    try {
      const result = await this.huggingFaceProvider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: this.claraModel!.model,
          temperature: 0.1,
          maxTokens: 2000,
        },
      );

      this.logger.debug(`CLaRA compressed context: ${rawContext.length} → ${result.content.length} chars`);
      return result.content;
    } catch (error) {
      this.logger.warn('CLaRA compression failed, using raw context', error);
      return rawContext;
    }
  }

  /**
   * Analyze document content and extract structured information.
   * Used for user-uploaded documents to understand their content.
   *
   * @param documentContent - Raw document text
   * @param filename - Original filename for context
   * @param mimeType - Document MIME type
   * @returns Structured document analysis
   */
  async analyzeDocument(
    documentContent: string,
    filename: string,
    mimeType: string,
  ): Promise<DocumentAnalysis> {
    if (!this.isReady()) {
      return this.fallbackAnalysis(documentContent, filename);
    }

    const systemPrompt = `You are CLaRA, a document analysis specialist. Analyze the provided document and extract structured information.

OUTPUT JSON FORMAT:
{
  "summary": "2-3 sentence summary of the document",
  "documentType": "contract|report|guide|policy|correspondence|other",
  "domain": "legal|finance|general",
  "keyEntities": ["company names", "people", "products"],
  "keyTopics": ["main topics covered"],
  "keyDates": ["any important dates mentioned"],
  "keyNumbers": ["important figures, amounts, percentages"],
  "relevantFor": ["fintech", "greentech", "healthtech", "saas", "ecommerce", "general"],
  "confidenceScore": 0.0-1.0
}

Be precise and factual. Only include information explicitly present in the document.`;

    const userPrompt = `FILENAME: ${filename}
MIME TYPE: ${mimeType}

DOCUMENT CONTENT:
${documentContent.slice(0, 8000)}

Analyze this document and output JSON only.`;

    try {
      const result = await this.huggingFaceProvider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: this.claraModel!.model,
          temperature: 0.1,
          maxTokens: 800,
        },
      );

      return this.parseDocumentAnalysis(result.content, filename);
    } catch (error) {
      this.logger.warn('CLaRA document analysis failed', error);
      return this.fallbackAnalysis(documentContent, filename);
    }
  }

  /**
   * Score relevance of multiple RAG chunks for a query.
   * Helps prioritize which chunks to include in context.
   *
   * @param chunks - Array of text chunks with metadata
   * @param query - User's query
   * @returns Chunks sorted by relevance with scores
   */
  async scoreChunkRelevance(
    chunks: ChunkWithMeta[],
    query: string,
  ): Promise<ScoredChunk[]> {
    if (!this.isReady() || chunks.length === 0) {
      return chunks.map((c, i) => ({ ...c, relevanceScore: 1 - i * 0.1 }));
    }

    const systemPrompt = `You are CLaRA, a relevance scoring specialist. Score each document chunk's relevance to the query.

OUTPUT FORMAT (JSON array):
[{"index": 0, "score": 0.95, "reason": "directly answers query"}, ...]

Scoring criteria:
- 0.9-1.0: Directly answers the query
- 0.7-0.9: Highly relevant supporting information
- 0.5-0.7: Somewhat relevant context
- 0.3-0.5: Tangentially related
- 0.0-0.3: Not relevant

Be strict - only high scores for truly relevant content.`;

    const chunksText = chunks
      .map((c, i) => `[${i}] ${c.text.slice(0, 500)}`)
      .join('\n\n');

    const userPrompt = `QUERY: ${query}

CHUNKS:
${chunksText}

Score each chunk's relevance. Output JSON array only.`;

    try {
      const result = await this.huggingFaceProvider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          model: this.claraModel!.model,
          temperature: 0.1,
          maxTokens: 500,
        },
      );

      const scores = this.parseRelevanceScores(result.content, chunks.length);
      return chunks
        .map((chunk, i) => ({
          ...chunk,
          relevanceScore: scores[i] ?? 0.5,
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      this.logger.warn('CLaRA relevance scoring failed', error);
      return chunks.map((c, i) => ({ ...c, relevanceScore: 1 - i * 0.1 }));
    }
  }


  /**
   * Prepare optimized context for council models.
   * Combines compression, relevance scoring, and formatting.
   *
   * @param rawContext - Raw RAG context
   * @param query - User's query
   * @param domain - legal or finance
   * @param sources - Source metadata
   * @returns Optimized context ready for council
   */
  async prepareCouncilContext(
    rawContext: string,
    query: string,
    domain: string,
    sources: SourceMeta[],
  ): Promise<CouncilContext> {
    const startTime = Date.now();

    // If CLaRA not available, return formatted raw context
    if (!this.isReady()) {
      return {
        context: rawContext,
        sources,
        compressed: false,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Compress context using CLaRA
    const compressedContext = await this.compressContext(rawContext, query, domain);

    // Generate context summary for council
    const summary = await this.generateContextSummary(compressedContext, query);

    const formattedContext = `--- RAG Context (Processed by CLaRA) ---
Domain: ${domain}
Query Focus: ${query.slice(0, 100)}

${summary ? `SUMMARY: ${summary}\n\n` : ''}RELEVANT CONTEXT:
${compressedContext}

Sources: ${sources.map((s, i) => `[${i + 1}] ${s.filename}`).join(', ')}
--- End RAG Context ---`;

    return {
      context: formattedContext,
      sources,
      compressed: true,
      compressionRatio: rawContext.length / compressedContext.length,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate a brief summary of the context for quick understanding.
   */
  private async generateContextSummary(
    context: string,
    query: string,
  ): Promise<string | null> {
    if (!this.isReady() || context.length < 500) {
      return null;
    }

    try {
      const result = await this.huggingFaceProvider.chat(
        [
          {
            role: 'system',
            content: 'Summarize the key points relevant to the query in 1-2 sentences. Be factual and concise.',
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nContext:\n${context.slice(0, 3000)}`,
          },
        ],
        {
          model: this.claraModel!.model,
          temperature: 0.1,
          maxTokens: 150,
        },
      );

      return result.content.trim();
    } catch {
      return null;
    }
  }

  // Helper methods

  private parseDocumentAnalysis(content: string, filename: string): DocumentAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = /\{[\s\S]*\}/.exec(content);
      if (!jsonMatch) {
        return this.fallbackAnalysis('', filename);
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<DocumentAnalysis>;
      return {
        summary: parsed.summary ?? 'Document analysis unavailable',
        documentType: parsed.documentType ?? 'other',
        domain: parsed.domain ?? 'general',
        keyEntities: parsed.keyEntities ?? [],
        keyTopics: parsed.keyTopics ?? [],
        keyDates: parsed.keyDates ?? [],
        keyNumbers: parsed.keyNumbers ?? [],
        relevantFor: parsed.relevantFor ?? ['general'],
        confidenceScore: parsed.confidenceScore ?? 0.5,
      };
    } catch {
      return this.fallbackAnalysis('', filename);
    }
  }

  private fallbackAnalysis(content: string, filename: string): DocumentAnalysis {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const isLegal = /contract|agreement|terms|legal|compliance/i.test(filename);
    const isFinance = /financial|budget|forecast|revenue|invoice/i.test(filename);

    return {
      summary: `Document: ${filename}`,
      documentType: 'other',
      domain: isLegal ? 'legal' : isFinance ? 'finance' : 'general',
      keyEntities: [],
      keyTopics: [],
      keyDates: [],
      keyNumbers: [],
      relevantFor: ['general'],
      confidenceScore: 0.3,
    };
  }

  private parseRelevanceScores(content: string, chunkCount: number): number[] {
    try {
      const jsonMatch = /\[[\s\S]*\]/.exec(content);
      if (!jsonMatch) {
        return Array(chunkCount).fill(0.5);
      }

      const parsed = JSON.parse(jsonMatch[0]) as { index: number; score: number }[];
      const scores = Array(chunkCount).fill(0.5);

      for (const item of parsed) {
        if (typeof item.index === 'number' && typeof item.score === 'number') {
          scores[item.index] = Math.max(0, Math.min(1, item.score));
        }
      }

      return scores;
    } catch {
      return Array(chunkCount).fill(0.5);
    }
  }
}

// Types

export interface DocumentAnalysis {
  summary: string;
  documentType: 'contract' | 'report' | 'guide' | 'policy' | 'correspondence' | 'other';
  domain: 'legal' | 'finance' | 'general';
  keyEntities: string[];
  keyTopics: string[];
  keyDates: string[];
  keyNumbers: string[];
  relevantFor: string[];
  confidenceScore: number;
}

export interface ChunkWithMeta {
  text: string;
  fileId: string;
  filename: string;
  chunkIndex: number;
}

export interface ScoredChunk extends ChunkWithMeta {
  relevanceScore: number;
}

export interface SourceMeta {
  fileId: string;
  filename: string;
  score: number;
  domain: string;
  sector: string;
}

export interface CouncilContext {
  context: string;
  sources: SourceMeta[];
  compressed: boolean;
  compressionRatio?: number;
  processingTimeMs: number;
}
