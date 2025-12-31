'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from '@/components/motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/hooks';
import type {
  CapTable,
  CapTableSummary,
  Shareholder,
  FundingRound,
  CapTableScenario,
  ShareholderType,
  RoundType,
  RoundStatus,
  CreateCapTableRequest,
  CreateShareholderRequest,
  CreateRoundRequest,
  CreateScenarioRequest,
  CapTableExportFormat,
} from '@/lib/api/types';

// SVG Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,132.69V40a8,8,0,0,0-16,0v92.69L93.66,106.34a8,8,0,0,0-11.32,11.32Z"/>
  </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn("animate-spin", className)} width="20" height="20" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const ChartPieIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm71.87,53.27L136,114.14V40.37A88,88,0,0,1,199.87,77.27ZM120,40.37v83.32L46.13,161.27A88,88,0,0,1,120,40.37Zm8,175.26a88,88,0,0,1-71.87-38.36l143.74-83A88,88,0,0,1,128,215.63Z"/>
  </svg>
);

const SHAREHOLDER_TYPES: { value: ShareholderType; label: string }[] = [
  { value: 'founder', label: 'Founder' },
  { value: 'employee', label: 'Employee' },
  { value: 'investor', label: 'Investor' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'other', label: 'Other' },
];

const ROUND_TYPES: { value: RoundType; label: string }[] = [
  { value: 'equity', label: 'Equity' },
  { value: 'safe', label: 'SAFE' },
  { value: 'convertible_note', label: 'Convertible Note' },
];

const ROUND_STATUSES: { value: RoundStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
];

const OWNERSHIP_COLORS: Record<string, string> = {
  founders: 'bg-blue-500',
  employees: 'bg-green-500',
  investors: 'bg-purple-500',
  advisors: 'bg-orange-500',
  optionsPool: 'bg-gray-400',
};

export default function CapTablePage() {
  const router = useRouter();
  const { startup } = useUser();
  const [capTables, setCapTables] = useState<CapTable[]>([]);
  const [selectedCapTable, setSelectedCapTable] = useState<CapTableSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCapTables = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getCapTables();
      setCapTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cap tables');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCapTableSummary = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const summary = await api.getCapTableSummary(id);
      setSelectedCapTable(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cap table');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapTables();
  }, [loadCapTables]);

  const handleSelectCapTable = (capTable: CapTable) => {
    loadCapTableSummary(capTable.id);
  };

  const handleBack = () => {
    setSelectedCapTable(null);
    loadCapTables();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => selectedCapTable ? handleBack() : router.back()} className="shrink-0">
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">
            Cap Table Simulator
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Model funding rounds, dilution scenarios, and ownership
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center justify-between gap-2">
          <span className="truncate">{error}</span>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {isLoading && !selectedCapTable ? (
        <div className="flex items-center justify-center py-12">
          <SpinnerIcon className="w-8 h-8 text-primary" />
        </div>
      ) : !selectedCapTable ? (
        <CapTableList
          capTables={capTables}
          onSelect={handleSelectCapTable}
          onRefresh={loadCapTables}
          defaultCompanyName={startup?.companyName}
        />
      ) : (
        <CapTableDetail
          summary={selectedCapTable}
          onRefresh={() => loadCapTableSummary(selectedCapTable.capTable.id)}
        />
      )}
    </div>
  );
}


function CapTableList({
  capTables,
  onSelect,
  onRefresh,
  defaultCompanyName,
}: {
  capTables: CapTable[];
  onSelect: (capTable: CapTable) => void;
  onRefresh: () => void;
  defaultCompanyName?: string;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCapTable, setNewCapTable] = useState<CreateCapTableRequest>({
    companyName: defaultCompanyName || '',
    name: '',
    authorizedShares: 10000000,
    currency: 'USD',
  });

  // Update company name when defaultCompanyName changes
  useEffect(() => {
    if (defaultCompanyName && !newCapTable.companyName) {
      setNewCapTable(prev => ({ ...prev, companyName: defaultCompanyName }));
    }
  }, [defaultCompanyName, newCapTable.companyName]);

  const handleCreate = async () => {
    if (!newCapTable.companyName) return;
    try {
      setIsCreating(true);
      await api.createCapTable(newCapTable);
      setNewCapTable({ companyName: '', name: '', authorizedShares: 10000000, currency: 'USD' });
      setDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to create cap table:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this cap table?')) return;
    try {
      await api.deleteCapTable(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete cap table:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile: Single column, Desktop: Two columns */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Create Card - Shows as dialog trigger on mobile */}
        <Card className="border-border/40 order-2 lg:order-1">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="font-serif text-lg sm:text-xl">Create Cap Table</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Start modeling your company&apos;s ownership structure</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop: Inline form */}
            <div className="hidden sm:block space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  placeholder="Acme Inc."
                  value={newCapTable.companyName}
                  onChange={(e) => setNewCapTable({ ...newCapTable, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cap Table Name (optional)</Label>
                <Input
                  placeholder="Main Cap Table"
                  value={newCapTable.name || ''}
                  onChange={(e) => setNewCapTable({ ...newCapTable, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Authorized Shares</Label>
                  <Input
                    type="number"
                    placeholder="10000000"
                    value={newCapTable.authorizedShares || ''}
                    onChange={(e) => setNewCapTable({ ...newCapTable, authorizedShares: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={newCapTable.currency || 'USD'}
                    onValueChange={(v) => setNewCapTable({ ...newCapTable, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={isCreating || !newCapTable.companyName} className="w-full">
                {isCreating ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <PlusIcon />}
                <span className="ml-2">Create Cap Table</span>
              </Button>
            </div>

            {/* Mobile: Dialog trigger */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:hidden">
                  <PlusIcon /> <span className="ml-2">Create Cap Table</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Cap Table</DialogTitle>
                  <DialogDescription>Start modeling your ownership structure</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      placeholder="Acme Inc."
                      value={newCapTable.companyName}
                      onChange={(e) => setNewCapTable({ ...newCapTable, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cap Table Name</Label>
                    <Input
                      placeholder="Main Cap Table"
                      value={newCapTable.name || ''}
                      onChange={(e) => setNewCapTable({ ...newCapTable, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Authorized Shares</Label>
                      <Input
                        type="number"
                        placeholder="10000000"
                        value={newCapTable.authorizedShares || ''}
                        onChange={(e) => setNewCapTable({ ...newCapTable, authorizedShares: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Currency</Label>
                      <Select
                        value={newCapTable.currency || 'USD'}
                        onValueChange={(v) => setNewCapTable({ ...newCapTable, currency: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={isCreating || !newCapTable.companyName} className="w-full">
                    {isCreating ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Cap Tables List */}
        <Card className="border-border/40 order-1 lg:order-2">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="font-serif text-lg sm:text-xl">Your Cap Tables</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Select a cap table to view and edit</CardDescription>
          </CardHeader>
          <CardContent>
            {capTables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No cap tables yet. Create one to get started.
              </p>
            ) : (
              <ScrollArea className="h-[300px] sm:h-[400px]">
                <div className="space-y-2 pr-4">
                  {capTables.map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => onSelect(ct)}
                      className="w-full p-3 sm:p-4 rounded-lg border border-border/40 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{ct.companyName}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{ct.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ct.totalIssuedShares?.toLocaleString() || 0} shares
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ct.currentValuation && (
                            <span className="text-xs sm:text-sm font-medium text-primary">
                              ${(ct.currentValuation / 1000000).toFixed(1)}M
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(ct.id, e)}
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function CapTableDetail({
  summary,
  onRefresh,
}: {
  summary: CapTableSummary;
  onRefresh: () => void;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ type: 'tip' | 'warning' | 'action' | 'success'; message: string }[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Fetch LLM-powered insights
  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoadingInsights(true);
      try {
        const result = await api.getCapTableInsights(summary.capTable.id);
        setAiInsights(result.insights);
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setAiInsights([]);
      } finally {
        setIsLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [summary.capTable.id]);

  const handleExport = async (format: CapTableExportFormat) => {
    try {
      setIsExporting(true);
      const blob = await api.exportCapTable(summary.capTable.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.capTable.companyName.replace(/\s+/g, '_')}_cap_table.${format === 'carta' ? 'csv' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalOwnership = Object.values(summary.ownershipByType).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">{summary.capTable.companyName}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{summary.capTable.name}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting} className="flex-1 sm:flex-none">
            <DownloadIcon /> <span className="ml-1 sm:ml-2">CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('carta')} disabled={isExporting} className="flex-1 sm:flex-none">
            <DownloadIcon /> <span className="ml-1 sm:ml-2">Carta</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards - 2x2 grid on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-border/40">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <p className="text-lg sm:text-2xl font-bold truncate">{summary.capTable.totalIssuedShares?.toLocaleString() || 0}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Issued Shares</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <p className="text-lg sm:text-2xl font-bold truncate">{summary.capTable.fullyDilutedShares?.toLocaleString() || 0}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Fully Diluted</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <p className="text-lg sm:text-2xl font-bold text-primary truncate">
              {summary.capTable.currentValuation
                ? `$${(summary.capTable.currentValuation / 1000000).toFixed(1)}M`
                : 'N/A'}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Valuation</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <p className="text-lg sm:text-2xl font-bold truncate">
              {summary.capTable.pricePerShare ? `$${summary.capTable.pricePerShare.toFixed(2)}` : 'N/A'}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Price/Share</p>
          </CardContent>
        </Card>
      </div>

      {/* Ownership Breakdown */}
      <Card className="border-border/40">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="font-serif flex items-center gap-2 text-base sm:text-lg">
            <ChartPieIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Ownership Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(summary.ownershipByType).map(([type, percent]) => (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="capitalize">{type === 'optionsPool' ? 'Options Pool' : type}</span>
                  <span className="font-medium">{percent.toFixed(2)}%</span>
                </div>
                <Progress
                  value={(percent / Math.max(totalOwnership, 100)) * 100}
                  className={cn('h-2', OWNERSHIP_COLORS[type])}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {(isLoadingInsights || aiInsights.length > 0) && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z"/>
              </svg>
              <span className="text-sm font-medium text-primary">AI Cap Table Insights</span>
              {isLoadingInsights && <SpinnerIcon className="w-3 h-3 text-primary" />}
            </div>
            {isLoadingInsights ? (
              <p className="text-sm text-muted-foreground">Analyzing your cap table...</p>
            ) : (
              <div className="space-y-2">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={cn(
                      'shrink-0 mt-1 w-1.5 h-1.5 rounded-full',
                      insight.type === 'warning' ? 'bg-orange-500' :
                      insight.type === 'action' ? 'bg-blue-500' :
                      insight.type === 'success' ? 'bg-emerald-500' : 'bg-green-500'
                    )} />
                    <span className="text-muted-foreground">{insight.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs - Scrollable on mobile */}
      <Tabs defaultValue="shareholders" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="shareholders" className="text-xs sm:text-sm py-2">Shareholders</TabsTrigger>
          <TabsTrigger value="rounds" className="text-xs sm:text-sm py-2">Rounds</TabsTrigger>
          <TabsTrigger value="scenarios" className="text-xs sm:text-sm py-2">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="shareholders">
          <ShareholdersTab
            capTableId={summary.capTable.id}
            shareholders={summary.shareholders}
            onRefresh={onRefresh}
          />
        </TabsContent>

        <TabsContent value="rounds">
          <RoundsTab
            capTableId={summary.capTable.id}
            rounds={summary.rounds}
            onRefresh={onRefresh}
          />
        </TabsContent>

        <TabsContent value="scenarios">
          <ScenariosTab
            capTableId={summary.capTable.id}
            onRefresh={onRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function ShareholdersTab({
  capTableId,
  shareholders,
  onRefresh,
}: {
  capTableId: string;
  shareholders: Shareholder[];
  onRefresh: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newShareholder, setNewShareholder] = useState<CreateShareholderRequest>({
    name: '',
    shareholderType: 'founder',
    commonShares: 0,
  });

  const handleAdd = async () => {
    if (!newShareholder.name) return;
    try {
      setIsAdding(true);
      await api.addShareholder(capTableId, newShareholder);
      setNewShareholder({ name: '', shareholderType: 'founder', commonShares: 0 });
      setDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add shareholder:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (shareholderId: string) => {
    if (!confirm('Remove this shareholder?')) return;
    try {
      await api.deleteShareholder(capTableId, shareholderId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete shareholder:', err);
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="font-serif text-base sm:text-lg">Shareholders</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Manage company shareholders and their equity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Add Shareholder Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <PlusIcon /> <span className="ml-2">Add Shareholder</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Shareholder</DialogTitle>
              <DialogDescription>Add a new shareholder to the cap table</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="John Doe"
                  value={newShareholder.name}
                  onChange={(e) => setNewShareholder({ ...newShareholder, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newShareholder.email || ''}
                  onChange={(e) => setNewShareholder({ ...newShareholder, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newShareholder.shareholderType}
                  onValueChange={(v) => setNewShareholder({ ...newShareholder, shareholderType: v as ShareholderType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAREHOLDER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Common Shares</Label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={newShareholder.commonShares || ''}
                    onChange={(e) => setNewShareholder({ ...newShareholder, commonShares: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Preferred Shares</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newShareholder.preferredShares || ''}
                    onChange={(e) => setNewShareholder({ ...newShareholder, preferredShares: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Options Granted</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newShareholder.optionsGranted || ''}
                    onChange={(e) => setNewShareholder({ ...newShareholder, optionsGranted: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Investment ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newShareholder.investmentAmount || ''}
                    onChange={(e) => setNewShareholder({ ...newShareholder, investmentAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isAdding || !newShareholder.name} className="w-full sm:w-auto">
                {isAdding ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                Add Shareholder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shareholders List */}
        {shareholders.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
            No shareholders yet. Add founders and investors to get started.
          </p>
        ) : (
          <ScrollArea className="h-[300px] sm:h-[400px]">
            <div className="space-y-2 pr-4">
              {shareholders.map((s) => (
                <div
                  key={s.id}
                  className="p-3 sm:p-4 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <p className="font-medium text-sm sm:text-base truncate">{s.name}</p>
                        <span className={cn(
                          'text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0',
                          s.shareholderType === 'founder' && 'bg-blue-500/10 text-blue-500',
                          s.shareholderType === 'employee' && 'bg-green-500/10 text-green-500',
                          s.shareholderType === 'investor' && 'bg-purple-500/10 text-purple-500',
                          s.shareholderType === 'advisor' && 'bg-orange-500/10 text-orange-500',
                        )}>
                          {s.shareholderType}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                        <span>{s.totalShares.toLocaleString()} shares</span>
                        <span className="text-primary font-medium">{s.ownershipPercent.toFixed(2)}%</span>
                        {s.vestingProgress !== undefined && (
                          <span className="hidden sm:inline">{s.vestingProgress}% vested</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDelete(s.id)}>
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}


function RoundsTab({
  capTableId,
  rounds,
  onRefresh,
}: {
  capTableId: string;
  rounds: FundingRound[];
  onRefresh: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRound, setNewRound] = useState<CreateRoundRequest>({
    name: '',
    roundType: 'equity',
    status: 'planned',
  });

  const handleAdd = async () => {
    if (!newRound.name) return;
    try {
      setIsAdding(true);
      await api.addFundingRound(capTableId, newRound);
      setNewRound({ name: '', roundType: 'equity', status: 'planned' });
      setDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add round:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (roundId: string) => {
    if (!confirm('Delete this funding round?')) return;
    try {
      await api.deleteFundingRound(capTableId, roundId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete round:', err);
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="font-serif text-base sm:text-lg">Funding Rounds</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Track equity rounds, SAFEs, and convertible notes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Add Round Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <PlusIcon /> <span className="ml-2">Add Funding Round</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Funding Round</DialogTitle>
              <DialogDescription>Add a new funding round to track</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Round Name</Label>
                <Input
                  placeholder="Seed Round"
                  value={newRound.name}
                  onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Type</Label>
                  <Select
                    value={newRound.roundType}
                    onValueChange={(v) => setNewRound({ ...newRound, roundType: v as RoundType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Status</Label>
                  <Select
                    value={newRound.status || 'planned'}
                    onValueChange={(v) => setNewRound({ ...newRound, status: v as RoundStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Target Raise ($)</Label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={newRound.targetRaise || ''}
                    onChange={(e) => setNewRound({ ...newRound, targetRaise: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Pre-Money ($)</Label>
                  <Input
                    type="number"
                    placeholder="5000000"
                    value={newRound.preMoneyValuation || ''}
                    onChange={(e) => setNewRound({ ...newRound, preMoneyValuation: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>
              {(newRound.roundType === 'safe' || newRound.roundType === 'convertible_note') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Valuation Cap ($)</Label>
                    <Input
                      type="number"
                      placeholder="10000000"
                      value={newRound.valuationCap || ''}
                      onChange={(e) => setNewRound({ ...newRound, valuationCap: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Discount (%)</Label>
                    <Input
                      type="number"
                      placeholder="20"
                      value={newRound.discountRate || ''}
                      onChange={(e) => setNewRound({ ...newRound, discountRate: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isAdding || !newRound.name} className="w-full sm:w-auto">
                {isAdding ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                Add Round
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rounds List */}
        {rounds.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
            No funding rounds yet. Add your first round to track dilution.
          </p>
        ) : (
          <ScrollArea className="h-[300px] sm:h-[400px]">
            <div className="space-y-2 pr-4">
              {rounds.map((r) => (
                <div
                  key={r.id}
                  className="p-3 sm:p-4 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <p className="font-medium text-sm sm:text-base truncate">{r.name}</p>
                        <span className={cn(
                          'text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0',
                          r.status === 'closed' && 'bg-green-500/10 text-green-500',
                          r.status === 'in_progress' && 'bg-yellow-500/10 text-yellow-500',
                          r.status === 'planned' && 'bg-gray-500/10 text-gray-500',
                        )}>
                          {r.status}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{r.roundType}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                        {r.amountRaised && <span>${(r.amountRaised / 1000000).toFixed(2)}M</span>}
                        {r.preMoneyValuation && <span className="hidden sm:inline">${(r.preMoneyValuation / 1000000).toFixed(1)}M pre</span>}
                        {r.valuationCap && <span>${(r.valuationCap / 1000000).toFixed(1)}M cap</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDelete(r.id)}>
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}


function ScenariosTab({
  capTableId,
  onRefresh,
}: {
  capTableId: string;
  onRefresh: () => void;
}) {
  const [scenarios, setScenarios] = useState<CapTableScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newScenario, setNewScenario] = useState<CreateScenarioRequest>({
    name: '',
    parameters: {
      newRound: { amount: 0, valuation: 0, type: 'equity' },
    },
  });

  const loadScenarios = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getScenarios(capTableId);
      setScenarios(data);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setIsLoading(false);
    }
  }, [capTableId]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const handleCreate = async () => {
    if (!newScenario.name) {
      setError('Please enter a scenario name');
      return;
    }
    if (!newScenario.parameters.newRound?.amount && !newScenario.parameters.newRound?.valuation) {
      setError('Please enter round amount and pre-money valuation');
      return;
    }
    try {
      setIsCreating(true);
      setError(null);
      await api.createScenario(capTableId, newScenario);
      setNewScenario({ name: '', parameters: { newRound: { amount: 0, valuation: 0, type: 'equity' } } });
      setDialogOpen(false);
      loadScenarios();
      onRefresh();
    } catch (err) {
      console.error('Failed to create scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to create scenario');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (scenarioId: string) => {
    if (!confirm('Delete this scenario?')) return;
    try {
      setError(null);
      await api.deleteScenario(capTableId, scenarioId);
      loadScenarios();
    } catch (err) {
      console.error('Failed to delete scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete scenario');
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="font-serif text-base sm:text-lg">What-If Scenarios</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Model dilution from future funding rounds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center justify-between gap-2">
            <span className="truncate">{error}</span>
            <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Create Scenario Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <PlusIcon /> <span className="ml-2">Create Scenario</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Dilution Scenario</DialogTitle>
              <DialogDescription>Model the impact of a future funding round</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Scenario Name</Label>
                <Input
                  placeholder="Series A at $20M"
                  value={newScenario.name}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="What if we raise Series A..."
                  value={newScenario.description || ''}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Round Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="5000000"
                    value={newScenario.parameters.newRound?.amount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setNewScenario({
                        ...newScenario,
                        parameters: {
                          ...newScenario.parameters,
                          newRound: {
                            amount,
                            valuation: newScenario.parameters.newRound?.valuation || 0,
                            type: newScenario.parameters.newRound?.type || 'equity',
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Pre-Money ($)</Label>
                  <Input
                    type="number"
                    placeholder="20000000"
                    value={newScenario.parameters.newRound?.valuation || ''}
                    onChange={(e) => {
                      const valuation = parseFloat(e.target.value) || 0;
                      setNewScenario({
                        ...newScenario,
                        parameters: {
                          ...newScenario.parameters,
                          newRound: {
                            amount: newScenario.parameters.newRound?.amount || 0,
                            valuation,
                            type: newScenario.parameters.newRound?.type || 'equity',
                          },
                        },
                      });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Options Pool Increase (shares)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newScenario.parameters.optionsPoolIncrease || ''}
                  onChange={(e) => setNewScenario({
                    ...newScenario,
                    parameters: {
                      ...newScenario.parameters,
                      optionsPoolIncrease: parseInt(e.target.value) || undefined,
                    },
                  })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating} className="w-full sm:w-auto">
                {isCreating ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                {isCreating ? 'Calculating...' : 'Calculate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scenarios List */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <SpinnerIcon className="w-6 h-6 text-primary" />
          </div>
        ) : scenarios.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
            No scenarios yet. Create one to model future dilution.
          </p>
        ) : (
          <ScrollArea className="h-[300px] sm:h-[400px]">
            <div className="space-y-3 pr-4">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  className="p-3 sm:p-4 rounded-lg border border-border/40"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{s.name}</p>
                      {s.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{s.description}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDelete(s.id)}>
                      <TrashIcon />
                    </Button>
                  </div>
                  
                  {s.results && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-border/40">
                      <div>
                        <p className="text-base sm:text-lg font-semibold text-red-500">
                          -{s.results.founderDilution?.toFixed(1) || 0}%
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Founder Dilution</p>
                      </div>
                      <div>
                        <p className="text-base sm:text-lg font-semibold text-purple-500">
                          {s.results.newInvestorOwnership?.toFixed(1) || 0}%
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">New Investor</p>
                      </div>
                      <div>
                        <p className="text-base sm:text-lg font-semibold text-primary">
                          ${((s.results.postMoneyValuation || 0) / 1000000).toFixed(1)}M
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Post-Money</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
