'use client';

import Link from 'next/link';
import { Warning, ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <Warning weight="light" className="mx-auto mb-6 h-16 w-16 text-muted-foreground" />
        <h1 className="mb-4 font-serif text-3xl font-medium tracking-tight">
          Something went wrong
        </h1>
        <p className="mb-8 text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mb-6 text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
          <Link href="/">
            <Button>
              <ArrowLeft weight="bold" className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
