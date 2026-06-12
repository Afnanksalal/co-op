'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowsClockwise, Copy, Key } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { CreatedLicense, LicensePlan, LicenseSummary } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<LicenseSummary[]>([]);
  const [created, setCreated] = useState<CreatedLicense | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [plan, setPlan] = useState<LicensePlan>('team');
  const [seats, setSeats] = useState('1');
  const [maxDevices, setMaxDevices] = useState('2');
  const [expiresAt, setExpiresAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    refreshLicenses().catch((error) =>
      setError(error instanceof Error ? error.message : 'Failed to load licenses')
    );
  }, []);

  async function refreshLicenses() {
    setLicenses(await api.listLicenses());
  }

  async function createLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setCreated(null);

    try {
      const result = await api.createLicense({
        customerEmail,
        plan,
        seats: Number(seats),
        maxDevices: Number(maxDevices),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCreated(result);
      setCustomerEmail('');
      await refreshLicenses();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create license');
    } finally {
      setIsLoading(false);
    }
  }

  async function copyLicense() {
    if (!created?.licenseKey) return;
    await navigator.clipboard.writeText(created.licenseKey);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">License keys</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate device-bound desktop software licenses for paying customers.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refreshLicenses()}>
          <ArrowsClockwise className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <form onSubmit={createLicense} className="rounded-lg border border-border bg-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <Key className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Generate license</h2>
            <p className="text-sm text-muted-foreground">
              The raw key is shown only once. Co-Op stores only the keyed hash.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="customerEmail">Customer email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={(value) => setPlan(value as LicensePlan)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seats">Seats</Label>
            <Input
              id="seats"
              type="number"
              min={1}
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxDevices">Devices</Label>
            <Input
              id="maxDevices"
              type="number"
              min={1}
              value={maxDevices}
              onChange={(event) => setMaxDevices(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="expiresAt">Expires at</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        {created && (
          <div className="mt-4 rounded-md border border-green-500/30 bg-green-500/10 p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              License generated
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="coop-scrollbar max-w-full overflow-x-auto rounded bg-background px-3 py-2 text-sm">
                {created.licenseKey}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyLicense()}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        )}

        <Button type="submit" className="mt-5" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate license'}
        </Button>
      </form>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-xl font-semibold">Issued licenses</h2>
        </div>
        <div className="coop-scrollbar overflow-x-auto">
          <table className="w-full min-w-[54rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Devices</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr key={license.id} className="border-t border-border">
                  <td className="break-all px-4 py-3">{license.customerEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs">{license.licensePrefix}</td>
                  <td className="break-words px-4 py-3">{license.plan}</td>
                  <td className="px-4 py-3">
                    {license.activeDevices}/{license.maxDevices}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={license.status === 'active' ? 'badge-success' : 'badge-warning'}
                    >
                      {license.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
              {licenses.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                    No licenses generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
