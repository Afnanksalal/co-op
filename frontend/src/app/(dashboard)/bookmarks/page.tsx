'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookmarkSimple,
  MagnifyingGlass,
  Trash,
  Copy,
  Check,
  Tag,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Bookmark } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { copyToClipboard, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async (searchTerm?: string) => {
    try {
      const data = await api.getBookmarks(searchTerm);
      setBookmarks(data);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      toast.error('Failed to load bookmarks');
    }
    setIsLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookmarks(search);
  };

  const handleCopy = async (content: string, id: string) => {
    await copyToClipboard(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bookmark deleted');
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      toast.error('Failed to delete bookmark');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight">
            Saved Responses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your bookmarked AI responses
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {/* Bookmarks List */}
      {bookmarks.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-12 text-center">
            <BookmarkSimple weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-medium mb-2">No bookmarks yet</h3>
            <p className="text-sm text-muted-foreground">
              Save responses from chat to access them later
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark, index) => (
            <motion.div
              key={bookmark.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-border/40 hover:border-border transition-colors">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-medium text-sm sm:text-base">{bookmark.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(bookmark.createdAt)}</span>
                        {bookmark.agent && (
                          <>
                            <span>·</span>
                            <Badge variant="outline" className="text-[10px]">
                              {bookmark.agent}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(bookmark.content, bookmark.id)}
                        className="h-8 w-8"
                      >
                        {copiedId === bookmark.id ? (
                          <Check weight="bold" className="w-4 h-4" />
                        ) : (
                          <Copy weight="regular" className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(bookmark.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash weight="regular" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {bookmark.content}
                  </p>
                  {bookmark.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <Tag weight="regular" className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {bookmark.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
