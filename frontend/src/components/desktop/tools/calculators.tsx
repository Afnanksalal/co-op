'use client';

import { Calculator } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Field, PanelTitle, Rows, SelectField } from '../shared';
import { MarkdownOutput } from '../markdown';
import { calculatorSpecs, type CalculatorSurfaceProps } from './types';

export function CalculatorSurface({
  busyAction,
  calculator,
  calculatorResult,
  onCalculatorChange,
  onSubmit,
}: CalculatorSurfaceProps) {
  const calculatorSpec = calculatorSpecs[calculator.toolType] ?? calculatorSpecs.runway;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={onSubmit}>
        <PanelTitle icon={Calculator} title="Money checks" />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Question"
            value={calculator.toolType}
            onChange={(toolType) => onCalculatorChange({ ...calculator, toolType })}
            options={['runway', 'burn_rate', 'valuation', 'unit_economics']}
            labels={Object.fromEntries(
              Object.entries(calculatorSpecs).map(([key, spec]) => [key, spec.label])
            )}
          />
          <Field
            label={calculatorSpec.first}
            type="number"
            value={calculator.first}
            onChange={(first) => onCalculatorChange({ ...calculator, first })}
          />
          <Field
            label={calculatorSpec.second}
            type="number"
            value={calculator.second}
            onChange={(second) => onCalculatorChange({ ...calculator, second })}
          />
        </div>
        <Button className="mt-5" type="submit" disabled={busyAction === 'calculator'}>
          Check
        </Button>
        {calculatorResult && (
          <MarkdownOutput
            text={calculatorResult.output}
            className="coop-scrollbar mt-4 max-h-72 overflow-auto rounded-md border border-border bg-background p-4"
          />
        )}
      </form>
      <div className="rounded-lg border border-border/50 bg-background p-4">
        <h3 className="font-serif text-lg font-medium">{calculatorSpec.label}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{calculatorSpec.formula}</p>
        <div className="mt-4 space-y-3 text-sm">
          <Rows
            rows={[
              ['Runway', 'Cash / monthly burn'],
              ['Burn rate', 'Spend minus revenue'],
              ['Valuation', 'Revenue x multiple'],
              ['Unit economics', 'LTV / CAC'],
            ]}
          />
        </div>
      </div>
    </div>
  );
}
