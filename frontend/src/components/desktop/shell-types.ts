import type { ComponentType } from 'react';

export type View =
  | 'dashboard'
  | 'onboarding'
  | 'activation'
  | 'workspace'
  | 'chat'
  | 'rag'
  | 'research'
  | 'outreach'
  | 'tools'
  | 'settings'
  | 'history';

export type DesktopIcon = ComponentType<{
  className?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}>;

export type NavItem = { id: View; label: string; icon: DesktopIcon };
