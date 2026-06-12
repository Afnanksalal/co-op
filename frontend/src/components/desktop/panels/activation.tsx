'use client';

import { useState } from 'react';
import { Key, ShieldCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { activateLicense, clearActivation, refreshLicense, type DesktopState } from '@/lib/desktop/runtime';
import { Field, PanelTitle, Rows } from '../shared';

export function ActivationPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState | null;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [licenseKey, setLicenseKey] = useState('');
  return (
    <div className="grid max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void runWithState(
            'activate',
            () => activateLicense({ licenseKey }),
            'Activation saved locally.'
          );
        }}
      >
        <PanelTitle icon={Key} title="Activation key" />
        <Field
          label="License key"
          value={licenseKey}
          onChange={setLicenseKey}
          placeholder="COOP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
        />
        <Button
          className="mt-5"
          type="submit"
          disabled={busyAction === 'activate' || !licenseKey.trim()}
        >
          {busyAction === 'activate' ? 'Activating...' : 'Activate'}
        </Button>
      </form>
      <section className="rounded-lg border border-border bg-card p-5">
        <PanelTitle icon={ShieldCheck} title="Entitlement" />
        <Rows
          rows={[
            ['Email', state?.activation?.customerEmail ?? 'Not activated'],
            ['Plan', state?.activation?.plan ?? 'Not activated'],
            ['Status', state?.activation?.status ?? 'Not activated'],
            [
              'Offline grace',
              state?.activation
                ? new Date(state.activation.offlineGraceEndsAt).toLocaleString()
                : 'Not activated',
            ],
          ]}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              void runWithState('license-refresh', refreshLicense, 'License refreshed.')
            }
            disabled={!state?.activation || busyAction === 'license-refresh'}
          >
            Refresh license
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void runWithState('clear', clearActivation, 'Activation removed locally.')
            }
            disabled={!state?.activation || busyAction === 'clear'}
          >
            Remove activation
          </Button>
        </div>
      </section>
    </div>
  );
}
