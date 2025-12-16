'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  ShieldCheck,
  Code,
  List,
  X,
  BookmarkSimple,
} from '@phosphor-icons/react';
import { useUser, useRequireAuth, useGlobalShortcuts } from '@/lib/hooks';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PremiumBackground } from '@/components/ui/background';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: House },
  { name: 'Chat', href: '/chat', icon: ChatCircle },
  { name: 'Sessions', href: '/sessions', icon: ClockCounterClockwise },
  { name: 'Bookmarks', href: '/bookmarks', icon: BookmarkSimple },
  { name: 'Usage', href: '/usage', icon: ChartBar },
];

const agents = [
  { name: 'Legal', href: '/agents/legal', icon: Scales },
  { name: 'Finance', href: '/agents/finance', icon: ChartLineUp },
  { name: 'Investor', href: '/agents/investor', icon: UsersThree },
  { name: 'Competitor', href: '/agents/competitor', icon: Globe },
];

const settings = [
  { name: 'Developers', href: '/developers', icon: Code },
  { name: 'API Keys', href: '/settings/api-keys', icon: Key },
  { name: 'Webhooks', href: '/settings/webhooks', icon: WebhooksLogo },
  { name: 'Settings', href: '/settings', icon: Gear },
];


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useRequireAuth({ requireOnboarding: true });
  const { signOut, isAdmin } = useUser();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global keyboard shortcuts
  useGlobalShortcuts();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

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

  const adminNav = isAdmin
    ? [
        { name: 'Analytics', href: '/analytics', icon: ChartBar },
        { name: 'Admin', href: '/admin', icon: ShieldCheck },
      ]
    : [];

  const NavItem = ({ item, collapsed = false, onClick }: { item: typeof navigation[0]; collapsed?: boolean; onClick?: () => void }) => {
    // For /settings, only match exactly (not /settings/api-keys or /settings/webhooks)
    const isActive = item.href === '/settings' 
      ? pathname === '/settings'
      : pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link href={item.href} onClick={onClick}>
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
          {!collapsed && (
            <span className="text-sm">{item.name}</span>
          )}
        </div>
      </Link>
    );
  };

  const SidebarContent = ({ collapsed = false, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) => (
    <>
      {/* Main nav */}
      <div className="space-y-1">
        {[...navigation, ...adminNav].map((item) => (
          <NavItem key={item.name} item={item} collapsed={collapsed} onClick={onItemClick} />
        ))}
      </div>

      {/* Agents */}
      <div>
        {!collapsed && (
          <p className="px-3 mb-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Agents
          </p>
        )}
        <div className="space-y-1">
          {agents.map((agent) => (
            <NavItem key={agent.name} item={agent} collapsed={collapsed} onClick={onItemClick} />
          ))}
        </div>
      </div>

      {/* Settings */}
      <div>
        {!collapsed && (
          <p className="px-3 mb-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Settings
          </p>
        )}
        <div className="space-y-1">
          {settings.map((item) => (
            <NavItem key={item.name} item={item} collapsed={collapsed} onClick={onItemClick} />
          ))}
        </div>
      </div>
    </>
  );


  return (
    <div className="min-h-screen bg-background flex relative">
      <PremiumBackground />

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/40 bg-background/95 backdrop-blur-sm flex md:hidden items-center justify-between px-4">
        <Link href="/dashboard" className="font-serif text-lg font-semibold tracking-tight">
          Co-Op
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="w-9 h-9"
        >
          <List weight="bold" className="w-5 h-5" />
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Slide-out Menu */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border/40 flex flex-col md:hidden"
            >
              {/* Mobile Menu Header */}
              <div className="h-14 flex items-center justify-between px-4 border-b border-border/40">
                <span className="font-serif text-lg font-semibold">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9"
                >
                  <X weight="bold" className="w-5 h-5" />
                </Button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
                <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
              </nav>

              {/* Mobile User Section */}
              <div className="p-3 border-t border-border/40">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.startup?.companyName}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 w-8 h-8">
                    <SignOut weight="regular" className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 top-0 bottom-0 z-40 border-r border-border/40 bg-background hidden md:flex flex-col"
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
          <SidebarContent collapsed={sidebarCollapsed} />
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
          'pt-14 md:pt-0',
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        )}
      >
        <div className="min-h-screen p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
