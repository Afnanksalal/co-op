import {
  Briefcase,
  Calculator,
  ChatsCircle,
  House,
  Plugs,
  ShieldCheck,
  UsersThree,
} from '@phosphor-icons/react';
import type { NavItem, View } from './shell-types';

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const primaryNavGroups: NavGroup[] = [
  {
    label: 'Work',
    items: [
      { id: 'dashboard', label: 'Today', icon: House },
      { id: 'chat', label: 'Ask', icon: ChatsCircle },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'workspace', label: 'Company', icon: Briefcase },
      { id: 'outreach', label: 'Customers', icon: UsersThree },
      { id: 'tools', label: 'Money', icon: Calculator },
    ],
  },
];

export const accountNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Plugs },
  { id: 'activation', label: 'License', icon: ShieldCheck },
];

export function primaryViewFor(view: View): View {
  if (['workspace', 'rag', 'memory', 'research'].includes(view)) return 'workspace';
  if (view === 'history') return 'dashboard';
  return view;
}

export function navItemActive(item: NavItem, view: View): boolean {
  return item.id === primaryViewFor(view);
}
