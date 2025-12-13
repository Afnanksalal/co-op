import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GroundingChunk,
} from '@google/generative-ai';
import {
  WebSearchResult,
  CompanyInfo,
  InvestorInfo,
  MarketData,
  ResearchContext,
  ResearchQuery,
  GroundedResponse,
} from './research.types';

const RESEARCH_MODEL = 'gemini-2.0-flash';

// Google Search tool type for grounded search (new API format)
interface GoogleSearchTool {
  googleSearch: Record<string, never>;
}

interface ScrapingBeeSearchResult {
  title: string;
  url: string;
  description: string;
}

interface ScrapingBeeResponse {
  organic_results?: ScrapingBeeSearchResult[];
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);
  private readonly client: GoogleGenerativeAI | null;
  private readonly model: GenerativeModel | null;
  private readonly googleSearchTool: GoogleSearchTool;
  private readonly scrapingBeeApiKey: string | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    this.scrapingBeeApiKey = this.configService.get<string>('SCRAPINGBEE_API_KEY') ?? null;

    if (!apiKey) {
      this.logger.warn('GOOGLE_AI_API_KEY not configured - Research service disabled');
      this.client = null;
      this.model = null;
      this.googleSearchTool = { googleSearch: {} };
    } else {
      this.client = new GoogleGenerativeAI(apiKey);
      // Use the new google_search tool (googleSearchRetrieval is deprecated)
      this.googleSearchTool = { googleSearch: {} };
      this.model = this.client.getGenerativeModel({
        model: RESEARCH_MODEL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [this.googleSearchTool as any],
      });
      this.logger.log('Research service initialized with Google Search grounding');
    }

    if (this.scrapingBeeApiKey) {
      this.logger.log('ScrapingBee fallback configured');
    }
  }

  isAvailable(): boolean {
    return this.model !== null || this.scrapingBeeApiKey !== null;
  }

  private isScrapingBeeFallbackAvailable(): boolean {
    return this.scrapingBeeApiKey !== null;
  }

  private async searchWithScrapingBee(query: string): Promise<WebSearchResult[]> {
    if (!this.scrapingBeeApiKey) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        api_key: this.scrapingBeeApiKey,
        search: query,
        nb_results: '10',
      });

      const response = await fetch(`https://app.scrapingbee.com/api/v1/store/google?${params.toString()}`);
      
      if (!response.ok) {
        this.logger.warn(`ScrapingBee request failed: ${String(response.status)}`);
        return [];
      }

      const data = (await response.json()) as ScrapingBeeResponse;
      const results: WebSearchResult[] = [];

      for (const result of data.organic_results ?? []) {
        results.push({
          title: result.title,
          url: result.url,
          snippet: result.description,
          source: this.extractDomain(result.url),
          publishedDate: '',
        });
      }

      this.logger.debug(`ScrapingBee returned ${String(results.length)} results for: ${query}`);
      return results;
    } catch (error) {
      this.logger.warn(`ScrapingBee fallback failed: ${String(error)}`);
      return [];
    }
  }

  async gatherCompetitorContext(
    companyName: string,
    industry: string,
    startupDescription: string,
  ): Promise<ResearchContext> {
    const context: ResearchContext = {
      webResults: [],
      companyInfo: null,
      investorInfo: [],
      marketData: null,
      sources: [],
    };

    if (!this.isAvailable()) {
      this.logger.warn('Research service not available - using LLM knowledge only');
      return context;
    }

    // Run parallel research queries with grounding
    const [competitorResults, companyResults, marketResults] = await Promise.all([
      this.searchWithGrounding({
        query: `${companyName} competitors in ${industry} market analysis 2024`,
        context: `Find direct and indirect competitors for a startup: ${startupDescription}`,
        type: 'competitor',
      }),
      this.searchWithGrounding({
        query: `${companyName} company profile funding investors`,
        context: `Get company information for ${companyName} in ${industry}`,
        type: 'company',
      }),
      this.searchWithGrounding({
        query: `${industry} market size trends growth forecast 2024 2025`,
        context: `Market analysis for ${industry} sector`,
        type: 'market',
      }),
    ]);

    // Parse and structure results
    context.webResults = this.extractWebResults(competitorResults);
    context.companyInfo = this.parseCompanyFromGrounded(companyResults, companyName, industry);
    context.marketData = this.parseMarketFromGrounded(marketResults, industry);
    context.sources = this.collectSources([competitorResults, companyResults, marketResults]);

    return context;
  }

  async gatherInvestorContext(
    startupName: string,
    industry: string,
    fundingStage: string,
    location: string,
  ): Promise<ResearchContext> {
    const context: ResearchContext = {
      webResults: [],
      companyInfo: null,
      investorInfo: [],
      marketData: null,
      sources: [],
    };

    if (!this.isAvailable()) {
      this.logger.warn('Research service not available - using LLM knowledge only');
      return context;
    }

    // Run parallel research queries with grounding
    const [investorResults, fundingResults, marketResults] = await Promise.all([
      this.searchWithGrounding({
        query: `${industry} ${fundingStage} investors venture capital ${location} 2024`,
        context: `Find investors for ${fundingStage} stage startups in ${industry}`,
        type: 'investor',
      }),
      this.searchWithGrounding({
        query: `${industry} startup funding rounds ${fundingStage} recent deals 2024`,
        context: `Recent funding activity in ${industry} for ${fundingStage} stage`,
        type: 'funding',
      }),
      this.searchWithGrounding({
        query: `${industry} market size investment trends ${location} 2024 2025`,
        context: `Investment landscape for ${industry} in ${location}`,
        type: 'market',
      }),
    ]);

    // Parse and structure results
    context.webResults = this.extractWebResults(investorResults);
    context.investorInfo = this.parseInvestorsFromGrounded(investorResults, industry, fundingStage);
    context.marketData = this.parseMarketFromGrounded(marketResults, industry);
    context.sources = this.collectSources([investorResults, fundingResults, marketResults]);

    return context;
  }

  async searchWeb(query: string): Promise<WebSearchResult[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const result = await this.searchWithGrounding({
        query,
        context: 'General web search',
        type: 'web',
      });
      return this.extractWebResults(result);
    } catch (error) {
      this.logger.warn(`Web search failed: ${String(error)}`);
      return [];
    }
  }

  async searchNews(query: string, days = 30): Promise<WebSearchResult[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      // Include time constraint in query for more relevant results
      const timeConstraint = days <= 7 ? 'past week' : days <= 30 ? 'past month' : `past ${String(days)} days`;
      const result = await this.searchWithGrounding({
        query: `${query} news ${timeConstraint}`,
        context: `Recent news search (last ${String(days)} days)`,
        type: 'news',
      });
      return this.extractWebResults(result);
    } catch (error) {
      this.logger.warn(`News search failed: ${String(error)}`);
      return [];
    }
  }

  formatContextForPrompt(context: ResearchContext): string {
    const parts: string[] = [];

    if (context.companyInfo) {
      parts.push(this.formatCompanyInfo(context.companyInfo));
    }

    if (context.investorInfo.length > 0) {
      parts.push(this.formatInvestorInfo(context.investorInfo));
    }

    if (context.marketData) {
      parts.push(this.formatMarketData(context.marketData));
    }

    if (context.webResults.length > 0) {
      parts.push(this.formatWebResults(context.webResults));
    }

    if (parts.length === 0) {
      return '';
    }

    return `\n\n--- Web Research Context ---\n${parts.join('\n\n')}\n--- End Research Context ---\n`;
  }

  private async searchWithGrounding(research: ResearchQuery): Promise<GroundedResponse> {
    // Try Gemini grounded search first
    if (this.model) {
      try {
        const prompt = this.buildResearchPrompt(research);
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Extract grounding metadata
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const groundingChunks = groundingMetadata?.groundingChunks ?? [];
        const sources = this.extractSourcesFromChunks(groundingChunks);

        return {
          content: text,
          sources,
          groundingChunks,
        };
      } catch (error) {
        this.logger.warn(`Gemini grounded search failed for ${research.type}: ${String(error)}`);
        // Fall through to SerpAPI fallback
      }
    }

    // Fallback to ScrapingBee if Gemini fails or unavailable
    if (this.isScrapingBeeFallbackAvailable()) {
      this.logger.debug(`Using ScrapingBee fallback for ${research.type}`);
      const scrapingBeeResults = await this.searchWithScrapingBee(research.query);
      
      if (scrapingBeeResults.length > 0) {
        // Convert ScrapingBee results to GroundedResponse format
        const groundingChunks: GroundingChunk[] = scrapingBeeResults.map(r => ({
          web: { uri: r.url, title: r.title },
        }));

        return {
          content: scrapingBeeResults.map(r => `${r.title}: ${r.snippet}`).join('\n\n'),
          sources: scrapingBeeResults.map(r => r.url),
          groundingChunks,
        };
      }
    }

    this.logger.warn(`All search methods failed for ${research.type}`);
    return { content: '', sources: [], groundingChunks: [] };
  }

  private buildResearchPrompt(research: ResearchQuery): string {
    const typeInstructions: Record<string, string> = {
      competitor: `Analyze competitors and competitive landscape. Include:
- Direct competitors (similar products/services)
- Indirect competitors (alternative solutions)
- Market positioning of each competitor
- Funding status and key investors
- Strengths and weaknesses`,
      company: `Provide company profile information. Include:
- Company description and mission
- Industry and market segment
- Founding date and headquarters
- Employee count estimate
- Funding history and investors
- Key products/services`,
      market: `Analyze market conditions. Include:
- Total addressable market (TAM) size
- Market growth rate and projections
- Key trends shaping the industry
- Major players and market share
- Opportunities and threats`,
      investor: `Find relevant investors. Include:
- Venture capital firms active in this space
- Angel investors and syndicates
- Recent investments in similar companies
- Typical check sizes and stages
- Investment thesis alignment`,
      funding: `Analyze recent funding activity. Include:
- Recent funding rounds in the sector
- Average deal sizes by stage
- Active investors in recent deals
- Funding trends and patterns`,
      web: `Provide relevant information from web search.`,
      news: `Summarize recent news and developments.`,
    };

    const instruction = typeInstructions[research.type] ?? typeInstructions.web;

    return `Search Query: ${research.query}

Context: ${research.context}

Instructions: ${instruction}

Provide factual, well-sourced information. Be specific with names, numbers, and dates when available.`;
  }

  private extractSourcesFromChunks(chunks: GroundingChunk[]): string[] {
    const sources: string[] = [];
    for (const chunk of chunks) {
      if (chunk.web?.uri) {
        sources.push(chunk.web.uri);
      }
    }
    return [...new Set(sources)];
  }

  private extractWebResults(response: GroundedResponse): WebSearchResult[] {
    const results: WebSearchResult[] = [];

    // Extract from grounding chunks
    for (const chunk of response.groundingChunks) {
      if (chunk.web) {
        results.push({
          title: chunk.web.title ?? 'Web Result',
          url: chunk.web.uri ?? '',
          snippet: '',
          source: this.extractDomain(chunk.web.uri ?? ''),
          publishedDate: '',
        });
      }
    }

    // If no chunks, create a synthetic result from content
    if (results.length === 0 && response.content) {
      results.push({
        title: 'Research Summary',
        url: '',
        snippet: response.content.slice(0, 500),
        source: 'Google Search',
        publishedDate: new Date().toISOString().split('T')[0],
      });
    }

    return results;
  }

  private parseCompanyFromGrounded(
    response: GroundedResponse,
    companyName: string,
    industry: string,
  ): CompanyInfo | null {
    if (!response.content) {
      return null;
    }

    // Parse structured data from grounded response
    return {
      name: companyName,
      description: this.extractSection(response.content, 'description', 'Company in ' + industry),
      website: this.extractUrl(response.content) ?? '',
      industry,
      fundingStage: this.extractSection(response.content, 'funding', 'Unknown'),
      totalFunding: this.extractAmount(response.content, 'raised', 'funding'),
      employees: this.extractNumber(response.content, 'employees', 'team'),
      founded: this.extractYear(response.content),
      headquarters: this.extractLocation(response.content),
      competitors: this.extractList(response.content, 'competitor'),
      investors: this.extractList(response.content, 'investor'),
    };
  }

  private parseInvestorsFromGrounded(
    response: GroundedResponse,
    industry: string,
    fundingStage: string,
  ): InvestorInfo[] {
    if (!response.content) {
      return [];
    }

    const investors: InvestorInfo[] = [];
    const investorNames = this.extractInvestorNames(response.content);

    for (const name of investorNames.slice(0, 10)) {
      investors.push({
        name,
        type: this.inferInvestorType(name),
        website: '',
        portfolio: [],
        investmentStages: [fundingStage],
        sectors: [industry],
        checkSize: this.extractCheckSize(response.content, name),
        location: '',
        recentInvestments: [],
      });
    }

    return investors;
  }

  private parseMarketFromGrounded(response: GroundedResponse, _industry: string): MarketData | null {
    if (!response.content) {
      return null;
    }

    return {
      marketSize: this.extractAmount(response.content, 'market size', 'TAM', 'billion'),
      growthRate: this.extractPercentage(response.content, 'growth', 'CAGR'),
      trends: this.extractList(response.content, 'trend'),
      keyPlayers: this.extractList(response.content, 'player', 'company', 'leader'),
      opportunities: this.extractList(response.content, 'opportunity', 'potential'),
      threats: this.extractList(response.content, 'threat', 'challenge', 'risk'),
    };
  }

  private collectSources(responses: GroundedResponse[]): string[] {
    const allSources: string[] = [];
    for (const response of responses) {
      allSources.push(...response.sources);
    }
    return [...new Set(allSources)];
  }

  private formatCompanyInfo(info: CompanyInfo): string {
    return `**Company Profile: ${info.name}**
- Industry: ${info.industry}
- Description: ${info.description}
- Website: ${info.website || 'N/A'}
- Founded: ${info.founded || 'N/A'}
- Employees: ${info.employees || 'N/A'}
- Funding Stage: ${info.fundingStage}
- Total Funding: ${info.totalFunding || 'N/A'}
- Headquarters: ${info.headquarters || 'N/A'}
- Key Competitors: ${info.competitors.join(', ') || 'N/A'}
- Investors: ${info.investors.join(', ') || 'N/A'}`;
  }

  private formatInvestorInfo(investors: InvestorInfo[]): string {
    const formatted = investors.slice(0, 10).map(
      (inv) =>
        `- **${inv.name}** (${inv.type}): ${inv.sectors.join(', ')} | ${inv.investmentStages.join(', ')} | Check: ${inv.checkSize || 'N/A'}`,
    );
    return `**Relevant Investors:**\n${formatted.join('\n')}`;
  }

  private formatMarketData(data: MarketData): string {
    return `**Market Analysis:**
- Market Size: ${data.marketSize || 'N/A'}
- Growth Rate: ${data.growthRate || 'N/A'}
- Key Trends: ${data.trends.join(', ') || 'N/A'}
- Major Players: ${data.keyPlayers.join(', ') || 'N/A'}
- Opportunities: ${data.opportunities.join(', ') || 'N/A'}
- Threats: ${data.threats.join(', ') || 'N/A'}`;
  }

  private formatWebResults(results: WebSearchResult[]): string {
    const formatted = results
      .slice(0, 5)
      .map((r, i) => `${String(i + 1)}. [${r.title}](${r.url})\n   ${r.snippet}`);
    return `**Recent Web Results:**\n${formatted.join('\n\n')}`;
  }

  // Helper extraction methods
  private extractSection(content: string, ...keywords: string[]): string {
    const lines = content.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (keywords.some((kw) => lowerLine.includes(kw.toLowerCase()))) {
        const cleaned = line.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '');
        if (cleaned.includes(':')) {
          return cleaned.split(':').slice(1).join(':').trim();
        }
        return cleaned.trim();
      }
    }
    return keywords[keywords.length - 1] ?? '';
  }

  private extractUrl(content: string): string | null {
    const urlMatch = /https?:\/\/[^\s)]+/.exec(content);
    return urlMatch ? urlMatch[0] : null;
  }

  private extractAmount(content: string, ...keywords: string[]): string {
    const patterns = [
      /\$[\d.]+\s*(billion|million|B|M|K)/gi,
      /[\d.]+\s*(billion|million)\s*dollars?/gi,
      /USD\s*[\d.]+\s*(billion|million|B|M)/gi,
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Find match near keywords
        for (const keyword of keywords) {
          const keywordIndex = content.toLowerCase().indexOf(keyword.toLowerCase());
          if (keywordIndex !== -1) {
            for (const match of matches) {
              const matchIndex = content.indexOf(match);
              if (Math.abs(matchIndex - keywordIndex) < 200) {
                return match;
              }
            }
          }
        }
        return matches[0];
      }
    }
    return '';
  }

  private extractNumber(content: string, ...keywords: string[]): string {
    for (const keyword of keywords) {
      const pattern = new RegExp(`(\\d[\\d,]+)\\s*${keyword}`, 'i');
      const match = content.match(pattern);
      if (match) {
        return match[1].replace(/,/g, '');
      }
    }
    return '';
  }

  private extractYear(content: string): string {
    const yearMatch = /founded\s*(?:in\s*)?(19|20)\d{2}/i.exec(content);
    if (yearMatch) {
      const fullMatch = yearMatch[0];
      const year = /(19|20)\d{2}/.exec(fullMatch);
      return year ? year[0] : '';
    }
    return '';
  }

  private extractLocation(content: string): string {
    const locationPatterns = [
      /headquartered?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/i,
      /based\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/i,
      /([A-Z][a-z]+(?:,\s*[A-Z]{2}))-based/i,
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return '';
  }

  private extractList(content: string, ...keywords: string[]): string[] {
    const items: string[] = [];
    const lines = content.split('\n');

    let inRelevantSection = false;
    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check if entering relevant section
      if (keywords.some((kw) => lowerLine.includes(kw.toLowerCase()))) {
        inRelevantSection = true;
      }

      // Extract bullet points in relevant section
      if (inRelevantSection && /^[-*•]\s/.test(line)) {
        const item = line.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim();
        if (item && item.length < 100) {
          items.push(item);
        }
      }

      // Exit section on empty line or new header
      if (inRelevantSection && (line.trim() === '' || /^#+\s/.test(line))) {
        if (items.length > 0) break;
        inRelevantSection = false;
      }
    }

    // Fallback: extract capitalized names near keywords
    if (items.length === 0) {
      const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
      let match: RegExpExecArray | null;
      while ((match = namePattern.exec(content)) !== null) {
        const name = match[1];
        if (name.length > 3 && name.length < 50 && !items.includes(name)) {
          items.push(name);
          if (items.length >= 5) break;
        }
      }
    }

    return items.slice(0, 10);
  }

  private extractPercentage(content: string, ...keywords: string[]): string {
    for (const keyword of keywords) {
      const pattern = new RegExp(`(\\d+(?:\\.\\d+)?%?)\\s*(?:${keyword}|CAGR)`, 'i');
      const match = content.match(pattern);
      if (match) {
        return match[1].includes('%') ? match[1] : `${match[1]}%`;
      }
    }

    // Generic percentage extraction
    const percentMatch = /(\d+(?:\.\d+)?)\s*%/.exec(content);
    return percentMatch ? `${percentMatch[1]}%` : '';
  }

  private extractInvestorNames(content: string): string[] {
    const names: string[] = [];

    // Common VC naming patterns
    const vcPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Ventures?|Capital|Partners?|Investments?))/g,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:led|invested|participated)/gi,
    ];

    for (const pattern of vcPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (!names.includes(name) && name.length > 5) {
          names.push(name);
        }
      }
    }

    return names.slice(0, 15);
  }

  private inferInvestorType(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('angel') || lowerName.includes('syndicate')) {
      return 'Angel';
    }
    if (lowerName.includes('seed') || lowerName.includes('pre-seed')) {
      return 'Seed Fund';
    }
    if (lowerName.includes('growth') || lowerName.includes('equity')) {
      return 'Growth Equity';
    }
    if (lowerName.includes('corporate') || lowerName.includes('cvc')) {
      return 'Corporate VC';
    }
    return 'Venture Capital';
  }

  private extractCheckSize(content: string, investorName: string): string {
    const nameIndex = content.indexOf(investorName);
    if (nameIndex === -1) return '';

    const nearbyContent = content.slice(
      Math.max(0, nameIndex - 100),
      Math.min(content.length, nameIndex + 200),
    );

    const checkPattern = /\$[\d.]+\s*(?:M|K|million|thousand)/i;
    const match = checkPattern.exec(nearbyContent);
    return match ? match[0] : '';
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }
}
