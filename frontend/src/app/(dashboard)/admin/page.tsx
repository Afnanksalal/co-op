'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Globe,
  Buildings,
  Star,
  PencilSimple,
  X,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useRequireAdmin } from '@/lib/hooks';
import type {
  Embedding,
  McpServer,
  McpTool,
  RagDomain,
  Sector,
  RagRegion,
  RagJurisdiction,
  RagDocumentType,
  Investor,
  InvestorStage,
  CreateInvestorRequest,
  UpdateInvestorRequest,
} from '@/lib/api/types';
import { RAG_REGIONS, RAG_JURISDICTIONS, RAG_DOCUMENT_TYPES } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const RAG_DOMAINS: RagDomain[] = ['legal', 'finance'];
const SECTORS: Sector[] = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'];
const INVESTOR_SECTORS = ['saas', 'fintech', 'healthtech', 'ai', 'consumer', 'enterprise', 'crypto', 'climate', 'edtech', 'biotech'];
const INVESTOR_REGIONS = ['us', 'eu', 'apac', 'latam', 'mena', 'global'];

const STAGES: { value: InvestorStage; label: string }[] = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C+' },
  { value: 'growth', label: 'Growth' },
];

const JURISDICTION_LABELS: Record<string, string> = {
  general: 'General', gdpr: 'GDPR (EU)', ccpa: 'CCPA (California)', lgpd: 'LGPD (Brazil)',
  pipeda: 'PIPEDA (Canada)', pdpa: 'PDPA (Singapore)', dpdp: 'DPDP (India)',
  sec: 'SEC (US)', finra: 'FINRA (US)', fca: 'FCA (UK)', sebi: 'SEBI (India)',
  mas: 'MAS (Singapore)', esma: 'ESMA (EU)', hipaa: 'HIPAA', pci_dss: 'PCI-DSS',
  sox: 'SOX', aml_kyc: 'AML/KYC', dmca: 'DMCA', patent: 'Patent', trademark: 'Trademark',
  copyright: 'Copyright', employment: 'Employment', labor: 'Labor', corporate: 'Corporate',
  tax: 'Tax', contracts: 'Contracts',
};

const emptyInvestorForm: CreateInvestorRequest = {
  name: '', description: '', website: '', stage: 'seed', sectors: [],
  checkSizeMin: undefined, checkSizeMax: undefined, location: '', regions: [],
  contactEmail: '', linkedinUrl: '', twitterUrl: '', portfolioCompanies: [],
  notableExits: [], isActive: true, isFeatured: false,
};

export default function AdminPage() {
  const { isLoading: authLoading, isAdmin } = useRequireAdmin();

  // RAG State
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [isLoadingEmbeddings, setIsLoadingEmbeddings] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<RagDomain | 'all'>('all');
  const [selectedSector, setSelectedSector] = useState<Sector | 'all'>('all');
  const [selectedRegion, setSelectedRegion] = useState<RagRegion | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDomain, setUploadDomain] = useState<RagDomain>('legal');
  const [uploadSector, setUploadSector] = useState<Sector>('fintech');
  const [uploadRegion, setUploadRegion] = useState<RagRegion>('global');
  const [uploadJurisdictions, setUploadJurisdictions] = useState<RagJurisdiction[]>(['general']);
  const [uploadDocType, setUploadDocType] = useState<RagDocumentType>('guide');
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

  // Investors State
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoadingInvestors, setIsLoadingInvestors] = useState(true);
  const [investorSearch, setInvestorSearch] = useState('');
  const [showInvestorDialog, setShowInvestorDialog] = useState(false);
  const [editingInvestorId, setEditingInvestorId] = useState<string | null>(null);
  const [isSavingInvestor, setIsSavingInvestor] = useState(false);
  const [investorForm, setInvestorForm] = useState<CreateInvestorRequest>(emptyInvestorForm);
  const [sectorInput, setSectorInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [exitInput, setExitInput] = useState('');

  const dataLoadedRef = useRef(false);


  const loadEmbeddings = async (domain: string, sector: string, region: string) => {
    try {
      const params: { domain?: string; sector?: string; region?: string } = {};
      if (domain !== 'all') params.domain = domain;
      if (sector !== 'all') params.sector = sector;
      if (region !== 'all') params.region = region;
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

  const loadInvestors = useCallback(async () => {
    try {
      const data = await api.getAllInvestorsAdmin();
      // Ensure arrays are always arrays
      const safeData = (data || []).map((inv) => ({
        ...inv,
        sectors: Array.isArray(inv.sectors) ? inv.sectors : [],
        regions: Array.isArray(inv.regions) ? inv.regions : [],
        portfolioCompanies: Array.isArray(inv.portfolioCompanies) ? inv.portfolioCompanies : [],
        notableExits: Array.isArray(inv.notableExits) ? inv.notableExits : [],
      }));
      setInvestors(safeData);
    } catch {
      toast.error('Failed to load investors');
    }
    setIsLoadingInvestors(false);
  }, []);

  useEffect(() => {
    if (authLoading || !isAdmin || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    loadEmbeddings('all', 'all', 'all');
    loadMcpServers();
    loadInvestors();
  }, [authLoading, isAdmin, loadInvestors]);

  // RAG handlers
  const handleDomainChange = (value: string) => {
    setSelectedDomain(value as RagDomain | 'all');
    loadEmbeddings(value, selectedSector, selectedRegion);
  };

  const handleSectorChange = (value: string) => {
    setSelectedSector(value as Sector | 'all');
    loadEmbeddings(selectedDomain, value, selectedRegion);
  };

  const handleRegionChange = (value: string) => {
    setSelectedRegion(value as RagRegion | 'all');
    loadEmbeddings(selectedDomain, selectedSector, value);
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
      await api.uploadPdf(file, uploadDomain, uploadSector, {
        region: uploadRegion,
        jurisdictions: uploadJurisdictions,
        documentType: uploadDocType,
      });
      toast.success('PDF uploaded successfully');
      setShowUploadDialog(false);
      loadEmbeddings(selectedDomain, selectedSector, selectedRegion);
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
      loadEmbeddings(selectedDomain, selectedSector, selectedRegion);
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
      loadEmbeddings(selectedDomain, selectedSector, selectedRegion);
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
      loadEmbeddings(selectedDomain, selectedSector, selectedRegion);
    } catch (error) {
      console.error('Failed to cleanup:', error);
      toast.error('Failed to cleanup');
    }
  };

  const toggleJurisdiction = (j: RagJurisdiction) => {
    setUploadJurisdictions((prev) =>
      prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]
    );
  };

  // MCP handlers
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


  // Investor handlers
  const filteredInvestors = investors.filter((inv) =>
    inv.name.toLowerCase().includes(investorSearch.toLowerCase()) ||
    inv.location.toLowerCase().includes(investorSearch.toLowerCase()) ||
    (inv.sectors || []).some((s) => s.toLowerCase().includes(investorSearch.toLowerCase()))
  );

  const openCreateInvestor = () => {
    setEditingInvestorId(null);
    setInvestorForm(emptyInvestorForm);
    setShowInvestorDialog(true);
  };

  const openEditInvestor = (investor: Investor) => {
    setEditingInvestorId(investor.id);
    setInvestorForm({
      name: investor.name,
      description: investor.description || '',
      website: investor.website || '',
      stage: investor.stage,
      sectors: investor.sectors || [],
      checkSizeMin: investor.checkSizeMin || undefined,
      checkSizeMax: investor.checkSizeMax || undefined,
      location: investor.location,
      regions: investor.regions || [],
      contactEmail: investor.contactEmail || '',
      linkedinUrl: investor.linkedinUrl || '',
      twitterUrl: investor.twitterUrl || '',
      portfolioCompanies: investor.portfolioCompanies || [],
      notableExits: investor.notableExits || [],
      isActive: investor.isActive,
      isFeatured: investor.isFeatured,
    });
    setShowInvestorDialog(true);
  };

  const handleSaveInvestor = async () => {
    if (!investorForm.name.trim() || !investorForm.location.trim()) {
      toast.error('Name and location are required');
      return;
    }
    if ((investorForm.sectors || []).length === 0) {
      toast.error('Select at least one sector');
      return;
    }

    setIsSavingInvestor(true);
    try {
      if (editingInvestorId) {
        const updated = await api.updateInvestor(editingInvestorId, investorForm as UpdateInvestorRequest);
        setInvestors((prev) => prev.map((i) => (i.id === editingInvestorId ? updated : i)));
        toast.success('Investor updated');
      } else {
        const created = await api.createInvestor(investorForm);
        setInvestors((prev) => [created, ...prev]);
        toast.success('Investor created');
      }
      setShowInvestorDialog(false);
      setInvestorForm(emptyInvestorForm);
      setEditingInvestorId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
    }
    setIsSavingInvestor(false);
  };

  const handleDeleteInvestor = async (id: string) => {
    if (!confirm('Delete this investor?')) return;
    try {
      await api.deleteInvestor(id);
      setInvestors((prev) => prev.filter((i) => i.id !== id));
      toast.success('Investor deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleInvestorFeatured = async (investor: Investor) => {
    try {
      const updated = await api.updateInvestor(investor.id, { isFeatured: !investor.isFeatured });
      setInvestors((prev) => prev.map((i) => (i.id === investor.id ? updated : i)));
    } catch {
      toast.error('Failed to update');
    }
  };

  const addToInvestorArray = (field: 'sectors' | 'regions' | 'portfolioCompanies' | 'notableExits', value: string) => {
    if (!value.trim()) return;
    const current = investorForm[field] || [];
    if (!current.includes(value.trim())) {
      setInvestorForm((prev) => ({ ...prev, [field]: [...current, value.trim()] }));
    }
  };

  const removeFromInvestorArray = (field: 'sectors' | 'regions' | 'portfolioCompanies' | 'notableExits', value: string) => {
    setInvestorForm((prev) => ({ ...prev, [field]: (prev[field] || []).filter((v) => v !== value) }));
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stageColors: Record<string, string> = {
    'pre-seed': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'seed': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'series-a': 'bg-green-500/10 text-green-600 border-green-500/20',
    'series-b': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'series-c': 'bg-red-500/10 text-red-600 border-red-500/20',
    'growth': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight mb-1">Admin Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage RAG, MCP servers, and investors</p>
      </motion.div>

      <Tabs defaultValue="rag" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="rag" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <FileText weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">RAG</span>
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <HardDrives weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">MCP</span>
          </TabsTrigger>
          <TabsTrigger value="investors" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <Buildings weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Investors</span>
          </TabsTrigger>
        </TabsList>


        {/* RAG Tab */}
        <TabsContent value="rag" className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedDomain} onValueChange={handleDomainChange}>
                <SelectTrigger className="w-[90px] sm:w-[110px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {RAG_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSector} onValueChange={handleSectorChange}>
                <SelectTrigger className="w-[90px] sm:w-[110px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedRegion} onValueChange={handleRegionChange}>
                <SelectTrigger className="w-[90px] sm:w-[110px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {RAG_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCleanup} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                <Broom weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                    <Upload weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="ml-1">Upload</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Upload PDF for RAG</DialogTitle>
                    <DialogDescription>Upload a PDF document with jurisdiction metadata.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Domain</Label>
                        <Select value={uploadDomain} onValueChange={(v) => setUploadDomain(v as RagDomain)}>
                          <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RAG_DOMAINS.map((d) => (
                              <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Sector</Label>
                        <Select value={uploadSector} onValueChange={(v) => setUploadSector(v as Sector)}>
                          <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SECTORS.map((s) => (
                              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm flex items-center gap-1"><Globe weight="regular" className="w-3 h-3" />Region</Label>
                        <Select value={uploadRegion} onValueChange={(v) => setUploadRegion(v as RagRegion)}>
                          <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RAG_REGIONS.map((r) => (
                              <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm">Doc Type</Label>
                        <Select value={uploadDocType} onValueChange={(v) => setUploadDocType(v as RagDocumentType)}>
                          <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RAG_DOCUMENT_TYPES.map((dt) => (
                              <SelectItem key={dt} value={dt}>{dt.replace('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Jurisdictions</Label>
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md max-h-28 overflow-y-auto">
                        {RAG_JURISDICTIONS.map((j) => (
                          <Badge
                            key={j}
                            variant={uploadJurisdictions.includes(j) ? 'default' : 'outline'}
                            className="cursor-pointer text-[9px] sm:text-[10px]"
                            onClick={() => toggleJurisdiction(j)}
                          >
                            {JURISDICTION_LABELS[j] || j}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">PDF File</Label>
                      <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} className="h-8 sm:h-9 text-xs sm:text-sm" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)} size="sm">Cancel</Button>
                    {isUploading && <Button disabled size="sm"><CircleNotch weight="bold" className="w-4 h-4 animate-spin" />Uploading...</Button>}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoadingEmbeddings ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 sm:h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : embeddings.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-6 sm:p-8 text-center">
                <FileText weight="light" className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No embeddings. Upload PDFs to create RAG embeddings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {embeddings.map((emb) => (
                <Card key={emb.id} className="border-border/40">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText weight="regular" className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm truncate">{emb.filename}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[9px] sm:text-[10px]">{emb.domain}</Badge>
                            <Badge variant="outline" className="text-[9px] sm:text-[10px]">{emb.sector}</Badge>
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px]">{emb.region?.toUpperCase() || 'GLOBAL'}</Badge>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{emb.chunksCreated} chunks · {formatRelativeTime(emb.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={emb.status === 'indexed' ? 'default' : 'secondary'} className="text-[9px] sm:text-[10px]">{emb.status}</Badge>
                        {emb.status === 'pending' && (
                          <Button variant="ghost" size="icon" onClick={() => handleVectorize(emb.id)} className="h-7 w-7 sm:h-8 sm:w-8">
                            <Lightning weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteEmbedding(emb.id)} className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive">
                          <Trash weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>


        {/* MCP Tab */}
        <TabsContent value="mcp" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-muted-foreground">Manage MCP servers</p>
            <Dialog open={showMcpDialog} onOpenChange={setShowMcpDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm"><Plus weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="ml-1">Add</span></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register MCP Server</DialogTitle>
                  <DialogDescription>Add a new MCP server.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Server ID</Label>
                    <Input placeholder="my-mcp-server" value={mcpForm.id} onChange={(e) => setMcpForm((p) => ({ ...p, id: e.target.value }))} className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Name</Label>
                    <Input placeholder="My MCP Server" value={mcpForm.name} onChange={(e) => setMcpForm((p) => ({ ...p, name: e.target.value }))} className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Base URL</Label>
                    <Input placeholder="https://mcp.example.com" value={mcpForm.baseUrl} onChange={(e) => setMcpForm((p) => ({ ...p, baseUrl: e.target.value }))} className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">API Key (optional)</Label>
                    <Input type="password" placeholder="sk-..." value={mcpForm.apiKey} onChange={(e) => setMcpForm((p) => ({ ...p, apiKey: e.target.value }))} className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowMcpDialog(false)} size="sm">Cancel</Button>
                  <Button onClick={handleRegisterMcp} disabled={isSavingMcp} size="sm">{isSavingMcp ? 'Registering...' : 'Register'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-xs text-muted-foreground">Servers</h3>
              {isLoadingMcp ? (
                <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : mcpServers.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-6 text-center">
                    <HardDrives weight="light" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No MCP servers</p>
                  </CardContent>
                </Card>
              ) : (
                mcpServers.map((server) => (
                  <Card key={server.id} className={`border-border/40 cursor-pointer transition-colors ${selectedServer === server.id ? 'ring-1 ring-primary' : ''}`} onClick={() => handleDiscoverTools(server.id)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            {server.enabled ? <PlugsConnected weight="fill" className="w-4 h-4 text-green-500" /> : <Plug weight="regular" className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{server.name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{server.baseUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant={server.enabled ? 'default' : 'secondary'} className="text-[9px] sm:text-[10px]">{server.enabled ? 'On' : 'Off'}</Badge>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleUnregisterMcp(server.id); }} className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash weight="regular" className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-xs text-muted-foreground">{selectedServer ? 'Tools' : 'Select server'}</h3>
              {isLoadingTools ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : serverTools.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-6 text-center">
                    <MagnifyingGlass weight="light" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{selectedServer ? 'No tools' : 'Click server to discover'}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {serverTools.map((tool) => (
                    <Card key={tool.name} className="border-border/40">
                      <CardContent className="p-2 sm:p-3">
                        <p className="font-medium text-xs sm:text-sm">{tool.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>


        {/* Investors Tab */}
        <TabsContent value="investors" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Input
                placeholder="Search..."
                value={investorSearch}
                onChange={(e) => setInvestorSearch(e.target.value)}
                className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
              />
              <MagnifyingGlass weight="regular" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <Button onClick={openCreateInvestor} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              <Plus weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="ml-1">Add</span>
            </Button>
          </div>

          {isLoadingInvestors ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : filteredInvestors.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-6 sm:p-8 text-center">
                <Buildings weight="light" className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">{investorSearch ? 'No matches' : 'No investors yet'}</p>
                {!investorSearch && <Button onClick={openCreateInvestor} size="sm"><Plus weight="bold" className="w-4 h-4" />Add Investor</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredInvestors.map((investor) => (
                <Card key={investor.id} className="border-border/40">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5 mb-1">
                          <h3 className="font-medium text-xs sm:text-sm truncate">{investor.name}</h3>
                          {investor.isFeatured && <Star weight="fill" className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                          <Badge variant="outline" className={`text-[9px] sm:text-[10px] ${stageColors[investor.stage]}`}>{investor.stage}</Badge>
                          {!investor.isActive && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-1.5">
                          <span className="flex items-center gap-1"><Globe weight="regular" className="w-3 h-3" />{investor.location}</span>
                          <span>{formatRelativeTime(investor.createdAt)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(investor.sectors || []).slice(0, 4).map((s) => (
                            <Badge key={s} variant="secondary" className="text-[9px] sm:text-[10px]">{s}</Badge>
                          ))}
                          {(investor.sectors || []).length > 4 && <Badge variant="secondary" className="text-[9px]">+{(investor.sectors || []).length - 4}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => toggleInvestorFeatured(investor)} className={`h-7 w-7 ${investor.isFeatured ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                          <Star weight={investor.isFeatured ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditInvestor(investor)} className="h-7 w-7">
                          <PencilSimple weight="regular" className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteInvestor(investor.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash weight="regular" className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Investor Dialog */}
          <Dialog open={showInvestorDialog} onOpenChange={setShowInvestorDialog}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">{editingInvestorId ? 'Edit Investor' : 'Add Investor'}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">{editingInvestorId ? 'Update investor info' : 'Add new investor'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name *</Label>
                    <Input placeholder="Sequoia Capital" value={investorForm.name} onChange={(e) => setInvestorForm((p) => ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location *</Label>
                    <Input placeholder="San Francisco, CA" value={investorForm.location} onChange={(e) => setInvestorForm((p) => ({ ...p, location: e.target.value }))} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea placeholder="Brief description..." value={investorForm.description} onChange={(e) => setInvestorForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="text-xs" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Stage</Label>
                    <Select value={investorForm.stage} onValueChange={(v) => setInvestorForm((p) => ({ ...p, stage: v as InvestorStage }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min ($K)</Label>
                    <Input type="number" placeholder="100" value={investorForm.checkSizeMin || ''} onChange={(e) => setInvestorForm((p) => ({ ...p, checkSizeMin: e.target.value ? Number(e.target.value) : undefined }))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max ($K)</Label>
                    <Input type="number" placeholder="5000" value={investorForm.checkSizeMax || ''} onChange={(e) => setInvestorForm((p) => ({ ...p, checkSizeMax: e.target.value ? Number(e.target.value) : undefined }))} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sectors *</Label>
                  <Select value={sectorInput} onValueChange={(v) => { addToInvestorArray('sectors', v); setSectorInput(''); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select sector" /></SelectTrigger>
                    <SelectContent>
                      {INVESTOR_SECTORS.filter((s) => !(investorForm.sectors || []).includes(s)).map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    {(investorForm.sectors || []).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}<button onClick={() => removeFromInvestorArray('sectors', s)} className="ml-1 hover:text-destructive"><X weight="bold" className="w-2.5 h-2.5" /></button></Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Regions</Label>
                  <Select value={regionInput} onValueChange={(v) => { addToInvestorArray('regions', v); setRegionInput(''); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {INVESTOR_REGIONS.filter((r) => !(investorForm.regions || []).includes(r)).map((r) => <SelectItem key={r} value={r} className="text-xs">{r.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    {(investorForm.regions || []).map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r.toUpperCase()}<button onClick={() => removeFromInvestorArray('regions', r)} className="ml-1 hover:text-destructive"><X weight="bold" className="w-2.5 h-2.5" /></button></Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website</Label>
                    <Input placeholder="https://..." value={investorForm.website} onChange={(e) => setInvestorForm((p) => ({ ...p, website: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">LinkedIn</Label>
                    <Input placeholder="https://linkedin.com/..." value={investorForm.linkedinUrl} onChange={(e) => setInvestorForm((p) => ({ ...p, linkedinUrl: e.target.value }))} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Portfolio Companies</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Add company..." value={portfolioInput} onChange={(e) => setPortfolioInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToInvestorArray('portfolioCompanies', portfolioInput); setPortfolioInput(''); } }} className="h-8 text-xs" />
                    <Button type="button" variant="outline" size="sm" onClick={() => { addToInvestorArray('portfolioCompanies', portfolioInput); setPortfolioInput(''); }} className="h-8 text-xs">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(investorForm.portfolioCompanies || []).map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}<button onClick={() => removeFromInvestorArray('portfolioCompanies', c)} className="ml-1 hover:text-destructive"><X weight="bold" className="w-2.5 h-2.5" /></button></Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notable Exits</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Add exit..." value={exitInput} onChange={(e) => setExitInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToInvestorArray('notableExits', exitInput); setExitInput(''); } }} className="h-8 text-xs" />
                    <Button type="button" variant="outline" size="sm" onClick={() => { addToInvestorArray('notableExits', exitInput); setExitInput(''); }} className="h-8 text-xs">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(investorForm.notableExits || []).map((ex) => (
                      <Badge key={ex} variant="outline" className="text-[10px]">{ex}<button onClick={() => removeFromInvestorArray('notableExits', ex)} className="ml-1 hover:text-destructive"><X weight="bold" className="w-2.5 h-2.5" /></button></Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={investorForm.isActive} onCheckedChange={(v) => setInvestorForm((p) => ({ ...p, isActive: v }))} />
                    <Label className="text-xs">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={investorForm.isFeatured} onCheckedChange={(v) => setInvestorForm((p) => ({ ...p, isFeatured: v }))} />
                    <Label className="text-xs">Featured</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvestorDialog(false)} size="sm">Cancel</Button>
                <Button onClick={handleSaveInvestor} disabled={isSavingInvestor} size="sm">{isSavingInvestor ? 'Saving...' : editingInvestorId ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
