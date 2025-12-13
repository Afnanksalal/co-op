'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House,
  ChatCircle,
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  Key,
  WebhooksLogo,
  Gear,
  SignOut,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  ChartBar,
} from '@phosphor-icons/react';
import { useUser, useRequireAuth } from '@/lib/hooks';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PremiumBackground } from '@/components/ui/background';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: House },
  { name: 'Chat', href: '/chat', icon: ChatCircle },
  { name: 'Sessions', href: '/sessions', icon: ClockCounterClockwise },
];

const agents = [
  { name: 'Legal', href: '/agents/legal', icon: Scales },
  { name: 'Finance', href: '/agents/finance', icon: ChartLineUp },
  { name: 'Investor', href: '/agents/investor', icon: UsersThree },
  { name: 'Competitor', href: '/agents/competitor', icon: Globe },
];

const settings = [
  { name: 'API Keys', href: '/settings/api-keys', icon: Key },
  { name: 'Webhooks', href: '/settings/webhooks', icon: WebhooksLogo },
  { name: 'Settings', href: '/settings', icon: Gear },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useRequireAuth({ requireOnboarding: true });
  const { signOut, isAdmin } = useUser();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const adminNav = isAdmin ? [{ name: 'Analytics', href: '/analytics', icon: ChartBar }] : [];

  return (
    <div className="min-h-screen bg-background flex relative">
      <PremiumBackground />
      
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 top-0 bottom-0 z-40 border-r border-border/40 bg-background flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border/40">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-serif text-xl font-semibold tracking-tight"
                >
                  Co-Op
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="shrink-0 w-8 h-8"
          >
            {sidebarCollapsed ? (
              <CaretRight weight="bold" className="w-4 h-4" />
            ) : (
              <CaretLeft weight="bold" className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
          {/* Main nav */}
          <div className="space-y-1">
            {[...navigation, ...adminNav].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <item.icon
                      weight={isActive ? 'fill' : 'regular'}
                      className="w-5 h-5 shrink-0"
                    />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-sm"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Agents */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 mb-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Agents
              </p>
            )}
            <div className="space-y-1">
              {agents.map((agent) => {
                const isActive = pathname === agent.href;
                return (
                  <Link key={agent.name} href={agent.href}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <agent.icon
                        weight={isActive ? 'fill' : 'regular'}
                        className="w-5 h-5 shrink-0"
                      />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm"
                          >
                            {agent.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 mb-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Settings
              </p>
            )}
            <div className="space-y-1">
              {settings.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <item.icon
                        weight={isActive ? 'fill' : 'regular'}
                        className="w-5 h-5 shrink-0"
                      />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border/40">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">
              {user.name?.charAt(0) || 'U'}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.startup?.companyName}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 w-8 h-8">
              <SignOut weight="regular" className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
      >
        <div className="min-h-screen p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
