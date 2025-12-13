'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBar,
  Users,
  ChatCircle,
  Buildings,
  Pulse,
  Lightning,
  FilePdf,
  Upload,
  Trash,
  Database,
  Broom,
  Check,
  Warning,
  Clock,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useRequireAdmin } from '@/lib/hooks';
import type { DashboardStats, Embedding, EventAggregation } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const DOMAINS = [
  { value: 'legal', label: 'Legal' },
  { value: 'finance', label: 'Finance' },
];

const SECTORS = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'greentech', label: 'Greentech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
];

export default function AnalyticsPage() {
  const { isAdmin, isLoading: authLoading } = useRequireAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventAggregation[]>([]);
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDomain, setUploadDomain] = useState('legal');
  const [uploadSector, setUploadSector] = useState('saas');
  const [isUploading, setIsUploading] = useState(false);

  // Filter state
  const [filterDomain, setFilterDomain] = useState<string>('');
  const [filterSector, setFilterSector] = useState<string>('');

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchEmbeddings();
  }, [isAdmin, filterDomain, filterSector]);

  const fetchData = async () => {
    try {
      const [statsData, eventsData] = await Promise.all([
        api.getDashboardStats(),
        api.getEventAggregation(7),
      ]);
      setStats(statsData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    }
    setIsLoading(false);
  };

  const fetchEmbeddings = async () => {
    try {
      const result = await api.getEmbeddings({
        domain: filterDomain || undefined,
        sector: filterSector || undefined,
        limit: 20,
      });
      setEmbeddings(result.data);
    } catch (error) {
      console.error('Failed to fetch embeddings:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size exceeds 50MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      await api.uploadPdf(selectedFile, uploadDomain, uploadSector);
      toast.success('PDF uploaded successfully');
      setSelectedFile(null);
      await fetchEmbeddings();
    } catch (error) {
      console.error('Failed to upload:', error);
      toast.error('Failed to upload PDF');
    }
    setIsUploading(false);
  };

  const handleVectorize = async (id: string) => {
    try {
      const result = await api.vectorizeEmbedding(id);
      toast.success(`Vectorized ${result.chunksCreated} chunks`);
      await fetchEmbeddings();
    } catch (error) {
      console.error('Failed to vectorize:', error);
      toast.error('Failed to vectorize');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this embedding?')) return;

    try {
      await api.deleteEmbedding(id);
      toast.success('Embedding deleted');
      await fetchEmbeddings();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Remove vectors not accessed in 30 days?')) return;

    try {
      const result = await api.cleanupEmbeddings(30);
      toast.success(`Cleaned ${result.filesCleaned} files, removed ${result.vectorsRemoved} vectors`);
      await fetchEmbeddings();
    } catch (error) {
      console.error('Failed to cleanup:', error);
      toast.error('Failed to cleanup');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-3xl font-medium tracking-tight mb-2">Analytics</h1>
        <p className="text-muted-foreground">Platform statistics and RAG management</p>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users },
            { label: 'Total Sessions', value: stats.totalSessions, icon: ChatCircle },
            { label: 'Active Sessions', value: stats.activeSessions, icon: Pulse },
            { label: 'Startups', value: stats.totalStartups, icon: Buildings },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-serif font-medium">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <stat.icon weight="light" className="w-6 h-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Events by Type */}
      {stats && stats.eventsByType.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Events (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.eventsByType.map((event) => (
                  <Badge key={event.type} variant="secondary" className="text-sm">
                    {event.type}: {event.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* RAG Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <Database weight="bold" className="w-6 h-6" />
          <h2 className="font-serif text-2xl font-medium">RAG Management</h2>
        </div>

        {/* Upload */}
        <Card className="border-border/40">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Upload weight="bold" className="w-5 h-5" />
              Upload PDF
            </CardTitle>
            <CardDescription>Upload documents for legal and finance agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={uploadDomain} onValueChange={setUploadDomain}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select value={uploadSector} onValueChange={setUploadSector}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PDF File</Label>
                <Input type="file" accept=".pdf" onChange={handleFileChange} />
              </div>
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FilePdf weight="fill" className="w-4 h-4 text-red-500" />
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}

            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
              <Upload weight="bold" className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </CardContent>
        </Card>

        {/* Embeddings List */}
        <Card className="border-border/40">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-lg">Embeddings</CardTitle>
                <CardDescription>{embeddings.length} documents</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCleanup}>
                <Broom weight="bold" className="w-4 h-4" />
                Cleanup
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Select value={filterDomain} onValueChange={setFilterDomain}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Domains</SelectItem>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSector} onValueChange={setFilterSector}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sectors</SelectItem>
                  {SECTORS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {embeddings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No embeddings yet</p>
            ) : (
              <div className="space-y-2">
                {embeddings.map((emb) => (
                  <div
                    key={emb.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/40"
                  >
                    <div className="flex items-center gap-3">
                      <FilePdf weight="fill" className="w-6 h-6 text-red-500" />
                      <div>
                        <p className="font-medium text-sm">{emb.filename}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {emb.domain}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {emb.sector}
                          </Badge>
                          <span>{formatRelativeTime(emb.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          emb.status === 'indexed'
                            ? 'default'
                            : emb.status === 'expired'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {emb.status === 'indexed' && <Check weight="bold" className="w-3 h-3 mr-1" />}
                        {emb.status === 'expired' && <Warning weight="bold" className="w-3 h-3 mr-1" />}
                        {emb.status === 'pending' && <Clock weight="bold" className="w-3 h-3 mr-1" />}
                        {emb.status}
                      </Badge>
                      {emb.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => handleVectorize(emb.id)}>
                          <Lightning weight="bold" className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(emb.id)}
                        className="text-destructive hover:text-destructive h-7 w-7"
                      >
                        <Trash weight="regular" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
