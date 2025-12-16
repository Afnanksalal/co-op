'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import type { AgentType, AgentPhaseResult, RagRegion, RagJurisdiction } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils';

// SVG Icons to avoid Phosphor deprecation warnings
const ScalesIcon = ({ weight = 'regular', className }: { weight?: string; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    {weight === 'fill' ? (
      <path d="M239.43,133l-32-80A8,8,0,0,0,200,48H136V24a8,8,0,0,0-16,0V48H56a8,8,0,0,0-7.43,5l-32,80A8.07,8.07,0,0,0,16,136a56,56,0,0,0,112,0,8.07,8.07,0,0,0-.57-3L99.43,64H120v88H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V64h20.57l-28,70A8.07,8.07,0,0,0,128,136a56,56,0,0,0,112,0,8.07,8.07,0,0,0-.57-3ZM72,176a40.07,40.07,0,0,1-39.2-32H111.2A40.07,40.07,0,0,1,72,176Zm0-96,25.6,64H46.4Zm112,96a40.07,40.07,0,0,1-39.2-32h78.4A40.07,40.07,0,0,1,184,176Zm0-96,25.6,64H158.4Z"/>
    ) : (
      <path d="M239.43,133l-32-80A8,8,0,0,0,200,48H136V24a8,8,0,0,0-16,0V48H56a8,8,0,0,0-7.43,5l-32,80A8.07,8.07,0,0,0,16,136a56,56,0,0,0,112,0,8.07,8.07,0,0,0-.57-3L99.43,64H120v88H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V64h20.57l-28,70A8.07,8.07,0,0,0,128,136a56,56,0,0,0,112,0,8.07,8.07,0,0,0-.57-3ZM72,176a40.07,40.07,0,0,1-39.2-32H111.2A40.07,40.07,0,0,1,72,176Zm0-96,25.6,64H46.4Zm112,96a40.07,40.07,0,0,1-39.2-32h78.4A40.07,40.07,0,0,1,184,176Zm0-96,25.6,64H158.4Z"/>
    )}
  </svg>
);
// Note: weight parameter is kept for API compatibility with Phosphor icons

const ChartLineUpIcon = ({ weight: _weight = 'regular', className }: { weight?: string; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,40,179.31V200H224A8,8,0,0,1,232,208Z"/>
  </svg>
);

const UsersThreeIcon = ({ weight: _weight = 'regular', className }: { weight?: string; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219.83,124a67.94,67.94,0,0,1,26.57,15.2A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,36.17,124a67.94,67.94,0,0,0-26.57,15.2,8,8,0,1,0,10.4,12.2A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/>
  </svg>
);

const GlobeIcon = ({ weight: _weight = 'regular', className }: { weight?: string; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Z"/>
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const PaperPlaneTiltIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"/>
  </svg>
);

const CircleNotchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M232,128a104,104,0,0,1-208,0c0-41,23.81-78.36,60.66-95.27a8,8,0,0,1,6.68,14.54C60.15,61.59,40,93.27,40,128a88,88,0,0,0,176,0c0-34.73-20.15-66.41-51.34-80.73a8,8,0,0,1,6.68-14.54C208.19,49.64,232,87,232,128Z"/>
  </svg>
);

const CaretDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
    <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
  </svg>
);

const CaretUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
    <path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"/>
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>
  </svg>
);

const NotionLogoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,40H168a8,8,0,0,0,0,16h16V176.85L111,44.14A8,8,0,0,0,104,40H40a8,8,0,0,0,0,16H56V200H40a8,8,0,0,0,0,16H88a8,8,0,0,0,0-16H72V79.15l73,132.71A8,8,0,0,0,152,216h8a8,8,0,0,0,8-8V56h48a8,8,0,0,0,0-16Z"/>
  </svg>
);

const PaperclipIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81a24,24,0,1,0-33.94-34L59.73,148a40,40,0,0,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z"/>
  </svg>
);

// Jurisdiction options for Legal agent
const REGION_OPTIONS: { value: RagRegion; label: string }[] = [
  { value: 'global', label: 'Global (General)' },
  { value: 'us', label: 'United States' },
  { value: 'eu', label: 'European Union' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'india', label: 'India' },
  { value: 'canada', label: 'Canada' },
  { value: 'apac', label: 'Asia-Pacific' },
  { value: 'latam', label: 'Latin America' },
  { value: 'mena', label: 'Middle East & North Africa' },
];

const JURISDICTION_OPTIONS: { value: RagJurisdiction; label: string; region?: RagRegion }[] = [
  { value: 'general', label: 'General Guidance' },
  // Privacy
  { value: 'gdpr', label: 'GDPR (EU Privacy)', region: 'eu' },
  { value: 'ccpa', label: 'CCPA (California Privacy)', region: 'us' },
  { value: 'lgpd', label: 'LGPD (Brazil Privacy)', region: 'latam' },
  { value: 'pipeda', label: 'PIPEDA (Canada Privacy)', region: 'canada' },
  { value: 'pdpa', label: 'PDPA (Singapore Privacy)', region: 'apac' },
  { value: 'dpdp', label: 'DPDP (India Privacy)', region: 'india' },
  // Financial
  { value: 'sec', label: 'SEC (US Securities)', region: 'us' },
  { value: 'finra', label: 'FINRA (US Financial)', region: 'us' },
  { value: 'fca', label: 'FCA (UK Financial)', region: 'uk' },
  { value: 'sebi', label: 'SEBI (India Securities)', region: 'india' },
  { value: 'mas', label: 'MAS (Singapore Financial)', region: 'apac' },
  { value: 'esma', label: 'ESMA (EU Securities)', region: 'eu' },
  // Industry
  { value: 'hipaa', label: 'HIPAA (US Healthcare)', region: 'us' },
  { value: 'pci_dss', label: 'PCI-DSS (Payment Security)' },
  { value: 'sox', label: 'SOX (US Corporate)', region: 'us' },
  { value: 'aml_kyc', label: 'AML/KYC (Anti-Money Laundering)' },
  // IP
  { value: 'dmca', label: 'DMCA (US Copyright)', region: 'us' },
  { value: 'patent', label: 'Patent Law' },
  { value: 'trademark', label: 'Trademark Law' },
  { value: 'copyright', label: 'Copyright Law' },
  // Other
  { value: 'employment', label: 'Employment Law' },
  { value: 'corporate', label: 'Corporate Law' },
  { value: 'contracts', label: 'Contract Law' },
  { value: 'tax', label: 'Tax Regulations' },
];

type IconComponent = React.FC<{ weight?: string; className?: string }>;

const agentConfig: Record<
  AgentType,
  {
    name: string;
    description: string;
    icon: IconComponent;
    examples: string[];
    hasJurisdiction?: boolean;
  }
> = {
  legal: {
    name: 'Legal Agent',
    description: 'Expert guidance on corporate structure, contracts, compliance, and legal matters.',
    icon: ScalesIcon,
    examples: [
      'What legal structure should I use for my startup?',
      'What are the key terms I should negotiate in a SAFE?',
      'How do I protect my intellectual property?',
      'What compliance requirements apply to my business?',
    ],
    hasJurisdiction: true,
  },
  finance: {
    name: 'Finance Agent',
    description: 'Financial modeling, metrics analysis, runway calculations, and financial planning.',
    icon: ChartLineUpIcon,
    examples: [
      'How do I calculate my burn rate and runway?',
      'What financial metrics should I track?',
      'How should I structure my cap table?',
      'What is a reasonable valuation for my stage?',
    ],
  },
  investor: {
    name: 'Investor Agent',
    description: 'VC matching, pitch optimization, fundraising strategy, and investor relations.',
    icon: UsersThreeIcon,
    examples: [
      'Which VCs invest in my sector and stage?',
      'How do I structure my pitch deck?',
      'What questions should I expect from investors?',
      'How do I negotiate term sheets?',
    ],
  },
  competitor: {
    name: 'Competitor Agent',
    description: 'Market analysis, competitive positioning, and strategic intelligence.',
    icon: GlobeIcon,
    examples: [
      'Who are my main competitors?',
      'How do I differentiate from competitors?',
      'What is the market size for my industry?',
      'What are the key trends in my market?',
    ],
  },
};

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentType = params.agent as AgentType;
  const { user } = useUser();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AgentPhaseResult[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Jurisdiction state for Legal agent
  const [selectedRegion, setSelectedRegion] = useState<RagRegion>('global');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<RagJurisdiction>('general');
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Filter jurisdictions based on selected region
  const filteredJurisdictions = JURISDICTION_OPTIONS.filter(
    (j) => !j.region || j.region === selectedRegion || selectedRegion === 'global'
  );

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > maxSize) {
      toast.error('File too large (max 10MB)');
      return;
    }
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      toast.error('Unsupported file type');
      return;
    }
    
    setUploadedFiles((prev) => [...prev, file]);
    toast.success(`Added: ${file.name}`);
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const config = agentConfig[agentType];
  const finalResult = results?.find((r) => r.phase === 'final');
  const thinkingResults = results?.filter((r) => r.phase !== 'final') || [];

  const handleCopy = useCallback(async (text: string) => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }, []);

  const handleExportToNotion = useCallback(async () => {
    if (!finalResult || !config) return;
    setIsExporting(true);
    try {
      const result = await api.exportToNotion({
        title: `${config.name} - ${new Date().toLocaleDateString()}`,
        agentType,
        content: finalResult.output.content,
        sources: finalResult.output.sources,
        metadata: { sessionId, prompt },
      });
      toast.success('Exported to Notion');
      window.open(result.pageUrl, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export to Notion');
    }
    setIsExporting(false);
  }, [finalResult, config, agentType, sessionId, prompt]);

  // Session is created on first message, not on page load
  // This prevents empty sessions from being created

  if (!config) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !user?.startup || isLoading) return;

    setIsLoading(true);
    setResults(null);
    const userPrompt = prompt.trim();

    try {
      // Create session on first message if none exists
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = await api.createSession({
          startupId: user.startup.id,
          metadata: { source: 'agent-page', agent: agentType },
        });
        currentSessionId = session.id;
        setSessionId(currentSessionId);
      }

      // Upload files and get document IDs
      const documentIds: string[] = [];
      if (uploadedFiles.length > 0) {
        setIsUploading(true);
        for (const file of uploadedFiles) {
          try {
            const doc = await api.uploadDocument(file, currentSessionId);
            documentIds.push(doc.id);
          } catch (error) {
            console.error('Failed to upload file:', file.name, error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
        setIsUploading(false);
        setUploadedFiles([]); // Clear uploaded files after processing
      }

      // Save user message to database
      await api.addSessionMessage(currentSessionId, {
        role: 'user',
        content: userPrompt,
      });

      // Include jurisdiction info for legal agent
      const metadata = config.hasJurisdiction ? {
        region: selectedRegion,
        jurisdiction: selectedJurisdiction,
      } : {};

      const { taskId } = await api.queueAgent({
        agentType,
        prompt: userPrompt,
        sessionId: currentSessionId,
        startupId: user.startup.id,
        documents: documentIds,
        ...metadata,
      });

      // Poll for completion
      let completed = false;
      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const status = await api.getTaskStatus(taskId);

        if (status.status === 'completed' && status.result) {
          setResults(status.result.results);
          
          // Save assistant response to database
          const final = status.result.results.find((r) => r.phase === 'final');
          if (final) {
            await api.addSessionMessage(currentSessionId, {
              role: 'assistant',
              content: final.output.content,
              agent: agentType,
            });
          }
          completed = true;
        } else if (status.status === 'failed') {
          // Show specific error message
          const errorMsg = status.error || 'Task failed';
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Failed to run agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      // Show specific error for usage limits
      if (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('quota')) {
        toast.error(`Usage limit reached: ${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }
    }

    setIsLoading(false);
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto">
      {/* Header - fixed at top */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 pb-3 sm:pb-4 border-b border-border/40 shrink-0"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
            <ArrowLeftIcon className="w-4 sm:w-5 h-4 sm:h-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <config.icon weight="regular" className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-lg sm:text-xl font-medium tracking-tight truncate">{config.name}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{config.description}</p>
            </div>
          </div>
        </div>
        
        {/* Jurisdiction Selector for Legal Agent - inline single row */}
        {config.hasJurisdiction && (
          <div className="flex items-center gap-2 ml-10 sm:ml-14">
            <Select value={selectedRegion} onValueChange={(v) => {
              setSelectedRegion(v as RagRegion);
              setSelectedJurisdiction('general');
            }}>
              <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedJurisdiction} onValueChange={(v) => setSelectedJurisdiction(v as RagJurisdiction)}>
              <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                <SelectValue placeholder="Jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                {filteredJurisdictions.map((j) => (
                  <SelectItem key={j.value} value={j.value} className="text-xs">
                    {j.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {/* Examples - show when no results */}
        {!results && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center px-2"
          >
            <div className="text-center max-w-md">
              <config.icon weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6 opacity-50" />
              <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Ask {config.name}</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">{config.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {config.examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-left text-xs sm:text-sm p-3 sm:p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && !finalResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="text-center">
              <CircleNotchIcon className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Processing your question...</p>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {finalResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Final Result Card */}
            <Card className="border-border/40">
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {finalResult.output.content}
                </p>
              </CardContent>
            </Card>

            {/* Collapsible details + actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showThinking ? (
                  <CaretUpIcon className="w-3 h-3" />
                ) : (
                  <CaretDownIcon className="w-3 h-3" />
                )}
                <span>{Math.round(finalResult.output.confidence * 100)}% confidence</span>
                {finalResult.output.sources.length > 0 && (
                  <span>· {finalResult.output.sources.length} sources</span>
                )}
                {thinkingResults.length > 0 && (
                  <span>· {thinkingResults.length} thinking steps</span>
                )}
              </button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(finalResult.output.content)}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : (
                  <CopyIcon className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportToNotion}
                disabled={isExporting}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                {isExporting ? (
                  <CircleNotchIcon className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <NotionLogoIcon className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  {/* Sources */}
                  {finalResult.output.sources.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                      <div className="flex flex-wrap gap-1">
                        {finalResult.output.sources.map((source, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thinking steps (Draft/Critique) */}
                  {thinkingResults.map((result, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/20 border border-border/40">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {result.phase.charAt(0).toUpperCase() + result.phase.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(result.output.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {result.output.content}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Input - fixed at bottom with padding */}
      <div className="pt-3 sm:pt-4 pb-3 sm:pb-4 border-t border-border/40 shrink-0">
        <form onSubmit={handleSubmit}>
          {/* Uploaded files preview */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {uploadedFiles.map((file, i) => (
                <Badge key={i} variant="secondary" className="text-xs gap-1">
                  {file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}
                  <button type="button" onClick={() => removeFile(i)} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              ))}
            </div>
          )}
          <div className="relative flex items-end gap-2">
            {/* File upload button */}
            <label className="cursor-pointer shrink-0">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isLoading || isUploading}
              />
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors">
                <PaperclipIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            </label>
            <div className="relative flex-1">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void handleSubmit(e);
                  }
                }}
                placeholder={`Ask ${config.name.toLowerCase()} anything...`}
                className="min-h-[48px] sm:min-h-[56px] max-h-[120px] sm:max-h-[150px] pr-12 sm:pr-14 resize-none text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 sm:h-9 sm:w-9"
                disabled={!prompt.trim() || isLoading}
              >
                {isLoading ? (
                  <CircleNotchIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <PaperPlaneTiltIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center hidden sm:block">
            Press Ctrl+Enter to send
          </p>
        </form>
      </div>
    </div>
  );
}
