'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Fingerprint } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { footerLinks, navLinks } from './data';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Co-Op" width={34} height={34} className="rounded-md" priority />
          <span className="font-serif text-xl font-semibold">Co-Op</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
          {navLinks.map(([label, href]) =>
            href.startsWith('#') ? (
              <a key={href} href={href} className="hover:text-foreground">
                {label}
              </a>
            ) : (
              <Link key={href} href={href} className="hover:text-foreground">
                {label}
              </Link>
            )
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/download">
            <Button size="sm">
              Download
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container-wide flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Fingerprint className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Co-Op Software</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {footerLinks.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-foreground">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
