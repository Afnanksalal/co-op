'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperPlaneTilt,
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  Sparkle,
  CircleNotch,
  Robot,
  User as UserIcon,
  Copy,
  Check,
  CaretDown,
  CaretUp,
  NotionLogo,
  Lightning,
  Brain,
  ArrowClockwise,
  ThumbsUp,
  ThumbsDown,
  BookmarkSimple,
  DownloadSimple,
  Paperclip,

  X,
  FilePdf,
  FileDoc,
  FileText,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import { useChatStore, useSessionStore } from '@/lib/store';
import type { AgentType, Session, ChatDocument, StreamEvent } from '@/lib/api/types';
import { cn, generateId, copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const agentConfig: Record<AgentType, { name: string; icon: typeof Scales; color: string }> = {
  legal: { name: 'Legal', icon: Scales, color: 'text-blue-500' },
  finance: { name: 'Finance', icon: ChartLineUp, color: 'text-green-500' },
  investor: { name: 'Investor', icon: UsersThree, color: 'text-purple-500' },
  competitor: { name: 'Competitor', icon: Globe, color: 'text-orange-500' },
};

const suggestions = [
  'What legal structure should I use and how does it affect my finances?',
  'Analyze my market position and find investors for my stage',
  'How do I calculate runway and what legal docs do I need for fundraising?',
  'Compare my competitors and suggest investor pitch strategies',
];

export default function ChatPage() {
  const { user } = useUser();
  const { currentSession, setCurrentSession } = useSessionStore();
  const {
    messages,
    selectedAgent,
    isLoading,
    lastUserPrompt,
    addMessage,
    updateMessage,
    removeMessage,
    setSelectedAgent,
    setLoading,
    setLastUserPrompt,
    clearMessages,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [ratedMessages, setRatedMessages] = useState<Set<string>>(new Set());
  const [uploadedDocs, setUploadedDocs] = useState<ChatDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionInitRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize session - only load existing session, don't create new one
  // Session is created on first message send
  useEffect(() => {
    const initSession = async () => {
      if (!user?.startup) return;
      
      // Prevent duplicate initialization (React StrictMode runs effects twice)
      if (sessionInitRef.current) return;
      sessionInitRef.current = true;

      // Check if we're continuing from a previous session
      const continueSessionStr = sessionStorage.getItem('continueSession');
      if (continueSessionStr) {
        try {
          const continueSession = JSON.parse(continueSessionStr) as Session;
          sessionStorage.removeItem('continueSession');
          
          // Set the session and load its messages
          setCurrentSession(continueSession);
          const existingMessages = await api.getSessionMessages(continueSession.id);
          if (existingMessages.length > 0) {
            clearMessages();
            existingMessages.forEach((msg) => {
              addMessage({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                agent: msg.agent as AgentType | 'multi' | undefined,
                timestamp: new Date(msg.createdAt),
              });
            });
          }
          return;
        } catch (error) {
          console.error('Failed to continue session:', error);
          sessionStorage.removeItem('continueSession');
        }
      }

      // If we have a current session in store, load its messages
      if (currentSession) {
        try {
          const existingMessages = await api.getSessionMessages(currentSession.id);
          if (existingMessages.length > 0 && messages.length === 0) {
            // Only load if we don't already have messages
            existingMessages.forEach((msg) => {
              addMessage({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                agent: msg.agent as AgentType | 'multi' | undefined,
                timestamp: new Date(msg.createdAt),
              });
            });
          }
        } catch (error) {
          console.error('Failed to load session messages:', error);
        }
        return;
      }

      // Don't create a session automatically - wait for first message
      // This prevents empty "Untitled Session" entries
    };

    initSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.startup]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  }, []);

  const handleExportToNotion = useCallback(async (messageId: string, content: string, agent: AgentType | 'multi') => {
    setIsExporting(messageId);
    try {
      const agentName = agent === 'multi' ? 'Multi-Agent' : agentConfig[agent].name;
      const result = await api.exportToNotion({
        title: `${agentName} Analysis - ${new Date().toLocaleDateString()}`,
        agentType: agent === 'multi' ? 'legal' : agent,
        content,
        sources: [],
        metadata: { sessionId: currentSession?.id },
      });
      toast.success('Exported to Notion');
      window.open(result.pageUrl, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export to Notion');
    }
    setIsExporting(null);
  }, [currentSession?.id]);

  const toggleDetails = (id: string) => {
    setExpandedDetails(expandedDetails === id ? null : id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user?.startup || isLoading) return;

    const userMessageId = generateId();
    const assistantMessageId = generateId();
    const prompt = input.trim();
    const isMultiAgent = selectedAgent === null;

    // Create session on first message if none exists
    let sessionToUse = currentSession;
    if (!sessionToUse) {
      try {
        sessionToUse = await api.createSession({
          startupId: user.startup.id,
          metadata: { source: 'web-chat' },
        });
        setCurrentSession(sessionToUse);
      } catch (error) {
        console.error('Failed to create session:', error);
        toast.error('Failed to start chat session');
        return;
      }
    }

    addMessage({
      id: userMessageId,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    });

    addMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agent: isMultiAgent ? 'multi' : selectedAgent,
      timestamp: new Date(),
      isStreaming: true,
    });

    setInput('');
    setLoading(true);
    setThinkingSteps([]);
    setShowThinking(false);

    // Cleanup any existing stream before starting a new one
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Build request with document IDs
      const documentIds = uploadedDocs.map(d => d.id);
      const request = isMultiAgent
        ? {
            agents: ['legal', 'finance', 'investor', 'competitor'],
            prompt,
            sessionId: sessionToUse.id,
            startupId: user.startup.id,
            documents: documentIds,
          }
        : {
            agentType: selectedAgent,
            prompt,
            sessionId: sessionToUse.id,
            startupId: user.startup.id,
            documents: documentIds,
          };

      const { taskId } = await api.queueAgent(request);

      // Save user message to database (title auto-generated from first message)
      await api.addSessionMessage(sessionToUse.id, {
        role: 'user',
        content: prompt,
      });

      let finalContent = '';
      const collectedThinkingSteps: string[] = [];

      // Use SSE streaming for real-time updates
      const handleStreamEvent = (event: StreamEvent) => {
        switch (event.type) {
          case 'progress': {
            const { phase, progress, content } = event.data;
            let progressText = content || '';
            
            if (!progressText && phase) {
              switch (phase) {
                case 'gathering':
                  progressText = isMultiAgent
                    ? `Gathering expert responses... ${progress || 0}%`
                    : `Analyzing your question... ${progress || 0}%`;
                  break;
                case 'critiquing':
                  progressText = `Cross-critiquing responses for accuracy... ${progress || 0}%`;
                  break;
                case 'synthesizing':
                  progressText = `Synthesizing final response... ${progress || 0}%`;
                  break;
                default:
                  progressText = `Processing... ${progress || 0}%`;
              }
            }
            
            updateMessage(assistantMessageId, { content: progressText });
            break;
          }
          
          case 'thinking': {
            const { step, agent } = event.data;
            if (step) {
              const stepText = agent ? `[${agent}] ${step}` : step;
              collectedThinkingSteps.push(stepText);
              setThinkingSteps([...collectedThinkingSteps]);
              
              // Auto-expand on first thinking step
              if (collectedThinkingSteps.length === 1) {
                setShowThinking(true);
              }
            }
            break;
          }
          
          case 'chunk': {
            // For streaming content chunks
            const { content } = event.data;
            if (content) {
              finalContent += content;
              updateMessage(assistantMessageId, { content: finalContent });
            }
            break;
          }
          
          case 'done': {
            // Check if request was aborted
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }
            
            const { result } = event.data;
            if (result && typeof result === 'object') {
              const taskResult = result as { results?: Array<{ phase: string; output: { content: string; confidence: number; sources: string[] } }> };
              const finalResult = taskResult.results?.find((r) => r.phase === 'final');
              if (finalResult) {
                finalContent = finalResult.output.content;
                updateMessage(assistantMessageId, {
                  content: finalContent,
                  confidence: finalResult.output.confidence,
                  sources: finalResult.output.sources,
                  isStreaming: false,
                  thinkingSteps: collectedThinkingSteps,
                });
              }
            }
            
            // Save assistant response
            if (finalContent && sessionToUse) {
              api.addSessionMessage(sessionToUse.id, {
                role: 'assistant',
                content: finalContent,
                agent: isMultiAgent ? undefined : selectedAgent ?? undefined,
              }).catch(console.error);
              
              setFollowUpSuggestions(generateFollowUpSuggestions(prompt, finalContent));
            }
            
            setLastUserPrompt(prompt);
            setLoading(false);
            streamCleanupRef.current = null;
            break;
          }
          
          case 'error': {
            // Check if request was aborted
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }
            
            const { error } = event.data;
            let displayMessage = error || 'Sorry, I encountered an error. Please try again.';
            
            // Show specific error message for usage limits
            if (displayMessage.toLowerCase().includes('limit') || displayMessage.toLowerCase().includes('quota') || displayMessage.toLowerCase().includes('exceeded')) {
              displayMessage = `You've reached your usage limit. ${displayMessage}`;
            } else if (displayMessage.toLowerCase().includes('rate')) {
              displayMessage = 'Too many requests. Please wait a moment and try again.';
            }
            
            updateMessage(assistantMessageId, {
              content: displayMessage,
              isStreaming: false,
            });
            toast.error(displayMessage);
            setLoading(false);
            streamCleanupRef.current = null;
            break;
          }
        }
      };

      // Start SSE stream
      const cleanup = api.streamAgentTask(
        taskId,
        handleStreamEvent,
        (error) => {
          console.error('Stream error:', error);
          // Fallback to polling if SSE fails
          fallbackToPoll(taskId, assistantMessageId, isMultiAgent, prompt, collectedThinkingSteps);
        }
      );
      
      streamCleanupRef.current = cleanup;

    } catch (error) {
      console.error('Failed to get response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      
      // Show specific error message for usage limits
      let displayMessage = 'Sorry, I encountered an error. Please try again.';
      if (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exceeded')) {
        displayMessage = `You've reached your usage limit. ${errorMessage}`;
      } else if (errorMessage.toLowerCase().includes('rate')) {
        displayMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (errorMessage !== 'Failed to get response') {
        displayMessage = errorMessage;
      }
      
      updateMessage(assistantMessageId, {
        content: displayMessage,
        isStreaming: false,
      });
      toast.error(displayMessage);
      setLoading(false);
    }
  };

  // Fallback polling if SSE connection fails
  const fallbackToPoll = async (
    taskId: string,
    assistantMessageId: string,
    isMultiAgent: boolean,
    prompt: string,
    collectedSteps: string[]
  ) => {
    let completed = false;
    let finalContent = '';
    
    while (!completed) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      try {
        const status = await api.getTaskStatus(taskId);

        if (status.status === 'completed' && status.result) {
          const finalResult = status.result.results.find((r) => r.phase === 'final');
          if (finalResult) {
            finalContent = finalResult.output.content;
            updateMessage(assistantMessageId, {
              content: finalContent,
              confidence: finalResult.output.confidence,
              sources: finalResult.output.sources,
              isStreaming: false,
              thinkingSteps: collectedSteps,
            });
          }
          completed = true;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Task failed');
        } else {
          const detail = status.progressDetail;
          let progressText = isMultiAgent
            ? `Consulting all agents... ${status.progress}%`
            : `Thinking... ${status.progress}%`;
          
          if (detail?.message) {
            progressText = detail.message;
          }
          
          if (detail?.councilSteps) {
            collectedSteps.push(...detail.councilSteps.filter(s => !collectedSteps.includes(s)));
            setThinkingSteps([...collectedSteps]);
          }
          
          updateMessage(assistantMessageId, { content: progressText });
        }
      } catch (error) {
        console.error('Poll error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
        
        // Show specific error message for usage limits
        let displayMessage = 'Sorry, I encountered an error. Please try again.';
        if (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exceeded')) {
          displayMessage = `You've reached your usage limit. ${errorMessage}`;
        } else if (errorMessage.toLowerCase().includes('rate')) {
          displayMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (errorMessage !== 'Failed to get response' && errorMessage !== 'Task failed') {
          displayMessage = errorMessage;
        }
        
        updateMessage(assistantMessageId, {
          content: displayMessage,
          isStreaming: false,
        });
        toast.error(displayMessage);
        completed = true;
      }
    }

    if (finalContent && currentSession) {
      await api.addSessionMessage(currentSession.id, {
        role: 'assistant',
        content: finalContent,
        agent: isMultiAgent ? undefined : selectedAgent ?? undefined,
      });
      setFollowUpSuggestions(generateFollowUpSuggestions(prompt, finalContent));
    }
    
    setLastUserPrompt(prompt);
    setLoading(false);
  };
  
  // Generate contextual follow-up suggestions
  const generateFollowUpSuggestions = (query: string, _response: string): string[] => {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Legal follow-ups
    if (lowerQuery.includes('legal') || lowerQuery.includes('contract') || lowerQuery.includes('compliance')) {
      suggestions.push('What are the key risks I should be aware of?');
      suggestions.push('Can you provide a checklist for compliance?');
    }
    
    // Finance follow-ups
    if (lowerQuery.includes('financ') || lowerQuery.includes('runway') || lowerQuery.includes('revenue')) {
      suggestions.push('How can I extend my runway?');
      suggestions.push('What metrics should I track?');
    }
    
    // Investor follow-ups
    if (lowerQuery.includes('investor') || lowerQuery.includes('fundrais') || lowerQuery.includes('pitch')) {
      suggestions.push('What should I include in my pitch deck?');
      suggestions.push('How do I approach these investors?');
    }
    
    // Competitor follow-ups
    if (lowerQuery.includes('competitor') || lowerQuery.includes('market') || lowerQuery.includes('position')) {
      suggestions.push('How can I differentiate from competitors?');
      suggestions.push('What market trends should I watch?');
    }
    
    // Generic follow-ups if none matched
    if (suggestions.length === 0) {
      suggestions.push('Can you elaborate on this?');
      suggestions.push('What are the next steps?');
      suggestions.push('What are the potential risks?');
    }
    
    return suggestions.slice(0, 3);
  };
  
  // Regenerate the last response
  const handleRegenerate = async () => {
    if (!lastUserPrompt || !currentSession || !user?.startup || isLoading) return;
    
    // Remove the last assistant message
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      removeMessage(lastAssistantMsg.id);
    }
    
    // Resubmit with the same prompt
    setInput(lastUserPrompt);
    // Trigger submit on next tick
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    }, 0);
  };
  
  // Rate a response
  const handleRate = (messageId: string, isPositive: boolean) => {
    setRatedMessages(prev => new Set(prev).add(messageId));
    toast.success(isPositive ? 'Thanks for the feedback!' : 'We\'ll work on improving');
  };

  // Bookmark a response
  const handleBookmark = async (messageId: string, content: string, agent?: string) => {
    try {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await api.createBookmark({
        title,
        content,
        sessionId: currentSession?.id,
        messageId,
        agent,
      });
      toast.success('Response saved to bookmarks');
    } catch (error) {
      console.error('Failed to bookmark:', error);
      toast.error('Failed to save bookmark');
    }
  };

  // Document upload handlers
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      toast.error('Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.');
      return;
    }

    setIsUploading(true);
    try {
      const doc = await api.uploadDocument(file, currentSession?.id);
      setUploadedDocs(prev => [...prev, doc]);
      toast.success(`${file.name} uploaded`);
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error('Failed to upload document');
    }
    setIsUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      setUploadedDocs(prev => prev.filter(d => d.id !== docId));
      toast.success('Document removed');
    } catch (error) {
      console.error('Failed to remove document:', error);
      toast.error('Failed to remove document');
    }
  };

  const getDocIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return FilePdf;
    if (mimeType.includes('word') || mimeType.includes('document')) return FileDoc;
    return FileText;
  };

  // Load session documents
  useEffect(() => {
    const loadDocs = async () => {
      if (!currentSession) return;
      try {
        const docs = await api.getDocuments(currentSession.id);
        setUploadedDocs(docs);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };
    loadDocs();
  }, [currentSession]);

  // Cleanup SSE and abort controller on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Export current session
  const handleExportSession = async (format: 'markdown' | 'json') => {
    if (!currentSession) return;
    try {
      const result = await api.exportSession(currentSession.id, { format });
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Session exported');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export session');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  const getPlaceholder = () => {
    if (selectedAgent === null) {
      return 'Ask all agents anything... (A2A multi-agent mode)';
    }
    return `Ask ${agentConfig[selectedAgent].name} anything...`;
  };

  const handleNewChat = () => {
    if (!user?.startup) return;
    
    // Clear current messages and session - new session created on first message
    clearMessages();
    setCurrentSession(null);
    setThinkingSteps([]);
    setUploadedDocs([]);
    setFollowUpSuggestions([]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto">
      {/* Agent Selector */}
      <div className="flex items-center gap-1 sm:gap-2 pb-3 sm:pb-4 border-b border-border/40 shrink-0 overflow-x-auto">
        {messages.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              New Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExportSession('markdown')}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground mr-2"
              title="Export as Markdown"
            >
              <DownloadSimple weight="regular" className="w-4 h-4" />
            </Button>
          </>
        )}
        <span className="text-xs sm:text-sm text-muted-foreground mr-1 sm:mr-2 shrink-0">Mode:</span>
        
        {/* Multi-Agent (A2A) Option */}
        <button
          onClick={() => setSelectedAgent(null)}
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all duration-200 shrink-0',
            selectedAgent === null
              ? 'bg-primary/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Lightning weight={selectedAgent === null ? 'fill' : 'regular'} className="w-4 h-4" />
          <span className="hidden sm:inline">All Agents</span>
        </button>

        <div className="w-px h-4 bg-border/40 mx-1" />

        {/* Individual Agents */}
        {(Object.keys(agentConfig) as AgentType[]).map((agent) => {
          const config = agentConfig[agent];
          const isSelected = selectedAgent === agent;
          return (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all duration-200 shrink-0',
                isSelected
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <config.icon weight={isSelected ? 'fill' : 'regular'} className="w-4 h-4" />
              <span className="hidden sm:inline">{config.name}</span>
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-6 space-y-4 scrollbar-hide"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center px-2">
            <div className="text-center max-w-md">
              {selectedAgent === null ? (
                <>
                  <Lightning weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                  <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Multi-Agent Mode</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
                    All 4 agents collaborate to answer your question. They critique each other and synthesize the best response.
                  </p>
                </>
              ) : (
                <>
                  <Sparkle weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                  <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Start a conversation</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
                    Ask {agentConfig[selectedAgent].name} agent any question.
                  </p>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left text-xs sm:text-sm p-3 sm:p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    {message.agent === 'multi' ? (
                      <Lightning weight="regular" className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Robot weight="regular" className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div className={cn('max-w-[85%]', message.role === 'user' ? 'order-first' : '')}>
                  {message.isStreaming ? (
                    <Card className="border-border/40 bg-card">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CircleNotch weight="bold" className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm font-medium">{message.content || 'Thinking...'}</span>
                          </div>
                          {message.agent === 'multi' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="flex -space-x-1">
                                {['legal', 'finance', 'investor', 'competitor'].map((agent) => (
                                  <div key={agent} className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                                    <span className="text-[8px] font-medium uppercase">{agent[0]}</span>
                                  </div>
                                ))}
                              </div>
                              <span>All agents collaborating</span>
                            </div>
                          )}
                          {/* Thinking Steps Dropdown */}
                          {thinkingSteps.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => setShowThinking(!showThinking)}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Brain weight="regular" className="w-3.5 h-3.5 text-primary" />
                                {showThinking ? (
                                  <CaretUp weight="bold" className="w-3 h-3" />
                                ) : (
                                  <CaretDown weight="bold" className="w-3 h-3" />
                                )}
                                <span>Thinking process ({thinkingSteps.length} steps)</span>
                              </button>
                              <AnimatePresence>
                                {showThinking && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1.5 max-h-48 overflow-y-auto">
                                      {thinkingSteps.map((step, i) => (
                                        <motion.div 
                                          key={i} 
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: i * 0.05 }}
                                          className={cn(
                                            "flex items-start gap-2 text-xs",
                                            i === thinkingSteps.length - 1 && "text-primary font-medium"
                                          )}
                                        >
                                          <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                                          <span className={i === thinkingSteps.length - 1 ? "text-foreground" : "text-foreground/70"}>{step}</span>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : message.role === 'user' ? (
                    <Card className="border-border/40 bg-primary/10">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      <Card className="border-border/40 bg-card">
                        <CardContent className="p-4">
                          {message.agent === 'multi' && (
                            <Badge variant="secondary" className="mb-2 text-xs">
                              <Lightning weight="fill" className="w-3 h-3 mr-1" />
                              Multi-Agent Response
                            </Badge>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </CardContent>
                      </Card>

                      {message.confidence && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleDetails(message.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {expandedDetails === message.id ? (
                              <CaretUp weight="bold" className="w-3 h-3" />
                            ) : (
                              <CaretDown weight="bold" className="w-3 h-3" />
                            )}
                            <span>{Math.round(message.confidence * 100)}% confidence</span>
                            {message.thinkingSteps && message.thinkingSteps.length > 0 && (
                              <span>· {message.thinkingSteps.length} thinking steps</span>
                            )}
                            {message.sources && message.sources.length > 0 && (
                              <span>· {message.sources.length} sources</span>
                            )}
                          </button>
                          <div className="flex-1" />
                          {/* Rating buttons */}
                          {!ratedMessages.has(message.id) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRate(message.id, true)}
                                className="h-7 px-2 text-muted-foreground hover:text-green-500"
                              >
                                <ThumbsUp weight="regular" className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRate(message.id, false)}
                                className="h-7 px-2 text-muted-foreground hover:text-red-500"
                              >
                                <ThumbsDown weight="regular" className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(message.content, message.id)}
                            className="h-7 px-2 text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === message.id ? (
                              <Check weight="bold" className="w-3.5 h-3.5" />
                            ) : (
                              <Copy weight="regular" className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBookmark(message.id, message.content, message.agent === 'multi' ? 'multi-agent' : message.agent)}
                            className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            title="Save to bookmarks"
                          >
                            <BookmarkSimple weight="regular" className="w-3.5 h-3.5" />
                          </Button>
                          {message.agent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportToNotion(message.id, message.content, message.agent!)}
                              disabled={isExporting === message.id}
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            >
                              {isExporting === message.id ? (
                                <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <NotionLogo weight="regular" className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}

                      <AnimatePresence>
                        {expandedDetails === message.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-2"
                          >
                            {/* Thinking Steps */}
                            {message.thinkingSteps && message.thinkingSteps.length > 0 && (
                              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                                  <Brain weight="regular" className="w-3.5 h-3.5 text-primary" />
                                  <span>Thinking Process ({message.thinkingSteps.length} steps)</span>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {message.thinkingSteps.map((step, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                      <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                                      <span className="text-foreground/80">{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Sources */}
                            {message.sources && message.sources.length > 0 && (
                              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                                <div className="flex flex-wrap gap-1">
                                  {message.sources.map((source, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {source}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <UserIcon weight="regular" className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up Suggestions */}
      {followUpSuggestions.length > 0 && messages.length > 0 && !isLoading && (
        <div className="pb-2 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Follow-up:</span>
            {lastUserPrompt && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowClockwise weight="regular" className="w-3 h-3 mr-1" />
                Regenerate
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {followUpSuggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setInput(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-border/40 hover:border-border hover:bg-muted/30 transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="pt-3 sm:pt-4 border-t border-border/40 shrink-0">
        {/* Uploaded Documents */}
        {uploadedDocs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {uploadedDocs.map((doc) => {
              const DocIcon = getDocIcon(doc.mimeType);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/40 text-xs"
                >
                  <DocIcon weight="regular" className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="max-w-[120px] truncate">{doc.originalName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(doc.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X weight="bold" className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="min-h-[48px] sm:min-h-[56px] max-h-[120px] sm:max-h-[150px] pl-10 pr-12 sm:pr-14 resize-none text-sm"
              disabled={isLoading}
            />
            
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFileSelect}
              disabled={isLoading || isUploading}
              className="absolute left-1 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Attach document"
            >
              {isUploading ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip weight="regular" className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 sm:h-9 sm:w-9"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : (
                <PaperPlaneTilt weight="fill" className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center hidden sm:block">
            {selectedAgent === null ? 'Multi-agent A2A mode · ' : ''}Press Enter to send · Shift+Enter for new line · Attach PDFs for context
          </p>
        </form>
      </div>
    </div>
  );
}
