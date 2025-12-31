import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { SupabaseStorageService } from '@/common/supabase/supabase-storage.service';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { RagService } from '@/common/rag/rag.service';
import * as schema from '@/database/schema';
import { pitchDecks, PitchDeckAnalysis, SlideAnalysis, InvestorType } from '@/database/schema/pitch-decks.schema';
import { startups } from '@/database/schema/startups.schema';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

interface AnalysisContext {
  sector: string;
  stage: string;
  fundingStage: string | null;
  country: string;
}

@Injectable()
export class PitchDeckService {
  private readonly logger = new Logger(PitchDeckService.name);
  private readonly storageBucket: string;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
    private readonly storage: SupabaseStorageService,
    private readonly llmCouncil: LlmCouncilService,
    private readonly ragService: RagService,
  ) {
    this.storageBucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET', 'documents');
  }

  /**
   * Upload and analyze a pitch deck
   */
  async uploadAndAnalyze(
    userId: string,
    startupId: string | null,
    file: Express.Multer.File,
    investorType?: InvestorType,
    targetRaise?: string,
  ): Promise<{ id: string; status: string }> {
    this.validateFile(file);

    const deckId = uuid();
    const storagePath = `pitch-decks/${userId}/${deckId}.pdf`;

    // Upload to storage
    const uploadResult = await this.storage.upload(
      storagePath,
      file.buffer,
      file.mimetype,
      this.storageBucket,
    );

    if (!uploadResult.path) {
      throw new BadRequestException('Failed to upload file');
    }

    // Create record
    await this.db.insert(pitchDecks).values({
      id: deckId,
      userId,
      startupId,
      filename: `${deckId}.pdf`,
      originalName: file.originalname,
      storagePath,
      fileSize: file.size,
      status: 'pending',
      investorType,
      targetRaise,
    });

    // Start async analysis (non-blocking)
    this.analyzeAsync(deckId, userId, startupId, file.buffer).catch((err) => {
      this.logger.error(`Async analysis failed for ${deckId}`, err);
    });

    return { id: deckId, status: 'pending' };
  }

  /**
   * Async analysis pipeline
   */
  private async analyzeAsync(
    deckId: string,
    _userId: string, // Reserved for future audit logging
    startupId: string | null,
    buffer: Buffer,
  ): Promise<void> {
    try {
      // Update status
      await this.db
        .update(pitchDecks)
        .set({ status: 'analyzing', updatedAt: new Date() })
        .where(eq(pitchDecks.id, deckId));

      // Extract text from PDF
      const { text, pageCount } = await this.extractPdfText(buffer);

      // Get startup context for better analysis
      const context = await this.getStartupContext(startupId);

      // Get RAG context for sector benchmarks
      const ragContext = context?.sector
        ? await this.ragService.getContext(
            'pitch deck best practices investor expectations',
            'finance',
            context.sector as schema.RagSector,
            context.country,
          )
        : '';

      // Analyze with LLM Council
      const analysis = await this.performAnalysis(text, context, ragContext);

      // Extract slide summaries
      const slideSummaries = await this.extractSlideSummaries(text, pageCount);

      // Update record with results
      await this.db
        .update(pitchDecks)
        .set({
          status: 'completed',
          pageCount,
          extractedText: text,
          analysis,
          slideSummaries,
          analyzedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pitchDecks.id, deckId));

      this.logger.log(`Pitch deck analysis completed: ${deckId}`);
    } catch (error) {
      this.logger.error(`Analysis failed for ${deckId}`, error);
      await this.db
        .update(pitchDecks)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(pitchDecks.id, deckId));
    }
  }

  /**
   * Perform comprehensive pitch deck analysis using LLM Council
   */
  private async performAnalysis(
    text: string,
    context: AnalysisContext | null,
    ragContext: string,
  ): Promise<PitchDeckAnalysis> {
    const contextInfo = context
      ? `\nStartup Context: ${context.sector} sector, ${context.stage} stage, ${context.fundingStage || 'unknown'} funding, based in ${context.country}`
      : '';

    const prompt = `You are an expert pitch deck analyst who has reviewed thousands of successful startup pitch decks.

Analyze this pitch deck text and provide a comprehensive evaluation.

${ragContext}
${contextInfo}

PITCH DECK CONTENT:
${text.slice(0, 15000)}

Provide your analysis in the following JSON format:
{
  "overallScore": <0-100>,
  "sections": {
    "problem": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "solution": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "market": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "product": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "businessModel": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "traction": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "competition": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "team": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "financials": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] },
    "ask": { "present": <boolean>, "score": <0-100>, "feedback": "<string>", "suggestions": ["<string>"] }
  },
  "strengths": ["<top 3-5 strengths>"],
  "weaknesses": ["<top 3-5 weaknesses>"],
  "suggestions": ["<top 5 actionable improvements>"],
  "investorFit": {
    "vc": <0-100 fit score for VCs>,
    "angel": <0-100 fit score for angels>,
    "corporate": <0-100 fit score for corporate investors>
  },
  "sectorBenchmark": {
    "percentile": <estimated percentile vs similar decks>,
    "avgScore": <typical score for this sector>,
    "topDecksScore": <score of top 10% decks>
  }
}

Be specific, actionable, and honest in your feedback. Focus on what investors actually look for.`;

    const result = await this.llmCouncil.runCouncil(
      'You are an expert pitch deck analyst who has reviewed thousands of successful startup pitch decks.',
      prompt,
      {
        maxTokens: 4000,
        temperature: 0.3,
      },
    );

    try {
      // Extract JSON from response
      const jsonMatch = result.finalResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as PitchDeckAnalysis;
    } catch {
      this.logger.warn('Failed to parse analysis JSON, using defaults');
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Extract slide summaries from text
   */
  private async extractSlideSummaries(text: string, pageCount: number): Promise<SlideAnalysis[]> {
    const prompt = `Analyze this pitch deck text and identify the key slides/sections.

TEXT:
${text.slice(0, 10000)}

For each identifiable slide/section, provide:
{
  "slides": [
    {
      "slideNumber": <number>,
      "title": "<slide title>",
      "content": "<brief summary>",
      "type": "<problem|solution|market|product|traction|team|financials|ask|other>",
      "score": <0-100>,
      "feedback": "<specific feedback>"
    }
  ]
}

Identify up to ${Math.min(pageCount, 15)} slides.`;

    const result = await this.llmCouncil.runCouncil(
      'You are an expert pitch deck analyst.',
      prompt,
      {
        maxTokens: 2000,
        temperature: 0.2,
      },
    );

    try {
      const jsonMatch = result.finalResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.slides || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate investor-specific version recommendations
   */
  async generateInvestorVersion(
    deckId: string,
    userId: string,
    investorType: InvestorType,
  ): Promise<{
    suggestions: string[];
    emphasize: string[];
    deemphasize: string[];
    recommendedOrder: string[];
    fitScore: number;
  }> {
    const deck = await this.findOne(deckId, userId);
    if (!deck.analysis || deck.status !== 'completed') {
      throw new BadRequestException('Deck analysis not completed');
    }

    const investorProfiles = {
      vc: 'VCs focus on: massive market opportunity (TAM $1B+), scalability, strong team with relevant experience, clear path to 10x+ returns, competitive moats, and rapid growth metrics.',
      angel: 'Angel investors focus on: founder passion and commitment, early traction, capital efficiency, personal connection to the problem, and reasonable valuations.',
      corporate: 'Corporate investors focus on: strategic fit with their business, technology/IP value, partnership potential, market validation, and lower risk profiles.',
    };

    const prompt = `Based on this pitch deck analysis, provide specific recommendations for tailoring it to ${investorType.toUpperCase()} investors.

CURRENT ANALYSIS:
${JSON.stringify(deck.analysis, null, 2)}

INVESTOR PROFILE:
${investorProfiles[investorType]}

Provide recommendations in JSON format:
{
  "suggestions": ["<5 specific changes to make>"],
  "emphasize": ["<sections/points to highlight more>"],
  "deemphasize": ["<sections/points to reduce focus on>"],
  "recommendedOrder": ["<optimal slide order for this investor type>"],
  "fitScore": <0-100 fit score>
}`;

    const result = await this.llmCouncil.runCouncil(
      'You are an expert pitch deck analyst.',
      prompt,
      {
        maxTokens: 1500,
        temperature: 0.3,
      },
    );

    try {
      const jsonMatch = result.finalResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      return JSON.parse(jsonMatch[0]);
    } catch {
      const analysis = deck.analysis as PitchDeckAnalysis | null;
      return {
        suggestions: ['Unable to generate specific recommendations'],
        emphasize: [],
        deemphasize: [],
        recommendedOrder: [],
        fitScore: analysis?.investorFit?.[investorType] || 50,
      };
    }
  }

  /**
   * Get sector benchmark comparison
   */
  async getSectorBenchmark(
    deckId: string,
    userId: string,
    sector: string,
  ): Promise<{
    sector: string;
    yourScore: number;
    sectorAverage: number;
    topDecksScore: number;
    percentile: number;
    aboveAverage: string[];
    belowAverage: string[];
  }> {
    const deck = await this.findOne(deckId, userId);
    if (!deck.analysis || deck.status !== 'completed') {
      throw new BadRequestException('Deck analysis not completed');
    }

    // Get RAG context for sector benchmarks
    const ragContext = await this.ragService.getContext(
      `${sector} startup pitch deck benchmarks investor expectations metrics`,
      'finance',
      sector as schema.RagSector,
    );

    const prompt = `Compare this pitch deck against typical ${sector} sector standards.

DECK ANALYSIS:
${JSON.stringify(deck.analysis, null, 2)}

SECTOR CONTEXT:
${ragContext}

Provide benchmark comparison in JSON:
{
  "sectorAverage": <typical score for ${sector} decks>,
  "topDecksScore": <score of top 10% ${sector} decks>,
  "percentile": <this deck's percentile ranking>,
  "aboveAverage": ["<sections where this deck beats average>"],
  "belowAverage": ["<sections where this deck is below average>"]
}`;

    const result = await this.llmCouncil.runCouncil(
      'You are an expert pitch deck analyst.',
      prompt,
      {
        maxTokens: 1000,
        temperature: 0.3,
      },
    );

    try {
      const jsonMatch = result.finalResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const analysis = deck.analysis as PitchDeckAnalysis | null;
      return {
        sector,
        yourScore: analysis?.overallScore || 0,
        ...parsed,
      };
    } catch {
      const analysis = deck.analysis as PitchDeckAnalysis | null;
      return {
        sector,
        yourScore: analysis?.overallScore || 0,
        sectorAverage: 65,
        topDecksScore: 85,
        percentile: 50,
        aboveAverage: [],
        belowAverage: [],
      };
    }
  }

  /**
   * Get all pitch decks for a user
   */
  async findAll(userId: string): Promise<typeof pitchDecks.$inferSelect[]> {
    return this.db
      .select()
      .from(pitchDecks)
      .where(eq(pitchDecks.userId, userId))
      .orderBy(desc(pitchDecks.createdAt));
  }

  /**
   * Get a single pitch deck
   */
  async findOne(deckId: string, userId: string): Promise<typeof pitchDecks.$inferSelect> {
    const [deck] = await this.db
      .select()
      .from(pitchDecks)
      .where(and(eq(pitchDecks.id, deckId), eq(pitchDecks.userId, userId)))
      .limit(1);

    if (!deck) {
      throw new NotFoundException('Pitch deck not found');
    }

    return deck;
  }

  /**
   * Delete a pitch deck
   */
  async delete(deckId: string, userId: string): Promise<void> {
    const deck = await this.findOne(deckId, userId);

    // Delete from storage
    await this.storage.delete(deck.storagePath, this.storageBucket);

    // Delete from database
    await this.db.delete(pitchDecks).where(eq(pitchDecks.id, deckId));

    this.logger.log(`Pitch deck deleted: ${deckId}`);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF files are supported');
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = result.text;
      const pageCount = result.total;
      await parser.destroy();

      if (!text || text.trim().length < 100) {
        throw new BadRequestException('Could not extract text from PDF. It may be image-based or empty.');
      }

      return { text, pageCount };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to process PDF file');
    }
  }

  private async getStartupContext(startupId: string | null): Promise<AnalysisContext | null> {
    if (!startupId) return null;

    const [startup] = await this.db
      .select({
        sector: startups.sector,
        stage: startups.stage,
        fundingStage: startups.fundingStage,
        country: startups.country,
      })
      .from(startups)
      .where(eq(startups.id, startupId))
      .limit(1);

    return startup || null;
  }

  private getDefaultAnalysis(): PitchDeckAnalysis {
    const defaultSection = { present: false, score: 0, feedback: 'Unable to analyze', suggestions: [] };
    return {
      overallScore: 0,
      sections: {
        problem: defaultSection,
        solution: defaultSection,
        market: defaultSection,
        product: defaultSection,
        businessModel: defaultSection,
        traction: defaultSection,
        competition: defaultSection,
        team: defaultSection,
        financials: defaultSection,
        ask: defaultSection,
      },
      strengths: [],
      weaknesses: ['Analysis failed'],
      suggestions: ['Please try uploading again'],
      investorFit: { vc: 0, angel: 0, corporate: 0 },
      sectorBenchmark: { percentile: 0, avgScore: 0, topDecksScore: 0 },
      slideAnalysis: [],
    };
  }
}
