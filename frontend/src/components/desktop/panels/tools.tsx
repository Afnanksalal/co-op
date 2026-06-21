'use client';

import { type FormEvent, useState } from 'react';
import {
  runCalculator,
  type AlertRequest,
  type BusinessToolResult,
  type DesktopState,
  type PitchDeckRequest,
} from '@/lib/desktop/runtime';
import { errorMessage, fileToDataUrl, formatBytes } from '../utils';
import { DesktopPage } from '../shared';
import { CalculatorSurface } from '../tools/calculators';
import { InvestorsSurface } from '../tools/investors';
import { OwnershipSurface } from '../tools/ownership';
import { PitchReviewSurface } from '../tools/pitch-review';
import { ToolTabs } from '../tools/tool-tabs';
import { WatchlistSurface } from '../tools/watchlist';
import type { CalculatorState, PitchFileMeta, ToolTabId } from '../tools/types';

export function ToolsPanel({
  state,
  busyAction,
  runWithState,
  setError,
  setMessage,
  setBusyAction,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  setBusyAction: (value: string) => void;
}) {
  const [toolTab, setToolTab] = useState<ToolTabId>('calculators');
  const [calculator, setCalculator] = useState<CalculatorState>({
    toolType: 'runway',
    first: '100000',
    second: '20000',
  });
  const [calculatorResult, setCalculatorResult] = useState<BusinessToolResult | null>(null);
  const [alert, setAlert] = useState<AlertRequest>({
    name: '',
    query: '',
    cadence: 'manual',
    enabled: true,
  });
  const [pitch, setPitch] = useState<PitchDeckRequest>({
    title: '',
    deckNotes: '',
    fileName: null,
    fileMimeType: null,
    fileDataBase64: null,
  });
  const [pitchFileMeta, setPitchFileMeta] = useState<PitchFileMeta | null>(null);
  const [pitchFileError, setPitchFileError] = useState('');
  const [capTable, setCapTable] = useState({
    name: '',
    founderOwnershipPercent: 70,
    investorOwnershipPercent: 20,
    optionPoolPercent: 10,
    postMoneyValuation: 5000000,
    notes: '',
  });
  const [investorQuery, setInvestorQuery] = useState('');

  async function runCalc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction('calculator');
    setError('');
    setMessage('');
    try {
      const result = await runCalculator(calculator.toolType, [
        Number(calculator.first),
        Number(calculator.second),
      ]);
      setCalculatorResult(result);
      setMessage('Money check completed.');
    } catch (error) {
      setError(errorMessage(error, 'Money check failed'));
    } finally {
      setBusyAction('');
    }
  }

  async function handlePitchFile(file: File | null) {
    setPitchFileError('');
    if (!file) {
      setPitch((current) => ({
        ...current,
        fileName: null,
        fileMimeType: null,
        fileDataBase64: null,
      }));
      setPitchFileMeta(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setPitchFileError('Choose a deck 25 MB or smaller.');
      return;
    }
    try {
      const fileDataBase64 = await fileToDataUrl(file);
      setPitch((current) => ({
        ...current,
        fileName: file.name,
        fileMimeType: file.type || null,
        fileDataBase64,
      }));
      setPitchFileMeta({ name: file.name, size: formatBytes(file.size) });
    } catch (error) {
      setPitchFileError(errorMessage(error, 'Could not read the selected deck.'));
    }
  }

  return (
    <DesktopPage>
      <div className="grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <ToolTabs state={state} activeTab={toolTab} onSelect={setToolTab} />
        <section className="min-w-0 rounded-lg border border-border/50 bg-card p-5">
          {toolTab === 'calculators' && (
            <CalculatorSurface
              busyAction={busyAction}
              calculator={calculator}
              calculatorResult={calculatorResult}
              onCalculatorChange={setCalculator}
              onSubmit={runCalc}
            />
          )}
          {toolTab === 'alerts' && (
            <WatchlistSurface
              state={state}
              alert={alert}
              busyAction={busyAction}
              runWithState={runWithState}
              onAlertChange={setAlert}
            />
          )}
          {toolTab === 'pitch' && (
            <PitchReviewSurface
              state={state}
              pitch={pitch}
              pitchFileError={pitchFileError}
              pitchFileMeta={pitchFileMeta}
              busyAction={busyAction}
              runWithState={runWithState}
              onPitchChange={setPitch}
              onPitchFile={handlePitchFile}
            />
          )}
          {toolTab === 'captable' && (
            <OwnershipSurface
              state={state}
              capTable={capTable}
              busyAction={busyAction}
              runWithState={runWithState}
              onCapTableChange={setCapTable}
            />
          )}
          {toolTab === 'investors' && (
            <InvestorsSurface
              state={state}
              investorQuery={investorQuery}
              onInvestorQueryChange={setInvestorQuery}
            />
          )}
        </section>
      </div>
    </DesktopPage>
  );
}
