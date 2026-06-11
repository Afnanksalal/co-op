'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowsClockwise, Copy, Desktop, DownloadSimple, Key, SignOut, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import type { CreatedLicense, LicenseSummary } from '@/lib/api/types';
import { clearAllAuthStorage, createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [licenses, setLicenses] = useState<LicenseSummary[]>([]);
  const [createdLicense, setCreatedLicense] = useState<CreatedLicense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const activeLicense = useMemo(
    () => licenses.find(license => license.status === 'active' && (!license.expiresAt || new Date(license.expiresAt).getTime() > Date.now())),
    [licenses],
  );

  useEffect(() => {
    void loadAccount();
  }, []);

  async function loadAccount() {
    setIsLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.email) {
        router.replace('/login?next=/account');
        return;
      }

      setEmail(session.user.email);
      setLicenses(await api.listMyLicenses());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load account center');
    } finally {
      setIsLoading(false);
    }
  }

  async function generateActivationKey() {
    setIsGenerating(true);
    setError('');
    setCreatedLicense(null);

    try {
      const license = await api.createSelfServiceLicense();
      setCreatedLicense(license);
      await loadAccount();
      toast.success('Activation key generated');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate activation key');
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyActivationKey() {
    if (!createdLicense?.licenseKey) return;
    await navigator.clipboard.writeText(createdLicense.licenseKey);
    toast.success('Activation key copied');
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => undefined);
    clearAllAuthStorage();
    router.replace('/login');
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-serif text-xl font-semibold tracking-normal">Co-Op</Link>
          <div className="flex items-center gap-2">
            <Link href="/download">
              <Button variant="outline" size="sm">
                <DownloadSimple className="h-4 w-4" />
                Download
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <SignOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-4">Account center</Badge>
            <h1 className="text-3xl font-semibold tracking-normal">License and activation</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {email || 'Loading account'} manages desktop activation keys and software downloads here.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadAccount()} disabled={isLoading}>
            <ArrowsClockwise className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <Warning className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {createdLicense && (
          <section className="rounded-lg border border-green-500/30 bg-green-500/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Activation key generated</p>
                <code className="mt-2 block overflow-x-auto rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {createdLicense.licenseKey}
                </code>
                <p className="mt-2 text-xs text-muted-foreground">Copy it now. The raw key is shown only once.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => void copyActivationKey()}>
                <Copy className="h-4 w-4" />
                Copy key
              </Button>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-3">
              <Key className="h-6 w-6 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold tracking-normal">Activation key</h2>
                <p className="text-sm text-muted-foreground">Generate a desktop license for this account.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Account" value={email || 'Loading'} />
              <Row label="Active license" value={activeLicense ? activeLicense.licensePrefix : 'None'} />
              <Row label="Devices" value={activeLicense ? `${activeLicense.activeDevices}/${activeLicense.maxDevices}` : 'Unavailable'} />
              <Row label="Plan" value={activeLicense?.plan ?? 'Unavailable'} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => void generateActivationKey()} disabled={Boolean(activeLicense) || isGenerating || isLoading}>
                {isGenerating ? 'Generating...' : 'Generate activation key'}
              </Button>
              <Link href="/download">
                <Button variant="outline">
                  <DownloadSimple className="h-4 w-4" />
                  Download software
                </Button>
              </Link>
            </div>

            {activeLicense && (
              <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                This account already has an active license. Use the existing activation key prefix shown in the table, or contact support to rotate the license.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-3">
              <Desktop className="h-6 w-6 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold tracking-normal">Desktop setup</h2>
                <p className="text-sm text-muted-foreground">Install locally, then activate with the generated key.</p>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                'Download and install Co-Op Desktop.',
                'Open the Activation tab in the desktop app.',
                'Paste the activation key from this account center.',
                'Configure Ollama or an OpenAI-compatible BYOK provider locally.',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold tracking-normal">Your licenses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Key prefix</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Devices</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map(license => (
                  <tr key={license.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{license.licensePrefix}</td>
                    <td className="px-4 py-3">{license.plan}</td>
                    <td className="px-4 py-3">{license.activeDevices}/{license.maxDevices}</td>
                    <td className="px-4 py-3">
                      <Badge className={license.status === 'active' ? 'badge-success' : 'badge-warning'}>{license.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never'}</td>
                  </tr>
                ))}
                {!isLoading && licenses.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>No licenses yet.</td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>Loading licenses...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value}</span>
    </div>
  );
}
