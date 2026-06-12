'use client';

import { Briefcase } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PanelTitle } from '../shared';
import type { InvestorsSurfaceProps } from './types';

export function InvestorsSurface({
  state,
  investorQuery,
  onInvestorQueryChange,
}: InvestorsSurfaceProps) {
  const investors = state.investors.filter((investor) =>
    `${investor.name} ${investor.firm} ${investor.stage} ${investor.sectors.join(' ')}`
      .toLowerCase()
      .includes(investorQuery.toLowerCase())
  );

  return (
    <div>
      <PanelTitle icon={Briefcase} title="Investor database" />
      <Input
        value={investorQuery}
        onChange={(event) => onInvestorQueryChange(event.target.value)}
        placeholder="Search investors by firm, stage, sector, geography"
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {investors.slice(0, 16).map((investor) => (
          <article key={investor.id} className="rounded-lg border border-border/50 bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{investor.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {investor.stage} - {investor.ticketSize}
                </p>
              </div>
              <Badge variant="outline">{investor.geography}</Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{investor.sectors.join(', ')}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
