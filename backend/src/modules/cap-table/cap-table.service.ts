import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import {
  capTables,
  capTableShareholders,
  capTableRounds,
  capTableScenarios,
  ScenarioParameters,
  ScenarioResults,
} from '@/database/schema/cap-tables.schema';
import {
  CreateCapTableDto,
  UpdateCapTableDto,
  CreateShareholderDto,
  UpdateShareholderDto,
  CreateRoundDto,
  UpdateRoundDto,
  CreateScenarioDto,
  ShareholderResponseDto,
  CapTableSummaryDto,
} from './dto/cap-table.dto';

@Injectable()
export class CapTableService {
  private readonly logger = new Logger(CapTableService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // ============================================
  // CAP TABLE CRUD
  // ============================================

  async createCapTable(userId: string, startupId: string | null, dto: CreateCapTableDto) {
    const [capTable] = await this.db
      .insert(capTables)
      .values({
        userId,
        startupId,
        companyName: dto.companyName,
        name: dto.name || 'Main Cap Table',
        description: dto.description,
        incorporationDate: dto.incorporationDate,
        authorizedShares: dto.authorizedShares || 10000000,
        currency: dto.currency || 'USD',
      })
      .returning();

    this.logger.log(`Cap table created: ${capTable.id}`);
    return capTable;
  }

  async findAllCapTables(userId: string) {
    return this.db
      .select()
      .from(capTables)
      .where(and(eq(capTables.userId, userId), eq(capTables.isActive, true)))
      .orderBy(desc(capTables.createdAt));
  }

  async findCapTable(capTableId: string, userId: string) {
    const [capTable] = await this.db
      .select()
      .from(capTables)
      .where(and(eq(capTables.id, capTableId), eq(capTables.userId, userId)))
      .limit(1);

    if (!capTable) {
      throw new NotFoundException('Cap table not found');
    }

    return capTable;
  }

  async updateCapTable(capTableId: string, userId: string, dto: UpdateCapTableDto) {
    await this.findCapTable(capTableId, userId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.currentValuation !== undefined) updateData.currentValuation = dto.currentValuation.toString();
    if (dto.optionsPoolSize !== undefined) updateData.optionsPoolSize = dto.optionsPoolSize;
    if (dto.authorizedShares !== undefined) updateData.authorizedShares = dto.authorizedShares;

    const [updated] = await this.db
      .update(capTables)
      .set(updateData)
      .where(eq(capTables.id, capTableId))
      .returning();

    // Recalculate totals
    await this.recalculateCapTable(capTableId);

    return updated;
  }

  async deleteCapTable(capTableId: string, userId: string) {
    await this.findCapTable(capTableId, userId);
    await this.db.delete(capTables).where(eq(capTables.id, capTableId));
    this.logger.log(`Cap table deleted: ${capTableId}`);
  }

  // ============================================
  // SHAREHOLDERS
  // ============================================

  async addShareholder(capTableId: string, userId: string, dto: CreateShareholderDto) {
    await this.findCapTable(capTableId, userId);

    const [shareholder] = await this.db
      .insert(capTableShareholders)
      .values({
        capTableId,
        name: dto.name,
        email: dto.email,
        shareholderType: dto.shareholderType,
        commonShares: dto.commonShares || 0,
        preferredShares: dto.preferredShares || 0,
        optionsGranted: dto.optionsGranted || 0,
        vestingStartDate: dto.vestingStartDate,
        vestingCliffMonths: dto.vestingCliffMonths,
        vestingTotalMonths: dto.vestingTotalMonths,
        investmentAmount: dto.investmentAmount?.toString(),
        investmentDate: dto.investmentDate,
        sharePrice: dto.sharePrice?.toString(),
        notes: dto.notes,
      })
      .returning();

    // Recalculate cap table totals
    await this.recalculateCapTable(capTableId);

    return shareholder;
  }

  async getShareholders(capTableId: string, userId: string): Promise<ShareholderResponseDto[]> {
    await this.findCapTable(capTableId, userId);

    const shareholders = await this.db
      .select()
      .from(capTableShareholders)
      .where(eq(capTableShareholders.capTableId, capTableId))
      .orderBy(desc(capTableShareholders.commonShares));

    const capTable = await this.findCapTable(capTableId, userId);
    const fullyDiluted = capTable.fullyDilutedShares || 1;

    return shareholders.map((s) => {
      const totalShares = s.commonShares + s.preferredShares + s.optionsExercised;
      const vestingProgress = this.calculateVestingProgress(
        s.vestingStartDate,
        s.vestingCliffMonths || 12,
        s.vestingTotalMonths || 48,
      );

      return {
        id: s.id,
        name: s.name,
        email: s.email || undefined,
        shareholderType: s.shareholderType,
        commonShares: s.commonShares,
        preferredShares: s.preferredShares,
        optionsGranted: s.optionsGranted,
        optionsVested: s.optionsVested,
        optionsExercised: s.optionsExercised,
        totalShares,
        ownershipPercent: (totalShares / fullyDiluted) * 100,
        vestingStartDate: s.vestingStartDate || undefined,
        vestingCliffMonths: s.vestingCliffMonths || undefined,
        vestingTotalMonths: s.vestingTotalMonths || undefined,
        vestingProgress,
        investmentAmount: s.investmentAmount ? parseFloat(s.investmentAmount) : undefined,
        investmentDate: s.investmentDate || undefined,
        sharePrice: s.sharePrice ? parseFloat(s.sharePrice) : undefined,
        createdAt: s.createdAt.toISOString(),
      };
    });
  }

  async updateShareholder(
    capTableId: string,
    shareholderId: string,
    userId: string,
    dto: UpdateShareholderDto,
  ) {
    await this.findCapTable(capTableId, userId);

    const [updated] = await this.db
      .update(capTableShareholders)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(capTableShareholders.id, shareholderId),
          eq(capTableShareholders.capTableId, capTableId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Shareholder not found');
    }

    await this.recalculateCapTable(capTableId);
    return updated;
  }

  async deleteShareholder(capTableId: string, shareholderId: string, userId: string) {
    await this.findCapTable(capTableId, userId);

    await this.db
      .delete(capTableShareholders)
      .where(
        and(
          eq(capTableShareholders.id, shareholderId),
          eq(capTableShareholders.capTableId, capTableId),
        ),
      );

    await this.recalculateCapTable(capTableId);
  }

  // ============================================
  // FUNDING ROUNDS
  // ============================================

  async addRound(capTableId: string, userId: string, dto: CreateRoundDto) {
    await this.findCapTable(capTableId, userId);

    const [round] = await this.db
      .insert(capTableRounds)
      .values({
        capTableId,
        name: dto.name,
        roundType: dto.roundType,
        status: dto.status || 'planned',
        targetRaise: dto.targetRaise?.toString(),
        preMoneyValuation: dto.preMoneyValuation?.toString(),
        valuationCap: dto.valuationCap?.toString(),
        discountRate: dto.discountRate?.toString(),
        interestRate: dto.interestRate?.toString(),
        roundDate: dto.roundDate,
        notes: dto.notes,
      })
      .returning();

    return round;
  }

  async getRounds(capTableId: string, userId: string) {
    await this.findCapTable(capTableId, userId);

    return this.db
      .select()
      .from(capTableRounds)
      .where(eq(capTableRounds.capTableId, capTableId))
      .orderBy(desc(capTableRounds.roundDate));
  }

  async updateRound(capTableId: string, roundId: string, userId: string, dto: UpdateRoundDto) {
    await this.findCapTable(capTableId, userId);

    // Calculate post-money if we have pre-money and amount raised
    let postMoneyValuation = dto.postMoneyValuation;
    if (dto.preMoneyValuation && dto.amountRaised && !postMoneyValuation) {
      postMoneyValuation = dto.preMoneyValuation + dto.amountRaised;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.amountRaised !== undefined) updateData.amountRaised = dto.amountRaised.toString();
    if (dto.preMoneyValuation !== undefined) updateData.preMoneyValuation = dto.preMoneyValuation.toString();
    if (postMoneyValuation !== undefined) updateData.postMoneyValuation = postMoneyValuation.toString();
    if (dto.pricePerShare !== undefined) updateData.pricePerShare = dto.pricePerShare.toString();
    if (dto.sharesIssued !== undefined) updateData.sharesIssued = dto.sharesIssued;
    if (dto.closeDate !== undefined) updateData.closeDate = dto.closeDate;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const [updated] = await this.db
      .update(capTableRounds)
      .set(updateData)
      .where(and(eq(capTableRounds.id, roundId), eq(capTableRounds.capTableId, capTableId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Round not found');
    }

    // If round is closed, update cap table valuation
    if (dto.status === 'closed' && postMoneyValuation) {
      await this.db
        .update(capTables)
        .set({
          currentValuation: postMoneyValuation.toString(),
          updatedAt: new Date(),
        })
        .where(eq(capTables.id, capTableId));
    }

    return updated;
  }

  async deleteRound(capTableId: string, roundId: string, userId: string) {
    await this.findCapTable(capTableId, userId);

    await this.db
      .delete(capTableRounds)
      .where(and(eq(capTableRounds.id, roundId), eq(capTableRounds.capTableId, capTableId)));
  }

  // ============================================
  // SCENARIOS (What-if modeling)
  // ============================================

  async createScenario(capTableId: string, userId: string, dto: CreateScenarioDto) {
    await this.findCapTable(capTableId, userId);

    // Calculate scenario results
    const results = await this.calculateScenarioResults(capTableId, dto.parameters);

    const [scenario] = await this.db
      .insert(capTableScenarios)
      .values({
        capTableId,
        name: dto.name,
        description: dto.description,
        parameters: dto.parameters,
        results,
      })
      .returning();

    return scenario;
  }

  async getScenarios(capTableId: string, userId: string) {
    await this.findCapTable(capTableId, userId);

    return this.db
      .select()
      .from(capTableScenarios)
      .where(eq(capTableScenarios.capTableId, capTableId))
      .orderBy(desc(capTableScenarios.createdAt));
  }

  async deleteScenario(capTableId: string, scenarioId: string, userId: string) {
    await this.findCapTable(capTableId, userId);

    await this.db
      .delete(capTableScenarios)
      .where(
        and(eq(capTableScenarios.id, scenarioId), eq(capTableScenarios.capTableId, capTableId)),
      );
  }

  /**
   * Calculate dilution impact for a scenario
   */
  private async calculateScenarioResults(
    capTableId: string,
    params: ScenarioParameters,
  ): Promise<ScenarioResults> {
    const shareholders = await this.db
      .select()
      .from(capTableShareholders)
      .where(eq(capTableShareholders.capTableId, capTableId));

    const capTable = await this.db
      .select()
      .from(capTables)
      .where(eq(capTables.id, capTableId))
      .limit(1)
      .then((r) => r[0]);

    const currentFullyDiluted = capTable.fullyDilutedShares || 1;
    const currentValuation = parseFloat(capTable.currentValuation || '0');

    // Calculate current ownership
    const currentOwnership: Record<string, number> = {};
    let founderSharesBefore = 0;

    for (const s of shareholders) {
      const totalShares = s.commonShares + s.preferredShares + s.optionsExercised;
      currentOwnership[s.id] = (totalShares / currentFullyDiluted) * 100;
      if (s.shareholderType === 'founder') {
        founderSharesBefore += totalShares;
      }
    }

    // Apply scenario
    let newShares = 0;
    let postMoneyValuation = currentValuation;

    if (params.newRound) {
      const { amount, valuation } = params.newRound;
      postMoneyValuation = valuation + amount;
      const pricePerShare = valuation / currentFullyDiluted;
      newShares = Math.floor(amount / pricePerShare);
    }

    if (params.optionsPoolIncrease) {
      newShares += params.optionsPoolIncrease;
    }

    const newFullyDiluted = currentFullyDiluted + newShares;

    // Calculate new ownership
    const newOwnership: Record<string, number> = {};
    const dilution: Record<string, { before: number; after: number }> = {};
    let founderSharesAfter = 0;

    for (const s of shareholders) {
      const totalShares = s.commonShares + s.preferredShares + s.optionsExercised;
      const newPercent = (totalShares / newFullyDiluted) * 100;
      newOwnership[s.id] = newPercent;
      dilution[s.id] = {
        before: currentOwnership[s.id],
        after: newPercent,
      };
      if (s.shareholderType === 'founder') {
        founderSharesAfter += totalShares;
      }
    }

    const founderDilution =
      ((founderSharesBefore / currentFullyDiluted) * 100) -
      ((founderSharesAfter / newFullyDiluted) * 100);

    const newInvestorOwnership = (newShares / newFullyDiluted) * 100;

    return {
      dilution,
      newOwnership,
      founderDilution,
      newInvestorOwnership,
      postMoneyValuation,
    };
  }

  // ============================================
  // SUMMARY & EXPORT
  // ============================================

  async getCapTableSummary(capTableId: string, userId: string): Promise<CapTableSummaryDto> {
    const capTable = await this.findCapTable(capTableId, userId);
    const shareholders = await this.getShareholders(capTableId, userId);
    const rounds = await this.getRounds(capTableId, userId);

    // Calculate ownership by type
    const ownershipByType = {
      founders: 0,
      employees: 0,
      investors: 0,
      advisors: 0,
      optionsPool: 0,
    };

    for (const s of shareholders) {
      switch (s.shareholderType) {
        case 'founder':
          ownershipByType.founders += s.ownershipPercent;
          break;
        case 'employee':
          ownershipByType.employees += s.ownershipPercent;
          break;
        case 'investor':
          ownershipByType.investors += s.ownershipPercent;
          break;
        case 'advisor':
          ownershipByType.advisors += s.ownershipPercent;
          break;
      }
    }

    // Options pool ownership
    const optionsPoolAvailable = (capTable.optionsPoolSize || 0) - (capTable.optionsPoolAllocated || 0);
    ownershipByType.optionsPool = ((optionsPoolAvailable) / (capTable.fullyDilutedShares || 1)) * 100;

    return {
      capTable: {
        id: capTable.id,
        companyName: capTable.companyName,
        name: capTable.name,
        description: capTable.description || undefined,
        incorporationDate: capTable.incorporationDate || undefined,
        authorizedShares: capTable.authorizedShares,
        totalIssuedShares: capTable.totalIssuedShares,
        fullyDilutedShares: capTable.fullyDilutedShares,
        currentValuation: capTable.currentValuation ? parseFloat(capTable.currentValuation) : undefined,
        pricePerShare: capTable.pricePerShare ? parseFloat(capTable.pricePerShare) : undefined,
        optionsPoolSize: capTable.optionsPoolSize || 0,
        optionsPoolAllocated: capTable.optionsPoolAllocated || 0,
        optionsPoolAvailable,
        currency: capTable.currency,
        createdAt: capTable.createdAt.toISOString(),
        updatedAt: capTable.updatedAt.toISOString(),
      },
      shareholders,
      rounds: rounds.map((r) => ({
        id: r.id,
        name: r.name,
        roundType: r.roundType,
        status: r.status,
        targetRaise: r.targetRaise ? parseFloat(r.targetRaise) : undefined,
        amountRaised: r.amountRaised ? parseFloat(r.amountRaised) : undefined,
        preMoneyValuation: r.preMoneyValuation ? parseFloat(r.preMoneyValuation) : undefined,
        postMoneyValuation: r.postMoneyValuation ? parseFloat(r.postMoneyValuation) : undefined,
        pricePerShare: r.pricePerShare ? parseFloat(r.pricePerShare) : undefined,
        sharesIssued: r.sharesIssued || undefined,
        valuationCap: r.valuationCap ? parseFloat(r.valuationCap) : undefined,
        discountRate: r.discountRate ? parseFloat(r.discountRate) : undefined,
        interestRate: r.interestRate ? parseFloat(r.interestRate) : undefined,
        roundDate: r.roundDate || undefined,
        closeDate: r.closeDate || undefined,
        createdAt: r.createdAt.toISOString(),
      })),
      ownershipByType,
    };
  }

  /**
   * Export cap table in various formats
   */
  async exportCapTable(
    capTableId: string,
    userId: string,
    format: 'json' | 'csv' | 'carta',
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const summary = await this.getCapTableSummary(capTableId, userId);

    switch (format) {
      case 'json':
        return {
          content: JSON.stringify(summary, null, 2),
          filename: `${summary.capTable.companyName.replace(/\s+/g, '_')}_cap_table.json`,
          mimeType: 'application/json',
        };

      case 'csv':
        return {
          content: this.generateCsv(summary),
          filename: `${summary.capTable.companyName.replace(/\s+/g, '_')}_cap_table.csv`,
          mimeType: 'text/csv',
        };

      case 'carta':
        return {
          content: this.generateCartaFormat(summary),
          filename: `${summary.capTable.companyName.replace(/\s+/g, '_')}_carta_import.csv`,
          mimeType: 'text/csv',
        };

      default:
        throw new BadRequestException('Invalid export format');
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async recalculateCapTable(capTableId: string): Promise<void> {
    const shareholders = await this.db
      .select()
      .from(capTableShareholders)
      .where(eq(capTableShareholders.capTableId, capTableId));

    let totalIssued = 0;
    let optionsAllocated = 0;

    for (const s of shareholders) {
      totalIssued += s.commonShares + s.preferredShares + s.optionsExercised;
      optionsAllocated += s.optionsGranted;
    }

    const capTable = await this.db
      .select()
      .from(capTables)
      .where(eq(capTables.id, capTableId))
      .limit(1)
      .then((r) => r[0]);

    const optionsPoolAvailable = (capTable.optionsPoolSize || 0) - optionsAllocated;
    const fullyDiluted = totalIssued + optionsPoolAvailable;

    // Calculate price per share if we have valuation
    let pricePerShare: string | null = null;
    if (capTable.currentValuation && fullyDiluted > 0) {
      pricePerShare = (parseFloat(capTable.currentValuation) / fullyDiluted).toFixed(6);
    }

    await this.db
      .update(capTables)
      .set({
        totalIssuedShares: totalIssued,
        fullyDilutedShares: fullyDiluted,
        optionsPoolAllocated: optionsAllocated,
        pricePerShare,
        updatedAt: new Date(),
      })
      .where(eq(capTables.id, capTableId));
  }

  private calculateVestingProgress(
    startDate: string | null,
    cliffMonths: number,
    totalMonths: number,
  ): number | undefined {
    if (!startDate) return undefined;

    const start = new Date(startDate);
    const now = new Date();
    const monthsElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsElapsed < cliffMonths) return 0;
    if (monthsElapsed >= totalMonths) return 100;

    return Math.round((monthsElapsed / totalMonths) * 100);
  }

  private generateCsv(summary: CapTableSummaryDto): string {
    const headers = [
      'Name',
      'Type',
      'Common Shares',
      'Preferred Shares',
      'Options Granted',
      'Options Vested',
      'Total Shares',
      'Ownership %',
      'Investment Amount',
    ];

    const rows = summary.shareholders.map((s) => [
      s.name,
      s.shareholderType,
      s.commonShares,
      s.preferredShares,
      s.optionsGranted,
      s.optionsVested,
      s.totalShares,
      s.ownershipPercent.toFixed(2),
      s.investmentAmount || '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private generateCartaFormat(summary: CapTableSummaryDto): string {
    // Carta-compatible CSV format
    const headers = [
      'Stakeholder Name',
      'Stakeholder Email',
      'Security Type',
      'Number of Shares',
      'Issue Date',
      'Price Per Share',
      'Vesting Start Date',
      'Cliff (months)',
      'Vesting Period (months)',
    ];

    const rows: string[][] = [];

    for (const s of summary.shareholders) {
      if (s.commonShares > 0) {
        rows.push([
          s.name,
          s.email || '',
          'Common Stock',
          s.commonShares.toString(),
          s.investmentDate || '',
          s.sharePrice?.toString() || '',
          s.vestingStartDate || '',
          s.vestingCliffMonths?.toString() || '',
          s.vestingTotalMonths?.toString() || '',
        ]);
      }
      if (s.preferredShares > 0) {
        rows.push([
          s.name,
          s.email || '',
          'Preferred Stock',
          s.preferredShares.toString(),
          s.investmentDate || '',
          s.sharePrice?.toString() || '',
          '',
          '',
          '',
        ]);
      }
      if (s.optionsGranted > 0) {
        rows.push([
          s.name,
          s.email || '',
          'Stock Option',
          s.optionsGranted.toString(),
          '',
          '',
          s.vestingStartDate || '',
          s.vestingCliffMonths?.toString() || '',
          s.vestingTotalMonths?.toString() || '',
        ]);
      }
    }

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
