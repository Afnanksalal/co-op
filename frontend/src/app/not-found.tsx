'use client';

import Link from 'next/link';
import { FileX, House, ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <FileX weight="light" className="w-16 h-16 text-muted-foreground mx-auto mb-8" />
        <h1 className="font-serif text-6xl font-medium mb-2">404</h1>
        <h2 className="font-serif text-xl font-medium mb-3">Page not found</h2>
        <p className="text-muted-foreground text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button>
              <House weight="bold" className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft weight="bold" className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
