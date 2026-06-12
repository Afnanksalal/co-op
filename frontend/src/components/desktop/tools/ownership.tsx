'use client';

import { UsersThree } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { saveCapTable } from '@/lib/desktop/runtime';
import { EmptyState, Field, PanelTitle, Rows, TextArea } from '../shared';
import type { OwnershipSurfaceProps } from './types';

export function OwnershipSurface({
  state,
  capTable,
  runWithState,
  onCapTableChange,
}: OwnershipSurfaceProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runWithState('captable', () => saveCapTable(capTable), 'Ownership scenario saved.');
        }}
      >
        <PanelTitle icon={UsersThree} title="Ownership scenario" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scenario" value={capTable.name} onChange={(name) => onCapTableChange({ ...capTable, name })} />
          <Field
            label="Post-money valuation"
            type="number"
            value={String(capTable.postMoneyValuation)}
            onChange={(value) => onCapTableChange({ ...capTable, postMoneyValuation: Number(value) })}
          />
          <Field
            label="Founder %"
            type="number"
            value={String(capTable.founderOwnershipPercent)}
            onChange={(value) => onCapTableChange({ ...capTable, founderOwnershipPercent: Number(value) })}
          />
          <Field
            label="Investor %"
            type="number"
            value={String(capTable.investorOwnershipPercent)}
            onChange={(value) => onCapTableChange({ ...capTable, investorOwnershipPercent: Number(value) })}
          />
          <Field
            label="Option pool %"
            type="number"
            value={String(capTable.optionPoolPercent)}
            onChange={(value) => onCapTableChange({ ...capTable, optionPoolPercent: Number(value) })}
          />
        </div>
        <TextArea label="Notes" value={capTable.notes} onChange={(notes) => onCapTableChange({ ...capTable, notes })} />
        <Button className="mt-5" type="submit">
          Save scenario
        </Button>
      </form>
      <div className="space-y-3">
        {state.capTables.map((scenario) => (
          <article key={scenario.id} className="rounded-lg border border-border/50 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">{scenario.name}</h3>
              <Badge variant="secondary">${scenario.postMoneyValuation.toLocaleString()}</Badge>
            </div>
            <Rows
              rows={[
                ['Founder', `${scenario.founderOwnershipPercent}%`],
                ['Investor', `${scenario.investorOwnershipPercent}%`],
                ['Option pool', `${scenario.optionPoolPercent}%`],
              ]}
            />
            {scenario.notes && <p className="mt-3 text-sm text-muted-foreground">{scenario.notes}</p>}
          </article>
        ))}
        {state.capTables.length === 0 && (
          <EmptyState
            icon={UsersThree}
            title="No scenarios"
            text="Model founder, investor, and option-pool ownership before a round."
          />
        )}
      </div>
    </div>
  );
}
