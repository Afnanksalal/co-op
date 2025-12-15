'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Upload,
  Trash,
  Lightning,
  HardDrives,
  Plus,
  Plug,
  PlugsConnected,
  CircleNotch,
  MagnifyingGlass,
  Broom,
} from '@phosphor-icons/react/dist/ssr';
import { api } from '@/lib/api/client';
import { useRequireAdmin } from '@/lib/hooks';
import type { Embedding, McpServer, McpTool, RagDomain, Sector } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const RAG_DOMAINS: RagDomain[] = ['legal', 'finance'];
const SECTORS: Sector[] = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'];

export default function AdminPage() {
  const { isLoading: authLoading, isAdmin } = useRequireAdmin();

  // RAG State
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [isLoadingEmbeddings, setIsLoadingEmbeddings] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<RagDomain | 'all'>('all');
  const [selectedSector, setSelectedSector] = useState<Sector | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDomain, setUploadDomain] = useState<RagDomain>('legal');
  const [uploadSector, setUploadSector] = useState<Sector>('fintech');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MCP State
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [isLoadingMcp, setIsLoadingMcp] = useState(true);
  const [showMcpDialog, setShowMcpDialog] = useState(false);
  const [mcpForm, setMcpForm] = useState({ id: '', name: '', baseUrl: '', apiKey: '' });
  const [isSavingMcp, setIsSavingMcp] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<McpTool[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  // Track if data has been loaded
  const dataLoadedRef = useRef(false);

  const loadEmbeddings = async (domain: string, sector: string) => {
    try {
      const params: { domain?: string; sector?: string } = {};
      if (domain !== 'all') params.domain = domain;
      if (sector !== 'all') params.sector = sector;
      const result = await api.getEmbeddings(params);
      setEmbeddings(result.data);
    } catch (error) {
      console.error('Failed to fetch embeddings:', error);
      toast.error('Failed to load embeddings');
    }
    setIsLoadingEmbeddings(false);
  };

  const loadMcpServers = async () => {
    try {
      const servers = await api.getMcpServers();
      setMcpServers(servers);
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    }
    setIsLoadingMcp(false);
  };

  useEffect(() => {
    if (authLoading || !isAdmin || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    loadEmbeddings('all', 'all');
    loadMcpServers();
  }, [authLoading, isAdmin]);

  const handleDomainChange = (value: string) => {
    setSelectedDomain(value as RagDomain | 'all');
    loadEmbeddings(value, selectedSector);
  };

  const handleSectorChange = (value: string) => {
    setSelectedSector(value as Sector | 'all');
    loadEmbeddings(selectedDomain, value);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    setIsUploading(true);
    try {
      await api.uploadPdf(file, uploadDomain, uploadSector);
      toast.success('PDF uploaded successfully');
      setShowUploadDialog(false);
      loadEmbeddings(selectedDomain, selectedSector);
    } catch (error) {
      console.error('Failed to upload PDF:', error);
      toast.error('Failed to upload PDF');
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVectorize = async (id: string) => {
    try {
      const result = await api.vectorizeEmbedding(id);
      toast.success(`Vectorized ${result.chunksCreated} chunks`);
      loadEmbeddings(selectedDomain, selectedSector);
    } catch (error) {
      console.error('Failed to vectorize:', error);
      toast.error('Failed to vectorize');
    }
  };

  const handleDeleteEmbedding = async (id: string) => {
    if (!confirm('Delete this embedding?')) return;
    try {
      await api.deleteEmbedding(id);
      toast.success('Embedding deleted');
      loadEmbeddings(selectedDomain, selectedSector);
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Clean up old embeddings?')) return;
    try {
      const result = await api.cleanupEmbeddings(30);
      toast.success(`Cleaned ${result.filesCleaned} files`);
      loadEmbeddings(selectedDomain, selectedSector);
    } catch (error) {
      console.error('Failed to cleanup:', error);
      toast.error('Failed to cleanup');
    }
  };

  const handleRegisterMcp = async () => {
    if (!mcpForm.id || !mcpForm.name || !mcpForm.baseUrl) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsSavingMcp(true);
    try {
      await api.registerMcpServer({
        id: mcpForm.id,
        name: mcpForm.name,
        baseUrl: mcpForm.baseUrl,
        apiKey: mcpForm.apiKey || undefined,
      });
      toast.success('MCP server registered');
      setShowMcpDialog(false);
      setMcpForm({ id: '', name: '', baseUrl: '', apiKey: '' });
      loadMcpServers();
    } catch (error) {
      console.error('Failed to register:', error);
      toast.error('Failed to register');
    }
    setIsSavingMcp(false);
  };

  const handleUnregisterMcp = async (id: string) => {
    if (!confirm('Unregister this server?')) return;
    try {
      await api.unregisterMcpServer(id);
      toast.success('Server unregistered');
      if (selectedServer === id) {
        setSelectedServer(null);
        setServerTools([]);
      }
      loadMcpServers();
    } catch (error) {
      console.error('Failed to unregister:', error);
      toast.error('Failed to unregister');
    }
  };

  const handleDiscoverTools = async (serverId: string) => {
    setSelectedServer(serverId);
    setIsLoadingTools(true);
    try {
      const tools = await api.discoverMcpTools(serverId);
      setServerTools(tools);
      toast.success(`Discovered ${tools.length} tools`);
    } catch (error) {
      console.error('Failed to discover:', error);
      toast.error('Failed to discover tools');
    }
    setIsLoadingTools(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-1 sm:mb-2">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage RAG embeddings and MCP servers</p>
      </motion.div>

      <Tabs defaultValue="rag" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rag" className="gap-2">
            <FileText weight="regular" className="w-4 h-4" />
            RAG Embeddings
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-2">
            <HardDrives weight="regular" className="w-4 h-4" />
            MCP Servers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rag" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Select value={selectedDomain} onValueChange={handleDomainChange}>
                <SelectTrigger className="w-[110px] sm:w-[140px] text-xs sm:text-sm">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {RAG_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSector} onValueChange={handleSectorChange}>
                <SelectTrigger className="w-[110px] sm:w-[140px] text-xs sm:text-sm">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCleanup} size="sm" className="h-9">
                <Broom weight="regular" className="w-4 h-4" />
                <span className="hidden sm:inline">Cleanup</span>
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9"><Upload weight="bold" className="w-4 h-4" /><span className="hidden sm:inline">Upload PDF</span><span className="sm:hidden">Upload</span></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload PDF for RAG</DialogTitle>
                    <DialogDescription>Upload a PDF document for RAG embeddings.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Domain</Label>
                      <Select value={uploadDomain} onValueChange={(v) => setUploadDomain(v as RagDomain)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RAG_DOMAINS.map((d) => (
                            <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sector</Label>
                      <Select value={uploadSector} onValueChange={(v) => setUploadSector(v as Sector)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SECTORS.map((s) => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>PDF File</Label>
                      <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                    {isUploading && <Button disabled><CircleNotch weight="bold" className="w-4 h-4 animate-spin" />Uploading...</Button>}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoadingEmbeddings ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : embeddings.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-12 text-center">
                <FileText weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl font-medium mb-2">No embeddings</h3>
                <p className="text-muted-foreground">Upload PDFs to create RAG embeddings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {embeddings.map((emb) => (
                <Card key={emb.id} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <FileText weight="regular" className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{emb.filename}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">{emb.domain}</Badge>
                            <Badge variant="outline" className="text-[10px]">{emb.sector}</Badge>
                            <span>·</span>
                            <span>{emb.chunksCreated} chunks</span>
                            <span>·</span>
                            <span>{formatRelativeTime(emb.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={emb.status === 'indexed' ? 'default' : emb.status === 'pending' ? 'secondary' : 'outline'}>{emb.status}</Badge>
                        {emb.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => handleVectorize(emb.id)}>
                            <Lightning weight="bold" className="w-4 h-4" />Vectorize
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteEmbedding(emb.id)} className="text-destructive hover:text-destructive">
                          <Trash weight="regular" className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mcp" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage MCP servers for extended agent capabilities</p>
            <Dialog open={showMcpDialog} onOpenChange={setShowMcpDialog}>
              <DialogTrigger asChild>
                <Button><Plus weight="bold" className="w-4 h-4" />Add Server</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register MCP Server</DialogTitle>
                  <DialogDescription>Add a new MCP server.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Server ID</Label>
                    <Input placeholder="my-mcp-server" value={mcpForm.id} onChange={(e) => setMcpForm((p) => ({ ...p, id: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="My MCP Server" value={mcpForm.name} onChange={(e) => setMcpForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input placeholder="https://mcp.example.com" value={mcpForm.baseUrl} onChange={(e) => setMcpForm((p) => ({ ...p, baseUrl: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key (optional)</Label>
                    <Input type="password" placeholder="sk-..." value={mcpForm.apiKey} onChange={(e) => setMcpForm((p) => ({ ...p, apiKey: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowMcpDialog(false)}>Cancel</Button>
                  <Button onClick={handleRegisterMcp} disabled={isSavingMcp}>{isSavingMcp ? 'Registering...' : 'Register'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Registered Servers</h3>
              {isLoadingMcp ? (
                <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : mcpServers.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-8 text-center">
                    <HardDrives weight="light" className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No MCP servers registered</p>
                  </CardContent>
                </Card>
              ) : (
                mcpServers.map((server) => (
                  <Card key={server.id} className={`border-border/40 cursor-pointer transition-colors ${selectedServer === server.id ? 'ring-1 ring-primary' : ''}`} onClick={() => handleDiscoverTools(server.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                            {server.enabled ? <PlugsConnected weight="fill" className="w-4 h-4 text-green-500" /> : <Plug weight="regular" className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{server.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{server.baseUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={server.enabled ? 'default' : 'secondary'}>{server.enabled ? 'Active' : 'Disabled'}</Badge>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleUnregisterMcp(server.id); }} className="text-destructive hover:text-destructive">
                            <Trash weight="regular" className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">{selectedServer ? 'Available Tools' : 'Select a server'}</h3>
              {isLoadingTools ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : serverTools.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-8 text-center">
                    <MagnifyingGlass weight="light" className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{selectedServer ? 'No tools discovered' : 'Click a server to discover tools'}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {serverTools.map((tool) => (
                    <Card key={tool.name} className="border-border/40">
                      <CardContent className="p-3">
                        <p className="font-medium text-sm">{tool.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                        {tool.inputSchema?.required?.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {tool.inputSchema.required.slice(0, 3).map((param) => <Badge key={param} variant="outline" className="text-[10px]">{param}</Badge>)}
                            {tool.inputSchema.required.length > 3 && <Badge variant="outline" className="text-[10px]">+{tool.inputSchema.required.length - 3}</Badge>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
