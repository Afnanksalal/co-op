import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { AlertRequest, BusinessToolResult, CapTableRequest, DesktopState, PitchDeckRequest } from '@/lib/desktop/runtime';

export type ToolTabId = 'calculators' | 'alerts' | 'pitch' | 'captable' | 'investors';

export type RunWithState = (
  label: string,
  action: () => Promise<DesktopState>,
  success: string
) => Promise<boolean>;

export interface ToolSurfaceProps {
  state: DesktopState;
  busyAction: string;
  runWithState: RunWithState;
}

export interface CalculatorState {
  toolType: string;
  first: string;
  second: string;
}

export interface CalculatorSpec {
  label: string;
  first: string;
  second: string;
  formula: string;
}

export const calculatorSpecs: Record<string, CalculatorSpec> = {
  runway: {
    label: 'Runway',
    first: 'Cash balance',
    second: 'Monthly net burn',
    formula: 'Cash balance divided by monthly net burn',
  },
  burn_rate: {
    label: 'Burn rate',
    first: 'Starting cash',
    second: 'Ending cash',
    formula: 'Starting cash minus ending cash',
  },
  valuation: {
    label: 'Valuation',
    first: 'Annual revenue',
    second: 'Revenue multiple',
    formula: 'Annual revenue multiplied by selected multiple',
  },
  unit_economics: {
    label: 'Unit economics',
    first: 'Customer LTV',
    second: 'Customer CAC',
    formula: 'Lifetime value divided by acquisition cost',
  },
};

export interface CalculatorSurfaceProps {
  busyAction: string;
  calculator: CalculatorState;
  calculatorResult: BusinessToolResult | null;
  onCalculatorChange: Dispatch<SetStateAction<CalculatorState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export interface WatchlistSurfaceProps extends ToolSurfaceProps {
  alert: AlertRequest;
  onAlertChange: Dispatch<SetStateAction<AlertRequest>>;
}

export interface PitchFileMeta {
  name: string;
  size: string;
}

export interface PitchSurfaceProps extends ToolSurfaceProps {
  pitch: PitchDeckRequest;
  pitchFileError: string;
  pitchFileMeta: PitchFileMeta | null;
  onPitchChange: Dispatch<SetStateAction<PitchDeckRequest>>;
  onPitchFile: (file: File | null) => Promise<void>;
}

export interface OwnershipSurfaceProps extends ToolSurfaceProps {
  capTable: CapTableRequest;
  onCapTableChange: Dispatch<SetStateAction<CapTableRequest>>;
}

export interface InvestorsSurfaceProps {
  state: DesktopState;
  investorQuery: string;
  onInvestorQueryChange: (value: string) => void;
}
