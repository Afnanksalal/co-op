'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from '@/components/motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { PitchDeck, InvestorType, InvestorVersionResponse, SectorBenchmarkResponse } from '@/lib/api/types';

// SVG Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
    <path d="M240,136v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V136a16,16,0,0,1,16-16H80a8,8,0,0,1,0,16H32v64H224V136H176a8,8,0,0,1,0-16h48A16,16,0,0,1,240,136ZM85.66,77.66,120,43.31V128a8,8,0,0,0,16,0V43.31l34.34,34.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,77.66Z"/>
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"/>
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/>
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
  </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn("animate-spin", className)} width="20" height="20" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const SECTION_LABELS: Record<string, string> = {
  problem: 'Problem',
  solution: 'Solution',
  market: 'Market Size',
  product: 'Product',
  businessModel: 'Business Model',
  traction: 'Traction',
  competition: 'Competition',
  team: 'Team',
  financials: 'Financials',
  ask: 'The Ask',
};

export default function PitchDeckPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<PitchDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<PitchDeck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [investorVersion, setInvestorVersion] = useState<InvestorVersionResponse | null>(null);
  const [benchmark, setBenchmark] = useState<SectorBenchmarkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load decks on mount
  const loadDecks = useCallback(async () => {
    try {
      const data = await api.getPitchDecks();
      setDecks(data);
    } catch {
      // Ignore errors on initial load
    }
  }, []);

  // Upload handler
  const handleUpload = async (file: File, investorType?: InvestorType) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await api.uploadPitchDeck(file, investorType);
      // Poll for completion
      pollForCompletion(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const pollForCompletion = async (deckId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const deck = await api.getPitchDeck(deckId);
        if (deck.status === 'completed' || deck.status === 'failed') {
          setSelectedDeck(deck);
          setIsUploading(false);
          loadDecks();
          return;
        }
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setError('Analysis timed out');
          setIsUploading(false);
        }
      } catch {
        setError('Failed to check analysis status');
        setIsUploading(false);
      }
    };

    poll();
  };

  const handleGenerateInvestorVersion = async (investorType: InvestorType) => {
    if (!selectedDeck) return;
    setIsLoading(true);
    try {
      const result = await api.generateInvestorVersion(selectedDeck.id, investorType);
      setInvestorVersion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate version');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetBenchmark = async (sector: string) => {
    if (!selectedDeck) return;
    setIsLoading(true);
    try {
      const result = await api.getSectorBenchmark(selectedDeck.id, sector);
      setBenchmark(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get benchmark');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">
            Pitch Deck Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            AI-powered analysis with investor-specific recommendations
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {!selectedDeck ? (
        <UploadSection 
          onUpload={handleUpload} 
          isUploading={isUploading}
          decks={decks}
          onSelectDeck={setSelectedDeck}
          onLoadDecks={loadDecks}
        />
      ) : (
        <AnalysisView
          deck={selectedDeck}
          investorVersion={investorVersion}
          benchmark={benchmark}
          isLoading={isLoading}
          onGenerateInvestorVersion={handleGenerateInvestorVersion}
          onGetBenchmark={handleGetBenchmark}
          onBack={() => {
            setSelectedDeck(null);
            setInvestorVersion(null);
            setBenchmark(null);
          }}
        />
      )}
    </div>
  );
}

function UploadSection({
  onUpload,
  isUploading,
  decks,
  onSelectDeck,
  onLoadDecks,
}: {
  onUpload: (file: File, investorType?: InvestorType) => void;
  isUploading: boolean;
  decks: PitchDeck[];
  onSelectDeck: (deck: PitchDeck) => void;
  onLoadDecks: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [investorType, setInvestorType] = useState<InvestorType | undefined>();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      onUpload(file, investorType);
    }
  }, [onUpload, investorType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, investorType);
    }
  };

  // Load decks on mount
  useEffect(() => {
    onLoadDecks();
  }, [onLoadDecks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card className="border-border/40">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="font-serif text-lg sm:text-xl">Upload Pitch Deck</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Upload your pitch deck PDF for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Target Investor Type (optional)</label>
            <Select value={investorType} onValueChange={(v) => setInvestorType(v as InvestorType)}>
              <SelectTrigger className="h-10 sm:h-9">
                <SelectValue placeholder="Select investor type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vc">Venture Capital</SelectItem>
                <SelectItem value="angel">Angel Investor</SelectItem>
                <SelectItem value="corporate">Corporate Investor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors cursor-pointer min-h-[140px] flex flex-col items-center justify-center",
              dragActive ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/50",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="space-y-3">
                <SpinnerIcon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-primary" />
                <p className="text-xs sm:text-sm text-muted-foreground">Analyzing your pitch deck...</p>
                <p className="text-xs text-muted-foreground">This may take 1-2 minutes</p>
              </div>
            ) : (
              <>
                <UploadIcon />
                <p className="mt-2 text-xs sm:text-sm font-medium">Drop your PDF here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Max 25MB, PDF only</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="font-serif text-lg sm:text-xl">Previous Analyses</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            View your previously analyzed pitch decks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {decks.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">
              No pitch decks analyzed yet
            </p>
          ) : (
            <ScrollArea className="h-[250px] sm:h-[300px]">
              <div className="space-y-2 pr-2">
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => onSelectDeck(deck)}
                    className="w-full p-3 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors text-left active:bg-muted/70"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{deck.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(deck.createdAt).toLocaleDateString()} • {deck.status}
                        </p>
                      </div>
                      {deck.status === 'completed' && deck.analysis && (
                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-semibold text-primary">
                            {deck.analysis.overallScore}
                          </p>
                          <p className="text-xs text-muted-foreground">score</p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisView({
  deck,
  investorVersion,
  benchmark,
  isLoading,
  onGenerateInvestorVersion,
  onGetBenchmark,
  onBack,
}: {
  deck: PitchDeck;
  investorVersion: InvestorVersionResponse | null;
  benchmark: SectorBenchmarkResponse | null;
  isLoading: boolean;
  onGenerateInvestorVersion: (type: InvestorType) => void;
  onGetBenchmark: (sector: string) => void;
  onBack: () => void;
}) {
  const analysis = deck.analysis;

  if (deck.status === 'failed') {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center">
          <XCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-destructive mb-4" />
          <h3 className="font-medium text-sm sm:text-base">Analysis Failed</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            We couldn&apos;t analyze this pitch deck. Please try uploading again.
          </p>
          <Button onClick={onBack} className="mt-4" size="sm">Upload Another</Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-8 text-center">
          <SpinnerIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-primary mb-4" />
          <h3 className="font-medium text-sm sm:text-base">Analyzing...</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            This may take 1-2 minutes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack} size="sm" className="self-start">
          <ArrowLeftIcon /> <span className="ml-1">Back</span>
        </Button>
        <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">{deck.originalName}</p>
      </div>

      {/* Overall Score */}
      <Card className="border-border/40">
        <CardContent className="py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary">{analysis.overallScore ?? 0}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
              <div>
                <p className="text-xl sm:text-2xl font-semibold">{analysis.investorFit?.vc ?? 0}</p>
                <p className="text-xs text-muted-foreground">VC Fit</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-semibold">{analysis.investorFit?.angel ?? 0}</p>
                <p className="text-xs text-muted-foreground">Angel Fit</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-semibold">{analysis.investorFit?.corporate ?? 0}</p>
                <p className="text-xs text-muted-foreground">Corporate Fit</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sections" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="sections" className="text-xs sm:text-sm py-2">Sections</TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs sm:text-sm py-2">Feedback</TabsTrigger>
          <TabsTrigger value="investor" className="text-xs sm:text-sm py-2">Investor</TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs sm:text-sm py-2">Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="sections">
          <Card className="border-border/40">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="font-serif text-lg sm:text-xl">Section Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.sections && Object.keys(analysis.sections).length > 0 ? (
                <ScrollArea className="h-[400px] sm:h-auto sm:max-h-[500px]">
                  <div className="space-y-4 pr-2">
                    {Object.entries(analysis.sections).map(([key, section]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {section.present ? (
                              <CheckCircleIcon className="text-green-500 shrink-0" />
                            ) : (
                              <XCircleIcon className="text-red-500 shrink-0" />
                            )}
                            <span className="font-medium text-xs sm:text-sm truncate">{SECTION_LABELS[key] || key}</span>
                          </div>
                          <span className={cn(
                            "font-semibold text-xs sm:text-sm shrink-0",
                            (section.score ?? 0) >= 70 ? "text-green-500" :
                            (section.score ?? 0) >= 50 ? "text-yellow-500" : "text-red-500"
                          )}>
                            {section.score ?? 0}/100
                          </span>
                        </div>
                        <Progress value={section.score ?? 0} className="h-1.5 sm:h-2" />
                        <p className="text-xs sm:text-sm text-muted-foreground">{section.feedback ?? 'No feedback available'}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No section analysis available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-base sm:text-lg text-green-600">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] sm:h-auto sm:max-h-[250px]">
                  {analysis.strengths && analysis.strengths.length > 0 ? (
                    <ul className="space-y-2 pr-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                          <CheckCircleIcon className="text-green-500 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No strengths identified yet</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-base sm:text-lg text-red-600">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] sm:h-auto sm:max-h-[250px]">
                  {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
                    <ul className="space-y-2 pr-2">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                          <XCircleIcon className="text-red-500 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No weaknesses identified yet</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-base sm:text-lg">Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] sm:h-auto sm:max-h-[250px]">
                  {analysis.suggestions && analysis.suggestions.length > 0 ? (
                    <ul className="space-y-2 pr-2">
                      {analysis.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                          <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No suggestions available yet</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="investor">
          <Card className="border-border/40">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="font-serif text-lg sm:text-xl">Generate Investor-Specific Version</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Get tailored recommendations for different investor types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile: Dialog for investor version */}
              <div className="sm:hidden">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={isLoading}>
                      Generate Investor Version
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Investor Type</DialogTitle>
                      <DialogDescription>Choose the investor type to generate tailored recommendations</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 pt-4">
                      <Button onClick={() => onGenerateInvestorVersion('vc')} disabled={isLoading} variant="outline" className="w-full justify-start">
                        Venture Capital
                      </Button>
                      <Button onClick={() => onGenerateInvestorVersion('angel')} disabled={isLoading} variant="outline" className="w-full justify-start">
                        Angel Investor
                      </Button>
                      <Button onClick={() => onGenerateInvestorVersion('corporate')} disabled={isLoading} variant="outline" className="w-full justify-start">
                        Corporate Investor
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Desktop: Inline buttons */}
              <div className="hidden sm:flex gap-2 flex-wrap">
                <Button onClick={() => onGenerateInvestorVersion('vc')} disabled={isLoading} variant="outline" size="sm">
                  VC Version
                </Button>
                <Button onClick={() => onGenerateInvestorVersion('angel')} disabled={isLoading} variant="outline" size="sm">
                  Angel Version
                </Button>
                <Button onClick={() => onGenerateInvestorVersion('corporate')} disabled={isLoading} variant="outline" size="sm">
                  Corporate Version
                </Button>
              </div>

              {isLoading && <SpinnerIcon className="mx-auto" />}

              {investorVersion && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="font-medium text-sm sm:text-base mb-2">Fit Score: {investorVersion.fitScore}/100</h4>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Suggestions</h4>
                    <ul className="space-y-1 text-xs sm:text-sm">
                      {investorVersion.suggestions.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-green-600">Emphasize</h4>
                      <ul className="space-y-1 text-xs sm:text-sm">
                        {investorVersion.emphasize.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-red-600">De-emphasize</h4>
                      <ul className="space-y-1 text-xs sm:text-sm">
                        {investorVersion.deemphasize.map((d, i) => (
                          <li key={i}>• {d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmark">
          <Card className="border-border/40">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="font-serif text-lg sm:text-xl">Sector Benchmark</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Compare your deck against sector standards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile: Dialog for sector selection */}
              <div className="sm:hidden">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={isLoading}>
                      Select Sector to Compare
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Sector</DialogTitle>
                      <DialogDescription>Choose a sector to benchmark against</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 pt-4">
                      <Button onClick={() => onGetBenchmark('saas')} disabled={isLoading} variant="outline" className="w-full justify-start">SaaS</Button>
                      <Button onClick={() => onGetBenchmark('fintech')} disabled={isLoading} variant="outline" className="w-full justify-start">Fintech</Button>
                      <Button onClick={() => onGetBenchmark('healthtech')} disabled={isLoading} variant="outline" className="w-full justify-start">Healthtech</Button>
                      <Button onClick={() => onGetBenchmark('ai_ml')} disabled={isLoading} variant="outline" className="w-full justify-start">AI/ML</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Desktop: Inline buttons */}
              <div className="hidden sm:flex gap-2 flex-wrap">
                <Button onClick={() => onGetBenchmark('saas')} disabled={isLoading} variant="outline" size="sm">SaaS</Button>
                <Button onClick={() => onGetBenchmark('fintech')} disabled={isLoading} variant="outline" size="sm">Fintech</Button>
                <Button onClick={() => onGetBenchmark('healthtech')} disabled={isLoading} variant="outline" size="sm">Healthtech</Button>
                <Button onClick={() => onGetBenchmark('ai_ml')} disabled={isLoading} variant="outline" size="sm">AI/ML</Button>
              </div>

              {isLoading && <SpinnerIcon className="mx-auto" />}

              {benchmark && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
                    <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold text-primary">{benchmark.yourScore}</p>
                      <p className="text-xs text-muted-foreground">Your Score</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold">{benchmark.sectorAverage}</p>
                      <p className="text-xs text-muted-foreground">Sector Avg</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold">{benchmark.topDecksScore}</p>
                      <p className="text-xs text-muted-foreground">Top 10%</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold">{benchmark.percentile}%</p>
                      <p className="text-xs text-muted-foreground">Percentile</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-green-600">Above Average</h4>
                      <ul className="space-y-1 text-xs sm:text-sm">
                        {benchmark.aboveAverage.map((a, i) => (
                          <li key={i}>• {a}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-red-600">Below Average</h4>
                      <ul className="space-y-1 text-xs sm:text-sm">
                        {benchmark.belowAverage.map((b, i) => (
                          <li key={i}>• {b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
