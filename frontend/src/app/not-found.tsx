'use client';

import Link from 'next/link';
import { MagnifyingGlass, ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <MagnifyingGlass weight="light" className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="font-serif text-3xl font-medium tracking-tight mb-4">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button>
            <ArrowLeft weight="bold" className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
