'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  Plugs,
  Lightning,
  Key,
  Copy,
  Check,
  Terminal,
  Globe,
  Scales,
  ChartLineUp,
  UsersThree,
  Robot,
} from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.co-op.ai/api/v1';

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border/40">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check weight="bold" className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy weight="regular" className="w-3 h-3 mr-1" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-3 text-[10px] sm:text-xs font-mono leading-relaxed">
          <code className="text-foreground/90 whitespace-pre-wrap break-words sm:whitespace-pre sm:break-normal">{code}</code>
        </pre>
      </div>
    </div>
  );
}

const agents = [
  { id: 'legal', name: 'Legal', icon: Scales, description: 'Corporate structure, contracts, compliance', source: 'RAG' },
  { id: 'finance', name: 'Finance', icon: ChartLineUp, description: 'Financial modeling, metrics, runway', source: 'RAG' },
  { id: 'investor', name: 'Investor', icon: UsersThree, description: 'VC matching, pitch optimization', source: 'Web Research' },
  { id: 'competitor', name: 'Competitor', icon: Globe, description: 'Market analysis, positioning', source: 'Web Research' },
];

const endpoints = [
  { method: 'POST', path: '/agents/run', desc: 'Run sync' },
  { method: 'POST', path: '/agents/queue', desc: 'Queue task' },
  { method: 'GET', path: '/agents/tasks/:id', desc: 'Get status' },
  { method: 'GET', path: '/agents/stream/:id', desc: 'SSE stream' },
  { method: 'POST', path: '/sessions', desc: 'Create session' },
  { method: 'POST', path: '/api-keys', desc: 'Create key' },
];

const llmModels = [
  { name: 'Llama 3.3 70B', provider: 'Groq' },
  { name: 'Kimi K2', provider: 'Groq' },
  { name: 'Gemini 2.5', provider: 'Google' },
  { name: 'DeepSeek R1', provider: 'HF' },
  { name: 'Phi-3 Mini', provider: 'HF' },
  { name: 'Qwen 2.5', provider: 'HF' },
];

const agentCapabilities = [
  { agent: 'legal', actions: ['contracts', 'compliance'] },
  { agent: 'finance', actions: ['runway', 'metrics'] },
  { agent: 'investor', actions: ['find_vcs', 'match'] },
  { agent: 'competitor', actions: ['market', 'compare'] },
];

const a2aSteps = [
  { step: '1', title: 'Generate', desc: 'Agents respond in parallel' },
  { step: '2', title: 'Shuffle', desc: 'Anonymize for fair critique' },
  { step: '3', title: 'Critique', desc: 'Cross-critique (1-10 score)' },
  { step: '4', title: 'Synthesize', desc: 'Best response + feedback' },
];

export default function DevelopersPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-8">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">Developer Docs</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Integrate Co-Op&apos;s AI agents via REST API, MCP, or A2A.
        </p>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-2 sm:gap-4"
      >
        <Link href="/settings/api-keys" className="block">
          <Card className="border-border/40 hover:border-border transition-colors h-full">
            <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Key weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center sm:text-left min-w-0">
                <p className="font-medium text-[10px] sm:text-sm">API Key</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">Create keys</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <a href="https://github.com/Afnanksalal/co-op" target="_blank" rel="noopener noreferrer" className="block">
          <Card className="border-border/40 hover:border-border transition-colors h-full">
            <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Code weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center sm:text-left min-w-0">
                <p className="font-medium text-[10px] sm:text-sm">GitHub</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">Source code</p>
              </div>
            </CardContent>
          </Card>
        </a>
        <a href={`${API_URL.replace('/api/v1', '')}/docs`} target="_blank" rel="noopener noreferrer" className="block">
          <Card className="border-border/40 hover:border-border transition-colors h-full">
            <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Terminal weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center sm:text-left min-w-0">
                <p className="font-medium text-[10px] sm:text-sm">Swagger</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">API explorer</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </motion.div>

      {/* Main Documentation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="rest" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-10 mb-4">
            <TabsTrigger value="rest" className="text-xs sm:text-sm gap-1.5">
              <Code weight="regular" className="w-4 h-4 hidden sm:block" />
              REST
            </TabsTrigger>
            <TabsTrigger value="mcp" className="text-xs sm:text-sm gap-1.5">
              <Plugs weight="regular" className="w-4 h-4 hidden sm:block" />
              MCP
            </TabsTrigger>
            <TabsTrigger value="a2a" className="text-xs sm:text-sm gap-1.5">
              <Lightning weight="regular" className="w-4 h-4 hidden sm:block" />
              A2A
            </TabsTrigger>
          </TabsList>

          {/* REST API Tab */}
          <TabsContent value="rest">
            <Card className="border-border/40">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="font-serif text-base sm:text-xl">REST API</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Full REST API access. Authenticate with Bearer token or API key.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Base URL</h4>
                  <CodeBlock code={API_URL} />
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Authentication</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                    Use Supabase JWT token or API key from settings.
                  </p>
                  <CodeBlock code={`# Bearer Token (User Auth)
curl -X GET ${API_URL}/users/me \\
  -H "Authorization: Bearer <supabase_access_token>"

# API Key (Service Auth)
curl -X GET ${API_URL}/mcp-server/discover \\
  -H "X-API-Key: coop_xxxxxxxxxxxxx"`} />
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Run Agent (Sync)</h4>
                  <CodeBlock code={`curl -X POST ${API_URL}/agents/run \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentType": "legal",
    "prompt": "What legal structure?",
    "sessionId": "<uuid>",
    "startupId": "<uuid>"
  }'`} />
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Queue Agent (Async)</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                    For long queries, use queue endpoint and poll.
                  </p>
                  <CodeBlock code={`# Queue the task
curl -X POST ${API_URL}/agents/queue \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{ "agentType": "investor", "prompt": "Find seed VCs", ... }'

# Response: { "taskId": "uuid", "messageId": "..." }

# Poll for status
curl -X GET ${API_URL}/agents/tasks/<taskId> \\
  -H "Authorization: Bearer <token>"

# Or use SSE streaming
curl -N ${API_URL}/agents/stream/<taskId>`} />
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Key Endpoints</h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {endpoints.map((ep) => (
                      <div key={ep.path} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                        <Badge 
                          variant={ep.method === 'GET' ? 'secondary' : 'default'} 
                          className="text-[8px] sm:text-[10px] w-10 sm:w-12 justify-center flex-shrink-0"
                        >
                          {ep.method}
                        </Badge>
                        <code className="text-[9px] sm:text-xs flex-1 truncate">{ep.path}</code>
                        <span className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block flex-shrink-0">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Tab */}
          <TabsContent value="mcp">
            <Card className="border-border/40">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="font-serif text-base sm:text-xl">MCP Protocol</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Use in Claude Desktop, Cursor, Kiro, and MCP clients.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-[10px] sm:text-sm">
                    <strong>MCP</strong> lets AI assistants use external tools. Co-Op exposes agents as MCP tools.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Discover Tools</h4>
                  <CodeBlock code={`curl -X GET ${API_URL}/mcp-server/discover \\
  -H "X-API-Key: coop_your_api_key_here"`} />
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                    Create an API key in <Link href="/settings/api-keys" className="underline">Settings → API Keys</Link>
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Response</h4>
                  <CodeBlock code={`{
  "tools": [
    {
      "name": "legal_analysis",
      "description": "Get legal advice for startups",
      "inputSchema": {
        "type": "object",
        "properties": {
          "prompt": { "type": "string" },
          "companyName": { "type": "string" },
          "industry": { "type": "string" },
          "stage": { "type": "string" },
          "sector": { "enum": ["fintech", ...] }
        },
        "required": ["prompt"]
      }
    },
    { "name": "finance_analysis", ... },
    { "name": "investor_search", ... },
    { "name": "competitor_analysis", ... },
    { "name": "multi_agent_query", ... }
  ],
  "a2a": { "supported": true }
}`} language="json" />
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Execute Tool</h4>
                  <CodeBlock code={`curl -X POST ${API_URL}/mcp-server/execute \\
  -H "X-API-Key: coop_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "investor_search",
    "arguments": {
      "prompt": "Find seed VCs for AI startups",
      "companyName": "MyStartup",
      "industry": "ai",
      "stage": "seed",
      "sector": "saas"
    }
  }'`} />
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Claude Desktop Config</h4>
                  <p className="text-[10px] sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                    Add to <code className="text-[9px] sm:text-xs bg-muted px-1 py-0.5 rounded">claude_desktop_config.json</code>:
                  </p>
                  <CodeBlock code={`{
  "mcpServers": {
    "co-op": {
      "command": "curl",
      "args": ["-X", "GET", "${API_URL}/mcp-server/discover"],
      "env": {
        "X_API_KEY": "coop_your_api_key_here"
      }
    }
  }
}`} language="json" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* A2A Tab */}
          <TabsContent value="a2a">
            <Card className="border-border/40">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="font-serif text-base sm:text-xl">A2A Protocol</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Multi-agent queries with cross-critique consensus.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-[10px] sm:text-sm">
                    <strong>A2A</strong> enables agents to collaborate, cross-critique, and synthesize consensus answers.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">How It Works</h4>
                  <div className="space-y-2 sm:space-y-3">
                    {a2aSteps.map((item) => (
                      <div key={item.step} className="flex items-start gap-2 sm:gap-3">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-medium">
                          {item.step}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm">{item.title}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Multi-Agent Query</h4>
                  <CodeBlock code={`curl -X POST ${API_URL}/mcp-server/execute \\
  -H "X-API-Key: coop_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "multi_agent_query",
    "arguments": {
      "prompt": "Prepare for Series A fundraising",
      "agents": ["legal", "finance", "investor"],
      "companyName": "MyStartup",
      "industry": "saas",
      "stage": "seed",
      "sector": "fintech"
    }
  }'`} />
                </div>

                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Agent Capabilities</h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {agentCapabilities.map((item) => (
                      <div key={item.agent} className="p-2 sm:p-3 rounded-lg border border-border/40">
                        <p className="font-medium text-[10px] sm:text-sm capitalize mb-1 sm:mb-2">{item.agent}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.actions.map((action) => (
                            <Badge key={action} variant="outline" className="text-[7px] sm:text-[10px] px-1.5">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Available Agents - OUTSIDE of Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/40">
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="font-serif text-base sm:text-xl flex items-center gap-2">
              <Robot weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
              Agents
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Four specialized agents with LLM Council.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {agents.map((agent) => (
                <div key={agent.id} className="p-2.5 sm:p-4 rounded-lg border border-border/40 flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <agent.icon weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
                      <p className="font-medium text-xs sm:text-sm">{agent.name}</p>
                      <Badge variant="outline" className="text-[7px] sm:text-[10px]">{agent.source}</Badge>
                    </div>
                    <p className="text-[9px] sm:text-xs text-muted-foreground">{agent.description}</p>
                    <code className="text-[8px] sm:text-[10px] text-muted-foreground mt-1 block">&quot;{agent.id}&quot;</code>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* LLM Council - OUTSIDE of Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/40">
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="font-serif text-base sm:text-xl">LLM Council</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cross-validated by multiple AI models.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
            <p className="text-[10px] sm:text-sm text-muted-foreground">
              2-5 AI models generate, cross-critique anonymously, then synthesize the best answer.
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {llmModels.map((model) => (
                <div key={model.name} className="p-2 sm:p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-[8px] sm:text-xs font-medium truncate">{model.name}</p>
                  <p className="text-[7px] sm:text-[10px] text-muted-foreground">{model.provider}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
