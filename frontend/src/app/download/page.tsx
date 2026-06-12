'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, DownloadSimple, Key, ShieldCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const releaseDownloadsUrl =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://github.com/Afnanksalal/co-op/releases';

const downloads = [
  {
    name: 'Windows installer',
    description: 'Recommended for most business users.',
    href: releaseDownloadsUrl,
    cta: 'Open release downloads',
  },
  {
    name: 'Managed deployment package',
    description: 'Use this for managed device deployment and internal software catalogs.',
    href: releaseDownloadsUrl,
    cta: 'Open packages',
  },
];

const activationSteps = [
  {
    title: 'Create account',
    description: 'Use the web account to manage payment and license ownership.',
    icon: ShieldCheck,
  },
  {
    title: 'Generate license',
    description: 'Generate the activation key from your account center.',
    icon: Key,
  },
  {
    title: 'Activate locally',
    description: 'The desktop app keeps license access available during short connection gaps.',
    icon: CheckCircle,
  },
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Co-Op
        </Link>

        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-4">
              Desktop software
            </Badge>
            <h1 className="text-4xl font-semibold tracking-normal">Download Co-Op Desktop</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Install the desktop app, activate with your license key, then choose the assistant
              setup your business wants to use.
            </p>
          </div>
          <Image
            src="/logo.png"
            alt="Co-Op"
            width={80}
            height={80}
            className="rounded-xl border border-border"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {downloads.map((download) => (
            <section key={download.name} className="rounded-lg border border-border bg-card p-6">
              <DownloadSimple className="mb-8 h-7 w-7 text-muted-foreground" />
              <h2 className="text-xl font-semibold">{download.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                {download.description}
              </p>
              <a
                href={download.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 block"
              >
                <Button className="w-full">
                  {download.cta}
                  <DownloadSimple className="h-4 w-4" />
                </Button>
              </a>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="text-xl font-semibold">Activation flow</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {activationSteps.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-md border border-border bg-background p-4">
                <Icon className="mb-4 h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/account">
              <Button variant="outline">Manage account</Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
