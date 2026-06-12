'use client';

import Image from 'next/image';
import {
  ChatCircleDots,
  FileText,
  MagnifyingGlass,
  ShieldCheck,
} from '@phosphor-icons/react';
import { m } from './motion';

const screens = [
  {
    title: 'Ask',
    eyebrow: 'Private advisor',
    body: 'Ask for plans, decisions, drafts, and reviews using your saved business context.',
    icon: ChatCircleDots,
  },
  {
    title: 'Files',
    eyebrow: 'Company memory',
    body: 'Upload company docs and turn them into useful facts, links, and searchable context.',
    icon: FileText,
  },
  {
    title: 'Research',
    eyebrow: 'Market work',
    body: 'Run focused market, competitor, pricing, investor, and risk research from one place.',
    icon: MagnifyingGlass,
  },
];

export function HeroScreenshot() {
  return (
    <m.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-black/25"
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/35 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <p className="text-xs text-muted-foreground">Co-Op Desktop</p>
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="relative aspect-[16/9] bg-muted">
        <Image
          src="/software-dashboard.png"
          alt="Co-Op desktop dashboard showing company context, plans, files, customers, and business areas"
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover object-left-top"
        />
      </div>
    </m.div>
  );
}

export function ScreenshotStrip() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {screens.map(({ title, eyebrow, body, icon: Icon }, index) => (
        <m.article
          key={title}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5, delay: index * 0.04 }}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="border-b border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {eyebrow}
                </p>
                <h3 className="font-serif text-xl font-semibold">{title}</h3>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="h-2 w-4/5 rounded-full bg-muted" />
            <div className="h-2 w-3/5 rounded-full bg-muted" />
            <div className="rounded-md border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
              {body}
            </div>
          </div>
        </m.article>
      ))}
    </div>
  );
}
