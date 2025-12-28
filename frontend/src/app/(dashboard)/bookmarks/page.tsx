'use client';

import { useEffect, useState } from 'react';
import { motion } from '@/components/motion';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">
          Saved Responses
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Your bookmarked AI responses
        </p>
      </motion.div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="pl-9 h-9 sm:h-10 text-sm"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 sm:h-10">
          Search
        </Button>
      </form>

      {/* Bookmarks List */}
      {bookmarks.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-8 sm:p-12 text-center">
            <BookmarkSimple weight="light" className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="font-serif text-lg sm:text-xl font-medium mb-2">No bookmarks yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Save responses from chat to access them later
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-4">
          {bookmarks.map((bookmark, index) => (
            <motion.div
              key={bookmark.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-border/40 hover:border-border transition-colors">
                <CardContent className="p-3 sm:p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm truncate">{bookmark.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">
                        <span>{formatRelativeTime(bookmark.createdAt)}</span>
                        {bookmark.agent && (
                          <>
                            <span>·</span>
                            <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                              {bookmark.agent}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash weight="regular" className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Bookmark</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete &quot;{bookmark.title}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(bookmark.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                    {bookmark.content}
                  </p>
                  {Array.isArray(bookmark.tags) && bookmark.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 sm:mt-3">
                      <Tag weight="regular" className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {bookmark.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[9px] sm:text-[10px]">
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
