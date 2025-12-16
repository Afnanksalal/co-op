'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ChatCircle,
  Clock,
  ArrowRight,
  Plus,
  MagnifyingGlass,
  Pencil,
  Check,
  X,
  PushPin,
  PushPinSlash,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Session } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

function groupSessionsByDate(sessions: Session[]): Record<string, Session[]> {
  const groups: Record<string, Session[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Separate pinned sessions
  const pinned = sessions.filter(s => s.isPinned);
  const unpinned = sessions.filter(s => !s.isPinned);

  if (pinned.length > 0) {
    groups['Pinned'] = pinned;
  }

  for (const session of unpinned) {
    const date = new Date(session.createdAt);
    let group: string;
    if (date >= today) group = 'Today';
    else if (date >= yesterday) group = 'Yesterday';
    else if (date >= weekAgo) group = 'This Week';
    else group = 'Earlier';
    if (!groups[group]) groups[group] = [];
    groups[group].push(session);
  }
  return groups;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchSessions = async (searchTerm?: string) => {
    try {
      const data = await api.getSessions(searchTerm);
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const groupedSessions = useMemo(() => groupSessionsByDate(sessions), [sessions]);
  const groupOrder = ['Pinned', 'Today', 'Yesterday', 'This Week', 'Earlier'];

  const handleTogglePin = async (session: Session, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const updated = await api.toggleSessionPin(session.id);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
      toast.success(updated.isPinned ? 'Session pinned' : 'Session unpinned');
    } catch {
      toast.error('Failed to update pin status');
    }
  };

  const handleStartEdit = (session: Session) => {
    setEditingId(session.id);
    setEditTitle(session.title || '');
  };

  const handleSaveTitle = async (id: string) => {
    if (!editTitle.trim()) { toast.error('Title cannot be empty'); return; }
    try {
      const updated = await api.updateSessionTitle(id, editTitle.trim());
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
      toast.success('Title updated');
    } catch { toast.error('Failed to update title'); }
  };

  const handleCancelEdit = () => { setEditingId(null); setEditTitle(''); };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-1">Sessions</h1>
          <p className="text-sm text-muted-foreground">Your conversation history with AI agents</p>
        </div>
        <Link href="/chat"><Button><Plus weight="bold" className="w-4 h-4" />New Session</Button></Link>
      </motion.div>

      <div className="relative">
        <MagnifyingGlass weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search sessions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {sessions.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-12 text-center">
            <ChatCircle weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-medium mb-2">{search ? 'No sessions found' : 'No sessions yet'}</h3>
            <p className="text-muted-foreground mb-6">{search ? 'Try a different search term' : 'Start a conversation with one of our AI agents'}</p>
            {!search && <Link href="/chat"><Button>Start Chat</Button></Link>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupOrder.map((group) => {
            const groupSessions = groupedSessions[group];
            if (!groupSessions?.length) return null;
            return (
              <motion.div key={group} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground px-1">{group}</h2>
                <div className="space-y-2">
                  {groupSessions.map((session, index) => (
                    <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <Card className={cn(
                        "border-border/40 hover:border-border transition-colors group",
                        session.isPinned && "border-primary/30 bg-primary/5"
                      )}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <ChatCircle weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                {editingId === session.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(session.id); if (e.key === 'Escape') handleCancelEdit(); }} />
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveTitle(session.id)}><Check weight="bold" className="w-3.5 h-3.5" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}><X weight="bold" className="w-3.5 h-3.5" /></Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group">
                                    <Link href={`/sessions/${session.id}`} className="font-medium text-sm truncate hover:underline">{session.title || 'Untitled Session'}</Link>
                                    <button onClick={(e) => { e.preventDefault(); handleStartEdit(session); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Pencil weight="regular" className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock weight="regular" className="w-3 h-3" />
                                  <span>{formatRelativeTime(session.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => handleTogglePin(session, e)}
                                className={cn(
                                  "p-1.5 rounded-md transition-colors",
                                  session.isPinned
                                    ? "text-primary hover:text-primary/80"
                                    : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                                )}
                                title={session.isPinned ? 'Unpin session' : 'Pin session'}
                              >
                                {session.isPinned ? (
                                  <PushPin weight="fill" className="w-4 h-4" />
                                ) : (
                                  <PushPinSlash weight="regular" className="w-4 h-4" />
                                )}
                              </button>
                              <Badge variant={session.status === 'active' ? 'default' : session.status === 'ended' ? 'secondary' : 'outline'} className="text-[10px] hidden sm:inline-flex">{session.status}</Badge>
                              <Link href={`/sessions/${session.id}`}><ArrowRight weight="bold" className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
