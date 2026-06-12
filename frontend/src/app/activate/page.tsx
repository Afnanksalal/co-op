'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Desktop, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  activateLicense,
  getActivationState,
  isTauriRuntime,
  type DesktopState,
} from '@/lib/desktop/runtime';

export default function ActivatePage() {
  const [state, setState] = useState<DesktopState | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getActivationState()
      .then(setState)
      .catch((error) => setError(String(error)));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const nextState = await activateLicense({
        licenseKey: licenseKey.trim(),
      });
      setState(nextState);
      setLicenseKey('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Activation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Co-Op
        </Link>

        <div className="mb-8">
          <Badge variant="secondary" className="mb-4">
            Desktop activation
          </Badge>
          <h1 className="text-4xl font-semibold tracking-normal">Activate this local install</h1>
        </div>

        {!isTauriRuntime() && (
          <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            <Warning weight="fill" className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              This page is open in a browser. License activation stores access on this computer and
              must be completed inside Co-Op Desktop.
            </p>
          </div>
        )}

        {state?.activation && (
          <section className="mb-6 rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Current license</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {state.activation.customerEmail}
                </p>
              </div>
              <Badge className={state.isUsable ? 'badge-success' : 'badge-warning'}>
                {state.isUsable ? 'Ready' : 'Needs refresh'}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Plan" value={state.activation.plan} />
              <Info label="Status" value={state.activation.status} />
              <Info
                label="Works offline until"
                value={new Date(state.activation.offlineGraceEndsAt).toLocaleString()}
              />
              <Info label="This computer" value={state.installId} />
            </div>
            <Link href="/desktop" className="mt-5 block">
              <Button>
                Open desktop
                <CheckCircle className="h-4 w-4" />
              </Button>
            </Link>
          </section>
        )}

        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <Desktop className="h-6 w-6 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">License key</h2>
              <p className="text-sm text-muted-foreground">
                Paste the key from your account center.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseKey">License key</Label>
              <Input
                id="licenseKey"
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                placeholder="COOP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                required
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="mt-5 w-full"
            disabled={isSubmitting || !isTauriRuntime() || !licenseKey.trim()}
          >
            {isSubmitting ? 'Activating...' : 'Activate desktop'}
          </Button>
        </form>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
