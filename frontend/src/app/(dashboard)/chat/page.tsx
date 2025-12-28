'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from '@/components/motion';
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
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import { useChatStore, useSessionStore } from '@/lib/store';
import type { AgentType, Session, SecureDocument, StreamEvent } from '@/lib/api/types';
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
  const [uploadedDocs, setUploadedDocs] = useState<SecureDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false); // Prevent race condition
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
    if (!input.trim() || !user?.startup || isLoading || isCreatingSession) return;

    // Check if any documents are still processing
    const processingDocs = uploadedDocs.filter(d => d.status === 'processing');
    if (processingDocs.length > 0) {
      toast.error('Please wait for documents to finish processing');
      return;
    }

    const userMessageId = generateId();
    const assistantMessageId = generateId();
    const prompt = input.trim();
    const isMultiAgent = selectedAgent === null;

    // Create session on first message if none exists (with race condition guard)
    let sessionToUse = currentSession;
    if (!sessionToUse) {
      // Prevent multiple rapid session creations
      if (isCreatingSession) {
        toast.error('Please wait, creating session...');
        return;
      }
      
      setIsCreatingSession(true);
      try {
        sessionToUse = await api.createSession({
          startupId: user.startup.id,
          metadata: { source: 'web-chat' },
        });
        setCurrentSession(sessionToUse);
      } catch (error) {
        console.error('Failed to create session:', error);
        toast.error('Failed to start chat session');
        setIsCreatingSession(false);
        return;
      }
      setIsCreatingSession(false);
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
      const handleStreamEvent = async (event: StreamEvent) => {
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
              // Try to find 'final' phase, fallback to last result with content
              const finalResult = taskResult.results?.find((r) => r.phase === 'final') 
                ?? taskResult.results?.find((r) => r.output?.content);
              if (finalResult?.output?.content) {
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
            
            // Save assistant response - ensure it persists to database
            if (finalContent && sessionToUse) {
              try {
                await api.addSessionMessage(sessionToUse.id, {
                  role: 'assistant',
                  content: finalContent,
                  agent: isMultiAgent ? undefined : selectedAgent ?? undefined,
                  metadata: isMultiAgent ? { multiAgent: true } : undefined,
                });
              } catch (saveError) {
                console.error('Failed to save assistant message:', saveError);
                toast.error('Response generated but failed to save to history');
              }
              
              setFollowUpSuggestions(generateFollowUpSuggestions(prompt, finalContent));
            } else if (!finalContent) {
              // Log for debugging - this shouldn't happen in normal flow
              console.error('No final content to save. Event data:', JSON.stringify(event.data));
              // Try to extract any content from the result for debugging
              const resultStr = JSON.stringify(result);
              if (resultStr.length < 500) {
                console.error('Full result:', resultStr);
              }
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
          // Fallback to polling if SSE fails - pass sessionToUse to avoid stale closure
          fallbackToPoll(taskId, assistantMessageId, isMultiAgent, prompt, collectedThinkingSteps, sessionToUse);
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
    collectedSteps: string[],
    session: Session
  ) => {
    let completed = false;
    let finalContent = '';
    
    while (!completed) {
      // Check if request was aborted before polling
      if (abortControllerRef.current?.signal.aborted) {
        setLoading(false);
        return;
      }
      
      await new Promise((resolve) => setTimeout(resolve, 800));
      try {
        const status = await api.getTaskStatus(taskId);

        if (status.status === 'completed' && status.result) {
          // Try to find 'final' phase, fallback to last result with content
          const finalResult = status.result.results.find((r) => r.phase === 'final')
            ?? status.result.results.find((r) => r.output?.content);
          if (finalResult?.output?.content) {
            finalContent = finalResult.output.content;
            updateMessage(assistantMessageId, {
              content: finalContent,
              confidence: finalResult.output.confidence,
              sources: finalResult.output.sources,
              isStreaming: false,
              thinkingSteps: collectedSteps,
            });
          } else {
            console.error('No final content in poll result:', JSON.stringify(status.result));
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

    // Save assistant response using the passed session (not stale store value)
    if (finalContent && session) {
      try {
        await api.addSessionMessage(session.id, {
          role: 'assistant',
          content: finalContent,
          agent: isMultiAgent ? undefined : selectedAgent ?? undefined,
          metadata: isMultiAgent ? { multiAgent: true } : undefined,
        });
      } catch (saveError) {
        console.error('Failed to save assistant message:', saveError);
        toast.error('Response generated but failed to save to history');
      }
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

    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    // Only PDF files are supported
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (file.type !== 'application/pdf' && ext !== 'pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    setIsUploading(true);
    try {
      const doc = await api.uploadSecureDocument(file, currentSession?.id);
      setUploadedDocs(prev => [...prev, doc]);
      toast.success(`${file.name} uploaded and ready`);
    } catch (error) {
      console.error('Failed to upload document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      toast.error(errorMessage);
    }
    setIsUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    try {
      await api.deleteSecureDocument(docId);
      setUploadedDocs(prev => prev.filter(d => d.id !== docId));
      toast.success('Document removed');
    } catch (error) {
      console.error('Failed to remove document:', error);
      toast.error('Failed to remove document');
    }
  };

  const getDocIcon = () => FilePdf;

  // Load session documents when continuing an existing session
  // Don't overwrite local docs if we just created a new session (docs uploaded before session creation)
  useEffect(() => {
    const loadDocs = async () => {
      if (!currentSession) return;
      // Only load from server if we don't have local docs (continuing existing session)
      // If we have local docs, they were uploaded before session was created
      if (uploadedDocs.length > 0) return;
      try {
        const docs = await api.getSecureDocuments(currentSession.id);
        if (docs.length > 0) {
          setUploadedDocs(docs);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };
    loadDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  // Note: Document processing is synchronous - when upload returns, status is already 'ready'
  // No polling needed. If async processing is added later, use Supabase Realtime instead.

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
    <div className="chat-container flex flex-col max-w-4xl mx-auto">
      {/* Header - Agent Selector */}
      <div className="flex flex-col gap-3 pb-3 sm:pb-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
          {messages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 shrink-0"
              >
                New Chat
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleExportSession('markdown')}
                className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 shrink-0"
                title="Export as Markdown"
              >
                <DownloadSimple weight="regular" className="w-4 h-4" />
              </Button>
              <div className="w-px h-5 bg-border/40 shrink-0" />
            </>
          )}
          <span className="text-xs sm:text-sm text-muted-foreground shrink-0">Mode:</span>
          
          {/* Multi-Agent (A2A) Option */}
          <button
            onClick={() => setSelectedAgent(null)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all duration-200 shrink-0 touch-manipulation active:scale-95',
              selectedAgent === null
                ? 'bg-primary/10 text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Lightning weight={selectedAgent === null ? 'fill' : 'regular'} className="w-4 h-4" />
            <span>All</span>
          </button>

          <div className="w-px h-5 bg-border/40 shrink-0" />

          {/* Individual Agents */}
          {(Object.keys(agentConfig) as AgentType[]).map((agent) => {
            const config = agentConfig[agent];
            const isSelected = selectedAgent === agent;
            return (
              <button
                key={agent}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all duration-200 shrink-0 touch-manipulation active:scale-95',
                  isSelected
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <config.icon weight={isSelected ? 'fill' : 'regular'} className="w-4 h-4" />
                <span className="hidden sm:inline">{config.name}</span>
                <span className="sm:hidden">{config.name.slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-4 sm:py-6 space-y-3 sm:space-y-4 scrollbar-hide"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center px-2">
            <div className="text-center max-w-md">
              {selectedAgent === null ? (
                <>
                  <Lightning weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6 opacity-50" />
                  <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Multi-Agent Mode</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                    All 4 agents collaborate to answer your question. They critique each other and synthesize the best response.
                  </p>
                </>
              ) : (
                <>
                  <Sparkle weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6 opacity-50" />
                  <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Start a conversation</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                    Ask {agentConfig[selectedAgent].name} agent any question.
                  </p>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left text-xs sm:text-sm p-3 sm:p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200 touch-manipulation active:scale-[0.98]"
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
                className={cn('flex gap-2 sm:gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    {message.agent === 'multi' ? (
                      <Lightning weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    ) : (
                      <Robot weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div className={cn('max-w-[88%] sm:max-w-[85%]', message.role === 'user' ? 'order-first' : '')}>
                  {message.isStreaming ? (
                    <Card className="border-border/40 bg-card">
                      <CardContent className="p-3 sm:p-4">
                        <div className="space-y-2.5 sm:space-y-3">
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
                      <CardContent className="p-3 sm:p-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      <Card className="border-border/40 bg-card">
                        <CardContent className="p-3 sm:p-4">
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <button
                            onClick={() => toggleDetails(message.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 touch-manipulation"
                          >
                            {expandedDetails === message.id ? (
                              <CaretUp weight="bold" className="w-3 h-3" />
                            ) : (
                              <CaretDown weight="bold" className="w-3 h-3" />
                            )}
                            <span>{Math.round(message.confidence * 100)}% confidence</span>
                            {message.thinkingSteps && message.thinkingSteps.length > 0 && (
                              <span className="hidden sm:inline">· {message.thinkingSteps.length} steps</span>
                            )}
                            {message.sources && message.sources.length > 0 && (
                              <span className="hidden sm:inline">· {message.sources.length} sources</span>
                            )}
                          </button>
                          <div className="hidden sm:block flex-1" />
                          {/* Action buttons - horizontal scroll on mobile */}
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
                            {/* Rating buttons */}
                            {!ratedMessages.has(message.id) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRate(message.id, true)}
                                  className="h-9 w-9 sm:h-7 sm:w-auto sm:px-2 p-0 text-muted-foreground hover:text-green-500 touch-manipulation active:scale-95 shrink-0"
                                >
                                  <ThumbsUp weight="regular" className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRate(message.id, false)}
                                  className="h-9 w-9 sm:h-7 sm:w-auto sm:px-2 p-0 text-muted-foreground hover:text-red-500 touch-manipulation active:scale-95 shrink-0"
                                >
                                  <ThumbsDown weight="regular" className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(message.content, message.id)}
                              className="h-9 w-9 sm:h-7 sm:w-auto sm:px-2 p-0 text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 shrink-0"
                            >
                              {copiedId === message.id ? (
                                <Check weight="bold" className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              ) : (
                                <Copy weight="regular" className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBookmark(message.id, message.content, message.agent === 'multi' ? 'multi-agent' : message.agent)}
                              className="h-9 w-9 sm:h-7 sm:w-auto sm:px-2 p-0 text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 shrink-0"
                              title="Save to bookmarks"
                            >
                              <BookmarkSimple weight="regular" className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </Button>
                            {message.agent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportToNotion(message.id, message.content, message.agent!)}
                                disabled={isExporting === message.id}
                                className="h-9 w-9 sm:h-7 sm:w-auto sm:px-2 p-0 text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 shrink-0"
                              >
                                {isExporting === message.id ? (
                                  <CircleNotch weight="bold" className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" />
                                ) : (
                                  <NotionLogo weight="regular" className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
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
                                <p className="text-xs font-medium text-muted-foreground mb-2">Sources ({message.sources.length})</p>
                                <div className="space-y-1.5 overflow-hidden">
                                  {message.sources.map((source, i) => {
                                    // Extract domain from URL for display
                                    let displayText = source;
                                    try {
                                      const url = new URL(source);
                                      displayText = url.hostname.replace('www.', '');
                                    } catch {
                                      // Not a valid URL, truncate if too long
                                      displayText = source.length > 50 ? source.slice(0, 47) + '...' : source;
                                    }
                                    const isUrl = source.startsWith('http');
                                    return (
                                      <div key={i} className="flex items-start gap-2 text-xs min-w-0">
                                        <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                                        {isUrl ? (
                                          <a
                                            href={source}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline break-all overflow-wrap-anywhere"
                                            title={source}
                                          >
                                            {displayText}
                                          </a>
                                        ) : (
                                          <span className="text-muted-foreground break-all overflow-wrap-anywhere" title={source}>
                                            {displayText}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
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
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <UserIcon weight="regular" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up Suggestions - Dismissible */}
      {followUpSuggestions.length > 0 && messages.length > 0 && !isLoading && (
        <div className="pb-2 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Follow-up:</span>
              {lastUserPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground touch-manipulation active:scale-95"
                >
                  <ArrowClockwise weight="regular" className="w-3 h-3 mr-1" />
                  Regenerate
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFollowUpSuggestions([])}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground touch-manipulation active:scale-95"
              title="Dismiss suggestions"
            >
              <X weight="regular" className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {followUpSuggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setInput(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-border/40 hover:border-border hover:bg-muted/30 transition-all touch-manipulation active:scale-[0.98]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input - fixed at bottom with padding */}
      <div className="pt-3 sm:pt-4 pb-3 sm:pb-4 border-t border-border/40 shrink-0">
        {/* Uploaded Documents */}
        {uploadedDocs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadedDocs.map((doc) => {
              const DocIcon = getDocIcon();
              const isProcessing = doc.status === 'processing';
              return (
                <Badge 
                  key={doc.id} 
                  variant={isProcessing ? 'outline' : 'secondary'} 
                  className={cn('text-xs gap-1', isProcessing && 'animate-pulse')}
                >
                  {isProcessing ? (
                    <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <DocIcon weight="regular" className="w-3.5 h-3.5" />
                  )}
                  <span className="max-w-[100px] truncate">{doc.originalName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(doc.id)}
                    className="ml-1 hover:text-destructive"
                    disabled={isProcessing}
                  >
                    ×
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-end gap-2">
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label className="cursor-pointer shrink-0">
              <div 
                onClick={handleFileSelect}
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors",
                  (isLoading || isUploading) && "opacity-50 pointer-events-none"
                )}
              >
                {isUploading ? (
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip weight="regular" className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </label>
            
            <div className="relative flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholder()}
                className="min-h-[48px] sm:min-h-[56px] max-h-[120px] sm:max-h-[150px] pr-12 sm:pr-14 resize-none text-sm"
                disabled={isLoading}
              />
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
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center hidden sm:block">
            {selectedAgent === null ? 'Multi-agent A2A mode · ' : ''}Press Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
