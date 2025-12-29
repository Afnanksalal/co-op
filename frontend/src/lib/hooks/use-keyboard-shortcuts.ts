import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Cmd+Enter in textareas
        if (!(e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        // On Mac, Cmd is meta. On Windows/Linux, Ctrl is ctrl.
        // Allow either for cross-platform support
        const modifierMatch = shortcut.meta || shortcut.ctrl
          ? (e.metaKey || e.ctrlKey)
          : (!e.metaKey && !e.ctrlKey);

        if (keyMatch && modifierMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalShortcuts() {
  const router = useRouter();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'k',
      meta: true,
      action: () => router.push('/chat'),
      description: 'New chat',
    },
    {
      key: 'k',
      ctrl: true,
      action: () => router.push('/chat'),
      description: 'New chat',
    },
    {
      key: '/',
      meta: true,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      },
      description: 'Focus search',
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
