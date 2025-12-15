'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Warning, ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <Warning weight="light" className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="font-serif text-3xl font-medium tracking-tight mb-4">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft weight="bold" className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
