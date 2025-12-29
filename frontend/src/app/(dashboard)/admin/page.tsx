'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from '@/components/motion';
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
  Users,
  UserCircle,
  ArrowsClockwise,
  Prohibit,
  CheckCircle,
  Robot,
  Key,
  WebhooksLogo,
  AddressBook,
  Megaphone,
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
  AdminUser,
  AdminUserListQuery,
  UserStats,
} from '@/lib/api/types';
import { RAG_REGIONS, RAG_JURISDICTIONS, RAG_DOCUMENT_TYPES, SECTORS, SECTOR_LABELS, SECTOR_CATEGORIES, PILOT_LIMITS } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const RAG_DOMAINS: RagDomain[] = ['legal', 'finance'];

// Expanded investor sectors for production
const INVESTOR_SECTORS = [
  // Technology
  'saas', 'ai_ml', 'developer_tools', 'cybersecurity', 'cloud_infrastructure', 'data_analytics', 'devops', 'low_code',
  // Finance
  'fintech', 'insurtech', 'wealthtech', 'regtech', 'payments', 'banking', 'crypto_web3', 'defi',
  // Health
  'healthtech', 'biotech', 'medtech', 'digital_health', 'mental_health', 'pharma', 'telehealth',
  // Commerce
  'ecommerce', 'marketplace', 'retail_tech', 'd2c', 'supply_chain', 'logistics',
  // Sustainability
  'greentech', 'cleantech', 'climate_tech', 'renewable_energy', 'carbon_tech',
  // Real Estate
  'proptech', 'construction_tech',
  // Education & HR
  'edtech', 'hrtech', 'workforce_tech',
  // Media
  'media_entertainment', 'gaming', 'creator_economy', 'streaming', 'adtech', 'martech',
  // Food & Agri
  'foodtech', 'agritech', 'food_delivery',
  // Mobility
  'mobility', 'automotive', 'ev_tech', 'autonomous_vehicles',
  // Legal & Gov
  'legaltech', 'govtech',
  // Travel
  'travel_tech', 'hospitality',
  // Social
  'social', 'communication', 'community',
  // Hardware
  'hardware', 'iot', 'robotics', 'drones', 'wearables',
  // Other
  'other',
];

const INVESTOR_REGIONS = [
  { value: 'us', label: 'United States' },
  { value: 'eu', label: 'Europe' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'apac', label: 'Asia Pacific' },
  { value: 'india', label: 'India' },
  { value: 'latam', label: 'Latin America' },
  { value: 'mena', label: 'Middle East & Africa' },
  { value: 'canada', label: 'Canada' },
  { value: 'global', label: 'Global' },
];

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
  name: '', description: '', website: '', stage: 'seed', sectors: '',
  checkSizeMin: undefined, checkSizeMax: undefined, location: '', regions: '',
  contactEmail: '', linkedinUrl: '', twitterUrl: '', isActive: true, isFeatured: false,
};

export default function AdminPage() {
  const { isLoading: authLoading, isAdmin, user } = useRequireAdmin();

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

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [usageUser, setUsageUser] = useState<AdminUser | null>(null);

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
      setInvestors(data || []);
    } catch (error) {
      console.error('Failed to load investors:', error);
      toast.error('Failed to load investors');
    }
    setIsLoadingInvestors(false);
  }, []);

  const loadUsers = useCallback(async (query?: AdminUserListQuery) => {
    setIsLoadingUsers(true);
    try {
      const result = await api.getAdminUsers({
        search: userSearch || undefined,
        status: userStatusFilter,
        page: query?.page ?? userPage,
        limit: 20,
        ...query,
      });
      setUsers(result.data);
      setUserTotalPages(result.meta.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    }
    setIsLoadingUsers(false);
  }, [userSearch, userStatusFilter, userPage]);

  const loadUserStats = useCallback(async () => {
    try {
      const stats = await api.getAdminUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAdmin || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    loadEmbeddings('all', 'all', 'all');
    loadMcpServers();
    loadInvestors();
    loadUsers();
    loadUserStats();
  }, [authLoading, isAdmin, loadInvestors, loadUsers, loadUserStats]);

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
    (inv.sectors || '').toLowerCase().includes(investorSearch.toLowerCase())
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
      sectors: investor.sectors || '',
      checkSizeMin: investor.checkSizeMin || undefined,
      checkSizeMax: investor.checkSizeMax || undefined,
      location: investor.location,
      regions: investor.regions || '',
      contactEmail: investor.contactEmail || '',
      linkedinUrl: investor.linkedinUrl || '',
      twitterUrl: investor.twitterUrl || '',
      isActive: investor.isActive,
      isFeatured: investor.isFeatured,
    });
    setShowInvestorDialog(true);
  };

  const handleSaveInvestor = async () => {
    if (!investorForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!investorForm.location.trim()) {
      toast.error('Location is required');
      return;
    }
    if (!investorForm.sectors.trim()) {
      toast.error('At least one sector is required');
      return;
    }

    // Clean up form data - convert empty strings to undefined for optional fields
    const cleanedData: CreateInvestorRequest = {
      name: investorForm.name.trim(),
      location: investorForm.location.trim(),
      stage: investorForm.stage,
      sectors: investorForm.sectors.trim(),
      description: investorForm.description?.trim() || undefined,
      website: investorForm.website?.trim() || undefined,
      checkSizeMin: investorForm.checkSizeMin || undefined,
      checkSizeMax: investorForm.checkSizeMax || undefined,
      regions: investorForm.regions?.trim() || undefined,
      contactEmail: investorForm.contactEmail?.trim() || undefined,
      linkedinUrl: investorForm.linkedinUrl?.trim() || undefined,
      twitterUrl: investorForm.twitterUrl?.trim() || undefined,
      isActive: investorForm.isActive,
      isFeatured: investorForm.isFeatured,
    };

    setIsSavingInvestor(true);
    try {
      if (editingInvestorId) {
        const updated = await api.updateInvestor(editingInvestorId, cleanedData as UpdateInvestorRequest);
        setInvestors((prev) => prev.map((i) => (i.id === editingInvestorId ? updated : i)));
        toast.success('Investor updated');
      } else {
        const created = await api.createInvestor(cleanedData);
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

  // User handlers
  const handleUserSearch = () => {
    setUserPage(1);
    loadUsers({ page: 1 });
  };

  const handleUserStatusFilter = (status: 'all' | 'active' | 'suspended') => {
    setUserStatusFilter(status);
    setUserPage(1);
    loadUsers({ status, page: 1 });
  };

  const handleSuspendUser = async (userId: string, reason?: string) => {
    try {
      await api.suspendUser(userId, reason);
      toast.success('User suspended');
      loadUsers();
      loadUserStats();
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await api.activateUser(userId);
      toast.success('User activated');
      loadUsers();
      loadUserStats();
    } catch {
      toast.error('Failed to activate user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteAdminUser(userId);
      toast.success('User deleted');
      loadUsers();
      loadUserStats();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleResetUsage = async (userId: string) => {
    try {
      await api.resetUserUsage(userId, 'agentRequests');
      toast.success('Agent usage reset');
      loadUsers();
    } catch {
      toast.error('Failed to reset usage');
    }
  };

  const openUsageDialog = (user: AdminUser) => {
    setUsageUser(user);
    setShowUsageDialog(true);
  };

  const handleBulkSuspend = async () => {
    if (selectedUsers.size === 0) return;
    try {
      const result = await api.bulkSuspendUsers(Array.from(selectedUsers));
      toast.success(`${result.suspended} users suspended`);
      setSelectedUsers(new Set());
      loadUsers();
      loadUserStats();
    } catch {
      toast.error('Failed to suspend users');
    }
  };

  const handleBulkActivate = async () => {
    if (selectedUsers.size === 0) return;
    try {
      const result = await api.bulkActivateUsers(Array.from(selectedUsers));
      toast.success(`${result.activated} users activated`);
      setSelectedUsers(new Set());
      loadUsers();
      loadUserStats();
    } catch {
      toast.error('Failed to activate users');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    try {
      const result = await api.bulkDeleteUsers(Array.from(selectedUsers));
      toast.success(`${result.deleted} users deleted`);
      setSelectedUsers(new Set());
      loadUsers();
      loadUserStats();
    } catch {
      toast.error('Failed to delete users');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  // If not loading and not admin, the hook will redirect - show nothing
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Redirecting...</p>
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

      <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="rag">RAG</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
        </TabsList>


        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Stats Cards */}
          {userStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Users weight="regular" className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold">{userStats.totalUsers}</p>
                      <p className="text-[10px] text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle weight="regular" className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-lg font-semibold">{userStats.activeUsers}</p>
                      <p className="text-[10px] text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Prohibit weight="regular" className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-lg font-semibold">{userStats.suspendedUsers}</p>
                      <p className="text-[10px] text-muted-foreground">Suspended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Users weight="regular" className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-lg font-semibold">{userStats.usersThisMonth}</p>
                      <p className="text-[10px] text-muted-foreground">This Month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                  className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                />
                <MagnifyingGlass weight="regular" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <Select value={userStatusFilter} onValueChange={(v) => handleUserStatusFilter(v as 'all' | 'active' | 'suspended')}>
                <SelectTrigger className="w-[100px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedUsers.size} selected</span>
                <Button variant="outline" size="sm" onClick={handleBulkActivate} className="h-8 text-xs">
                  <CheckCircle weight="regular" className="w-3.5 h-3.5 mr-1" />Activate
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkSuspend} className="h-8 text-xs text-orange-600">
                  <Prohibit weight="regular" className="w-3.5 h-3.5 mr-1" />Suspend
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs text-destructive">
                      <Trash weight="regular" className="w-3.5 h-3.5 mr-1" />Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedUsers.size} Users</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the selected users. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Users List */}
          {isLoadingUsers ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : users.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-6 sm:p-8 text-center">
                <Users weight="light" className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{userSearch ? 'No users found' : 'No users yet'}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground border-b">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onChange={toggleAllUsers}
                  className="rounded border-muted-foreground/30"
                />
                <span className="flex-1">User</span>
                <span className="w-20 text-center hidden sm:block">Status</span>
                <span className="w-28 text-center hidden sm:block">Agent Usage</span>
                <span className="w-24">Actions</span>
              </div>

              {/* User Rows */}
              <div className="space-y-1">
                {users.map((user) => (
                  <Card key={user.id} className={`border-border/40 ${selectedUsers.has(user.id) ? 'ring-1 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-muted-foreground/30"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <UserCircle weight="regular" className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-xs sm:text-sm truncate">{user.name}</p>
                              {user.role === 'admin' && <Badge variant="default" className="text-[9px]">Admin</Badge>}
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="w-20 text-center hidden sm:block">
                          <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="text-[9px]">
                            {user.status}
                          </Badge>
                        </div>
                        <div className="w-28 text-center hidden sm:block">
                          <Badge 
                            variant="outline" 
                            className={`text-[9px] cursor-pointer ${user.pilotUsage.agentRequestsUsed >= user.pilotUsage.agentRequestsLimit ? 'text-red-500 border-red-500/30' : ''}`}
                            onClick={() => openUsageDialog(user)}
                          >
                            {user.pilotUsage.agentRequestsUsed}/{user.pilotUsage.agentRequestsLimit} agents
                          </Badge>
                        </div>
                        <div className="flex items-center gap-0.5 w-24 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openUsageDialog(user)} className="h-7 w-7" title="View Usage">
                            <Robot weight="regular" className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleResetUsage(user.id)} className="h-7 w-7" title="Reset Agent Usage">
                            <ArrowsClockwise weight="regular" className="w-3.5 h-3.5" />
                          </Button>
                          {user.status === 'active' ? (
                            <Button variant="ghost" size="icon" onClick={() => handleSuspendUser(user.id)} className="h-7 w-7 text-orange-600" title="Suspend">
                              <Prohibit weight="regular" className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleActivateUser(user.id)} className="h-7 w-7 text-green-600" title="Activate">
                              <CheckCircle weight="regular" className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete">
                                <Trash weight="regular" className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete &quot;{user.name}&quot; ({user.email})? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {userTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setUserPage((p) => Math.max(1, p - 1)); loadUsers({ page: Math.max(1, userPage - 1) }); }}
                    disabled={userPage === 1}
                    className="h-8 text-xs"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">Page {userPage} of {userTotalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setUserPage((p) => Math.min(userTotalPages, p + 1)); loadUsers({ page: Math.min(userTotalPages, userPage + 1) }); }}
                    disabled={userPage === userTotalPages}
                    className="h-8 text-xs"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Pilot Usage Dialog */}
          <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Pilot Usage</DialogTitle>
                <DialogDescription className="text-xs">
                  {usageUser?.name} ({usageUser?.email})
                </DialogDescription>
              </DialogHeader>
              {usageUser && (
                <div className="space-y-3 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Robot weight="regular" className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium">Agent Requests</span>
                      </div>
                      <p className={`text-lg font-semibold ${usageUser.pilotUsage.agentRequestsUsed >= usageUser.pilotUsage.agentRequestsLimit ? 'text-red-500' : ''}`}>
                        {usageUser.pilotUsage.agentRequestsUsed}/{usageUser.pilotUsage.agentRequestsLimit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">per month</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Key weight="regular" className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium">API Keys</span>
                      </div>
                      <p className={`text-lg font-semibold ${usageUser.pilotUsage.apiKeysUsed >= PILOT_LIMITS.apiKeys.limit ? 'text-red-500' : ''}`}>
                        {usageUser.pilotUsage.apiKeysUsed}/{PILOT_LIMITS.apiKeys.limit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <WebhooksLogo weight="regular" className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium">Webhooks</span>
                      </div>
                      <p className={`text-lg font-semibold ${usageUser.pilotUsage.webhooksUsed >= PILOT_LIMITS.webhooks.limit ? 'text-red-500' : ''}`}>
                        {usageUser.pilotUsage.webhooksUsed}/{PILOT_LIMITS.webhooks.limit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <AddressBook weight="regular" className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-medium">Leads</span>
                      </div>
                      <p className={`text-lg font-semibold ${usageUser.pilotUsage.leadsUsed >= PILOT_LIMITS.leads.limit ? 'text-red-500' : ''}`}>
                        {usageUser.pilotUsage.leadsUsed}/{PILOT_LIMITS.leads.limit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Megaphone weight="regular" className="w-4 h-4 text-pink-500" />
                        <span className="text-xs font-medium">Campaigns</span>
                      </div>
                      <p className={`text-lg font-semibold ${usageUser.pilotUsage.campaignsUsed >= PILOT_LIMITS.campaigns.limit ? 'text-red-500' : ''}`}>
                        {usageUser.pilotUsage.campaignsUsed}/{PILOT_LIMITS.campaigns.limit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
                    Agent usage resets: {new Date(usageUser.pilotUsage.resetsAt).toLocaleDateString()}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUsageDialog(false)} size="sm">Close</Button>
                <Button 
                  onClick={() => { handleResetUsage(usageUser!.id); setShowUsageDialog(false); }} 
                  size="sm"
                  variant="destructive"
                >
                  Reset Agent Usage
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>


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
                <SelectTrigger className="w-[120px] sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Sectors</SelectItem>
                  {Object.entries(SECTOR_CATEGORIES).map(([category, sectors]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">{category}</div>
                      {sectors.map((s) => (
                        <SelectItem key={s} value={s} className="pl-4">{SECTOR_LABELS[s as Sector]}</SelectItem>
                      ))}
                    </div>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                    <Broom weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cleanup Old Embeddings</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove embeddings older than 30 days that haven&apos;t been accessed recently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanup}>
                      Cleanup
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                          <SelectContent className="max-h-[250px]">
                            {Object.entries(SECTOR_CATEGORIES).map(([category, sectors]) => (
                              <div key={category}>
                                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">{category}</div>
                                {sectors.map((s) => (
                                  <SelectItem key={s} value={s} className="pl-4 text-xs">{SECTOR_LABELS[s as Sector]}</SelectItem>
                                ))}
                              </div>
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive">
                              <Trash weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Embedding</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete &quot;{emb.filename}&quot;? This will remove all vectorized chunks.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEmbedding(emb.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash weight="regular" className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Unregister Server</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Unregister &quot;{server.name}&quot;? You can re-register it later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleUnregisterMcp(server.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Unregister
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                <p className="text-sm text-muted-foreground">{investorSearch ? 'No matches found' : 'No investors yet. Click Add above to create one.'}</p>
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
                          {(investor.sectors || '').split(',').filter(Boolean).slice(0, 4).map((s) => (
                            <Badge key={s} variant="secondary" className="text-[9px] sm:text-[10px]">{s.trim()}</Badge>
                          ))}
                          {(investor.sectors || '').split(',').filter(Boolean).length > 4 && <Badge variant="secondary" className="text-[9px]">+{(investor.sectors || '').split(',').filter(Boolean).length - 4}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => toggleInvestorFeatured(investor)} className={`h-7 w-7 ${investor.isFeatured ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                          <Star weight={investor.isFeatured ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditInvestor(investor)} className="h-7 w-7">
                          <PencilSimple weight="regular" className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash weight="regular" className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Investor</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete &quot;{investor.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteInvestor(investor.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                    <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="Sequoia Capital" value={investorForm.name} onChange={(e) => setInvestorForm((p) => ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location <span className="text-destructive">*</span></Label>
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
                  <Label className="text-xs">Sectors <span className="text-destructive">*</span></Label>
                  <Input placeholder="saas,fintech,ai_ml (comma-separated)" value={investorForm.sectors} onChange={(e) => setInvestorForm((p) => ({ ...p, sectors: e.target.value }))} className="h-8 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Popular: saas, fintech, healthtech, ai_ml, ecommerce, biotech, edtech, crypto_web3</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Regions</Label>
                  <Input placeholder="us,eu,apac (comma-separated)" value={investorForm.regions || ''} onChange={(e) => setInvestorForm((p) => ({ ...p, regions: e.target.value }))} className="h-8 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Options: {INVESTOR_REGIONS.map(r => r.value).join(', ')}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website</Label>
                    <Input placeholder="https://..." value={investorForm.website} onChange={(e) => setInvestorForm((p) => ({ ...p, website: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact Email</Label>
                    <Input type="email" placeholder="contact@example.com" value={investorForm.contactEmail} onChange={(e) => setInvestorForm((p) => ({ ...p, contactEmail: e.target.value }))} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">LinkedIn</Label>
                    <Input placeholder="https://linkedin.com/..." value={investorForm.linkedinUrl} onChange={(e) => setInvestorForm((p) => ({ ...p, linkedinUrl: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Twitter</Label>
                    <Input placeholder="https://twitter.com/..." value={investorForm.twitterUrl} onChange={(e) => setInvestorForm((p) => ({ ...p, twitterUrl: e.target.value }))} className="h-8 text-xs" />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={investorForm.isActive} onCheckedChange={(v) => setInvestorForm((p) => ({ ...p, isActive: v }))} />
                    <span className="text-xs">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={investorForm.isFeatured} onCheckedChange={(v) => setInvestorForm((p) => ({ ...p, isFeatured: v }))} />
                    <span className="text-xs">Featured</span>
                  </label>
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
