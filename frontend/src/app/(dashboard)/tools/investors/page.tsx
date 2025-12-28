'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from '@/components/motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Investor, InvestorStage, InvestorStats } from '@/lib/api/types';

// SVG Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
  </svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Z"/>
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
    <path d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10a56,56,0,0,1-79.22-79.27l24.12-24.12a56,56,0,0,1,76.81-2.28,8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.58,56.58l9.94-9.94A8,8,0,0,1,137.54,186.36Zm70.08-138a56.08,56.08,0,0,0-79.22,0l-9.94,9.95a8,8,0,0,0,11.32,11.31l9.94-9.94a40,40,0,0,1,56.58,56.58L172.18,140.4a40,40,0,0,1-54.85,1.63,8,8,0,1,0-10.64,12,56,56,0,0,0,76.81-2.28l24.12-24.12A56.08,56.08,0,0,0,207.62,48.38Z"/>
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
    <path d="M234.5,114.38l-45.1,39.36,13.51,58.6a16,16,0,0,1-23.84,17.34l-51.11-31-51,31a16,16,0,0,1-23.84-17.34l13.49-58.54L21.5,114.38a16,16,0,0,1,9.11-28.06l59.46-5.15,23.21-55.36a15.95,15.95,0,0,1,29.44,0h0L166,81.17l59.44,5.15a16,16,0,0,1,9.11,28.06Z"/>
  </svg>
);

const STAGES: { value: InvestorStage | 'all'; label: string }[] = [
  { value: 'all', label: 'All Stages' },
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C+' },
  { value: 'growth', label: 'Growth' },
];

const SECTORS = [
  { value: 'all', label: 'All Sectors' },
  { value: 'saas', label: 'SaaS' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'ai', label: 'AI/ML' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'crypto', label: 'Crypto/Web3' },
  { value: 'climate', label: 'Climate' },
];

const REGIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'us', label: 'United States' },
  { value: 'eu', label: 'Europe' },
  { value: 'apac', label: 'Asia-Pacific' },
  { value: 'latam', label: 'Latin America' },
  { value: 'mena', label: 'Middle East' },
];

function formatCheckSize(min: number | null, max: number | null): string {
  if (!min && !max) return 'Varies';
  if (min && max) {
    if (min >= 1000) return `$${min / 1000}M - $${max / 1000}M`;
    return `$${min}K - $${max >= 1000 ? `${max / 1000}M` : `${max}K`}`;
  }
  if (min) return min >= 1000 ? `$${min / 1000}M+` : `$${min}K+`;
  if (max) return max >= 1000 ? `Up to $${max / 1000}M` : `Up to $${max}K`;
  return 'Varies';
}

export default function InvestorsPage() {
  const router = useRouter();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [stats, setStats] = useState<InvestorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const fetchInvestors = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: Record<string, string> = {};
      if (stageFilter !== 'all') query.stage = stageFilter;
      if (sectorFilter !== 'all') query.sector = sectorFilter;
      if (regionFilter !== 'all') query.region = regionFilter;
      if (search) query.search = search;

      const [investorsData, statsData] = await Promise.all([
        api.getInvestors(query as Parameters<typeof api.getInvestors>[0]),
        api.getInvestorStats(),
      ]);
      setInvestors(investorsData || []);
      // Ensure stats arrays are safe
      setStats(statsData ? {
        ...statsData,
        byStage: Array.isArray(statsData.byStage) ? statsData.byStage : [],
        bySector: Array.isArray(statsData.bySector) ? statsData.bySector : [],
      } : null);
    } catch (error) {
      console.error('Failed to fetch investors:', error);
      toast.error('Failed to load investors');
    } finally {
      setIsLoading(false);
    }
  }, [search, stageFilter, sectorFilter, regionFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchInvestors, 300);
    return () => clearTimeout(debounce);
  }, [fetchInvestors]);

  const stageColors: Record<string, string> = {
    'pre-seed': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    'seed': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'series-a': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    'series-b': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    'series-c': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    'growth': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
          <ArrowLeftIcon />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">
            Investor Database
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {stats ? `${stats.total} investors` : 'Loading...'} · Filter by stage, sector, region
          </p>
        </div>
      </motion.div>

      {/* Stats Summary */}
      {stats && Array.isArray(stats.byStage) && stats.byStage.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
        >
          {stats.byStage.slice(0, 4).map((s) => (
            <Card key={s.stage} className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xl sm:text-2xl font-serif font-medium">{s.count}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">{(s.stage || '').replace('-', ' ')}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="relative col-span-2 lg:col-span-1">
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 sm:h-10 text-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <SearchIcon />
              </div>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector.value} value={sector.value}>
                    {sector.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="flex gap-1">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-5 w-14 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                  <div className="h-9 w-24 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : investors.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-6 sm:p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">No investors match your filters</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setSearch('');
                setStageFilter('all');
                setSectorFilter('all');
                setRegionFilter('all');
              }}
            >
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {investors.map((investor, index) => (
            <motion.div
              key={investor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card className="border-border/40 hover:border-border/60 transition-colors">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1.5">
                        <h3 className="font-medium text-sm sm:text-base truncate">{investor.name}</h3>
                        {investor.isFeatured && (
                          <span className="text-yellow-500" title="Featured">
                            <StarIcon />
                          </span>
                        )}
                        <Badge variant="outline" className={cn('text-[10px] sm:text-xs shrink-0', stageColors[investor.stage])}>
                          {investor.stage.replace('-', ' ')}
                        </Badge>
                      </div>
                      
                      {investor.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                          {investor.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <GlobeIcon />
                          {investor.location}
                        </span>
                        <span>Check: {formatCheckSize(investor.checkSizeMin, investor.checkSizeMax)}</span>
                      </div>
                      
                      {investor.sectors && (
                        <div className="flex flex-wrap gap-1">
                          {investor.sectors.split(',').filter(Boolean).slice(0, 4).map((sector) => (
                            <Badge key={sector} variant="secondary" className="text-[10px] sm:text-xs">
                              {sector.trim()}
                            </Badge>
                          ))}
                          {investor.sectors.split(',').filter(Boolean).length > 4 && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              +{investor.sectors.split(',').filter(Boolean).length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex sm:flex-col gap-2">
                      {investor.website && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() => window.open(investor.website!, '_blank')}
                        >
                          <LinkIcon />
                          <span className="ml-1.5">Website</span>
                        </Button>
                      )}
                      {investor.linkedinUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() => window.open(investor.linkedinUrl!, '_blank')}
                        >
                          LinkedIn
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
