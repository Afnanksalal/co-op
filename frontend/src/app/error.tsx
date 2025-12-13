'use client';

import { useEffect } from 'react';
import { Warning, ArrowClockwise, House } from '@phosphor-icons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <Warning weight="light" className="w-16 h-16 text-destructive mx-auto mb-8" />
        <h1 className="font-serif text-2xl font-medium mb-3">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} variant="outline">
            <ArrowClockwise weight="bold" className="w-4 h-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button>
              <House weight="bold" className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-8">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
