'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash,
  PencilSimple,
  CircleNotch,
  MagnifyingGlass,
  Star,
  Globe,
  Buildings,
  X,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useRequireAdmin } from '@/lib/hooks';
import type { Investor, InvestorStage, CreateInvestorRequest, UpdateInvestorRequest } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const STAGES: { value: InvestorStage; label: string }[] = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C+' },
  { value: 'growth', label: 'Growth' },
];

const SECTORS = ['saas', 'fintech', 'healthtech', 'ai', 'consumer', 'enterprise', 'crypto', 'climate', 'edtech', 'biotech'];
const REGIONS = ['us', 'eu', 'apac', 'latam', 'mena', 'global'];

const emptyForm: CreateInvestorRequest = {
  name: '',
  description: '',
  website: '',
  stage: 'seed',
  sectors: [],
  checkSizeMin: undefined,
  checkSizeMax: undefined,
  location: '',
  regions: [],
  contactEmail: '',
  linkedinUrl: '',
  twitterUrl: '',
  portfolioCompanies: [],
  notableExits: [],
  isActive: true,
  isFeatured: false,
};

export default function AdminInvestorsPage() {
  const { isLoading: authLoading, isAdmin } = useRequireAdmin();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateInvestorRequest>(emptyForm);

  // Temp inputs for array fields
  const [sectorInput, setSectorInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [exitInput, setExitInput] = useState('');

  const dataLoadedRef = useRef(false);

  const loadInvestors = useCallback(async () => {
    try {
      const data = await api.getAllInvestorsAdmin();
      setInvestors(data);
    } catch {
      toast.error('Failed to load investors');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !isAdmin || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    loadInvestors();
  }, [authLoading, isAdmin, loadInvestors]);

  const filteredInvestors = investors.filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase()) ||
    inv.location.toLowerCase().includes(search.toLowerCase()) ||
    inv.sectors.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (investor: Investor) => {
    setEditingId(investor.id);
    setForm({
      name: investor.name,
      description: investor.description || '',
      website: investor.website || '',
      stage: investor.stage,
      sectors: investor.sectors,
      checkSizeMin: investor.checkSizeMin || undefined,
      checkSizeMax: investor.checkSizeMax || undefined,
      location: investor.location,
      regions: investor.regions,
      contactEmail: investor.contactEmail || '',
      linkedinUrl: investor.linkedinUrl || '',
      twitterUrl: investor.twitterUrl || '',
      portfolioCompanies: investor.portfolioCompanies,
      notableExits: investor.notableExits,
      isActive: investor.isActive,
      isFeatured: investor.isFeatured,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      toast.error('Name and location are required');
      return;
    }
    if (form.sectors.length === 0) {
      toast.error('Select at least one sector');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await api.updateInvestor(editingId, form as UpdateInvestorRequest);
        setInvestors((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
        toast.success('Investor updated');
      } else {
        const created = await api.createInvestor(form);
        setInvestors((prev) => [created, ...prev]);
        toast.success('Investor created');
      }
      setShowDialog(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this investor?')) return;
    try {
      await api.deleteInvestor(id);
      setInvestors((prev) => prev.filter((i) => i.id !== id));
      toast.success('Investor deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleFeatured = async (investor: Investor) => {
    try {
      const updated = await api.updateInvestor(investor.id, { isFeatured: !investor.isFeatured });
      setInvestors((prev) => prev.map((i) => (i.id === investor.id ? updated : i)));
    } catch {
      toast.error('Failed to update');
    }
  };

  const addToArray = (field: 'sectors' | 'regions' | 'portfolioCompanies' | 'notableExits', value: string) => {
    if (!value.trim()) return;
    const current = form[field] || [];
    if (!current.includes(value.trim())) {
      setForm((prev) => ({ ...prev, [field]: [...current, value.trim()] }));
    }
  };

  const removeFromArray = (field: 'sectors' | 'regions' | 'portfolioCompanies' | 'notableExits', value: string) => {
    setForm((prev) => ({ ...prev, [field]: (prev[field] || []).filter((v) => v !== value) }));
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
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-1">
          Manage Investors
        </h1>
        <p className="text-sm text-muted-foreground">
          Add, edit, and manage the investor database
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search investors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <MagnifyingGlass weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <Button onClick={openCreate}>
          <Plus weight="bold" className="w-4 h-4" />
          Add Investor
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredInvestors.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-12 text-center">
            <Buildings weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-medium mb-2">No investors</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'No investors match your search' : 'Add your first investor to the database'}
            </p>
            {!search && (
              <Button onClick={openCreate}>
                <Plus weight="bold" className="w-4 h-4" />
                Add Investor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvestors.map((investor) => (
            <Card key={investor.id} className="border-border/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{investor.name}</h3>
                      {investor.isFeatured && (
                        <Star weight="fill" className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                      <Badge variant="outline" className={stageColors[investor.stage]}>
                        {investor.stage}
                      </Badge>
                      {!investor.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Globe weight="regular" className="w-3 h-3" />
                        {investor.location}
                      </span>
                      <span>
                        Check: {investor.checkSizeMin && investor.checkSizeMax
                          ? `$${investor.checkSizeMin >= 1000 ? `${investor.checkSizeMin/1000}M` : `${investor.checkSizeMin}K`} - $${investor.checkSizeMax >= 1000 ? `${investor.checkSizeMax/1000}M` : `${investor.checkSizeMax}K`}`
                          : 'Varies'}
                      </span>
                      <span>Added {formatRelativeTime(investor.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {investor.sectors.slice(0, 5).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {investor.sectors.length > 5 && (
                        <Badge variant="secondary" className="text-xs">+{investor.sectors.length - 5}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFeatured(investor)}
                      className={investor.isFeatured ? 'text-yellow-500' : 'text-muted-foreground'}
                    >
                      <Star weight={investor.isFeatured ? 'fill' : 'regular'} className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(investor)}>
                      <PencilSimple weight="regular" className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(investor.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash weight="regular" className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Investor' : 'Add Investor'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update investor information' : 'Add a new investor to the database'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Sequoia Capital"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  placeholder="San Francisco, CA"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the investor..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm((p) => ({ ...p, stage: v as InvestorStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Check ($K)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={form.checkSizeMin || ''}
                  onChange={(e) => setForm((p) => ({ ...p, checkSizeMin: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Check ($K)</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={form.checkSizeMax || ''}
                  onChange={(e) => setForm((p) => ({ ...p, checkSizeMax: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sectors *</Label>
              <div className="flex gap-2">
                <Select value={sectorInput} onValueChange={(v) => { addToArray('sectors', v); setSectorInput(''); }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent>
                    {SECTORS.filter((s) => !form.sectors?.includes(s)).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.sectors?.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                    <button onClick={() => removeFromArray('sectors', s)} className="ml-1 hover:text-destructive">
                      <X weight="bold" className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Regions</Label>
              <div className="flex gap-2">
                <Select value={regionInput} onValueChange={(v) => { addToArray('regions', v); setRegionInput(''); }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.filter((r) => !form.regions?.includes(r)).map((r) => (
                      <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.regions?.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {r.toUpperCase()}
                    <button onClick={() => removeFromArray('regions', r)} className="ml-1 hover:text-destructive">
                      <X weight="bold" className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  placeholder="https://sequoiacap.com"
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  placeholder="contact@example.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input
                  placeholder="https://linkedin.com/company/..."
                  value={form.linkedinUrl}
                  onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Twitter URL</Label>
                <Input
                  placeholder="https://twitter.com/..."
                  value={form.twitterUrl}
                  onChange={(e) => setForm((p) => ({ ...p, twitterUrl: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Portfolio Companies</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add company name..."
                  value={portfolioInput}
                  onChange={(e) => setPortfolioInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToArray('portfolioCompanies', portfolioInput); setPortfolioInput(''); } }}
                />
                <Button type="button" variant="outline" onClick={() => { addToArray('portfolioCompanies', portfolioInput); setPortfolioInput(''); }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.portfolioCompanies?.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                    <button onClick={() => removeFromArray('portfolioCompanies', c)} className="ml-1 hover:text-destructive">
                      <X weight="bold" className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notable Exits</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add exit..."
                  value={exitInput}
                  onChange={(e) => setExitInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToArray('notableExits', exitInput); setExitInput(''); } }}
                />
                <Button type="button" variant="outline" onClick={() => { addToArray('notableExits', exitInput); setExitInput(''); }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.notableExits?.map((e) => (
                  <Badge key={e} variant="outline" className="text-xs">
                    {e}
                    <button onClick={() => removeFromArray('notableExits', e)} className="ml-1 hover:text-destructive">
                      <X weight="bold" className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isFeatured: v }))}
                />
                <Label>Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
