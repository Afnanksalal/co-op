import { notFound } from 'next/navigation';
import { LocalCoOpShell } from '@/components/desktop/local-coop-shell';

export default function DesktopPage() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_TAURI !== '1') {
    notFound();
  }

  return <LocalCoOpShell />;
}
