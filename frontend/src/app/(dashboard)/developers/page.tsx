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
    <div className="relative group rounded-lg overflow-hidden border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-muted/50 border-b border-border/40">
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
      <pre className="p-3 sm:p-4 text-[11px] sm:text-xs overflow-x-auto font-mono leading-relaxed">
        <code className="text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}

const agents = [
  { id: 'legal', name: 'Legal', icon: Scales, description: 'Corporate structure, contracts, compliance', source: 'RAG' },
  { id: 'finance', name: 'Finance', icon: ChartLineUp, description: 'Financial modeling, metrics, runway', source: 'RAG' },
  { id: 'investor', name: 'Investor', icon: UsersThree, description: 'VC matching, pitch optimization', source: 'Web Research' },
  { id: 'competitor', name: 'Competitor', icon: Globe, description: 'Market analysis, positioning', source: 'Web Research' },
];

export default function DevelopersPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-2">Developer Documentation</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Integrate Co-Op&apos;s AI agents into your applications using our REST API, MCP Protocol, or A2A Protocol.
        </p>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Link href="/settings/api-keys">
          <Card className="border-border/40 hover:border-border transition-colors cursor-pointer h-full">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Key weight="regular" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Get API Key</p>
                <p className="text-xs text-muted-foreground truncate">Create keys for authentication</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <a href="https://github.com/Afnanksalal/co-op" target="_blank" rel="noopener noreferrer">
          <Card className="border-border/40 hover:border-border transition-colors cursor-pointer h-full">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Code weight="regular" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">GitHub Repo</p>
                <p className="text-xs text-muted-foreground truncate">View source code</p>
              </div>
            </CardContent>
          </Card>
        </a>
        <a href={`${API_URL.replace('/api/v1', '')}/docs`} target="_blank" rel="noopener noreferrer">
          <Card className="border-border/40 hover:border-border transition-colors cursor-pointer h-full">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Terminal weight="regular" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Swagger Docs</p>
                <p className="text-xs text-muted-foreground truncate">Interactive API explorer</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </motion.div>

      {/* Main Documentation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="rest" className="space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="rest" className="gap-1.5 text-xs sm:text-sm">
              <Code weight="regular" className="w-4 h-4 hidden sm:block" />
              REST API
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-1.5 text-xs sm:text-sm">
              <Plugs weight="regular" className="w-4 h-4 hidden sm:block" />
              MCP
            </TabsTrigger>
            <TabsTrigger value="a2a" className="gap-1.5 text-xs sm:text-sm">
              <Lightning weight="regular" className="w-4 h-4 hidden sm:block" />
              A2A
            </TabsTrigger>
          </TabsList>

          {/* REST API Tab */}
          <TabsContent value="rest" className="space-y-6">
            <Card className="border-border/40">
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-lg sm:text-xl">REST API</CardTitle>
                <CardDescription>
                  Full REST API access to all agents. Authenticate with Bearer token or API key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-sm mb-3">Base URL</h4>
                  <CodeBlock code={API_URL} />
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Authentication</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use either a Supabase JWT token or an API key created in settings.
                  </p>
                  <CodeBlock code={`# Bearer Token (User Auth)
curl -X GET ${API_URL}/users/me \\
  -H "Authorization: Bearer <supabase_access_token>"

# API Key (Service Auth)
curl -X GET ${API_URL}/mcp-server/discover \\
  -H "X-API-Key: coop_xxxxxxxxxxxxx"`} />
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Run Agent (Synchronous)</h4>
                  <CodeBlock code={`curl -X POST ${API_URL}/agents/run \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentType": "legal",
    "prompt": "What legal structure should I use?",
    "sessionId": "<session_uuid>",
    "startupId": "<startup_uuid>",
    "documents": []
  }'`} />
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Queue Agent (Async)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    For long-running queries, use the queue endpoint and poll for status.
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
                  <h4 className="font-medium text-sm mb-3">Key Endpoints</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { method: 'POST', path: '/agents/run', desc: 'Run agent synchronously' },
                      { method: 'POST', path: '/agents/queue', desc: 'Queue agent task' },
                      { method: 'GET', path: '/agents/tasks/:id', desc: 'Get task status' },
                      { method: 'GET', path: '/agents/stream/:id', desc: 'SSE stream' },
                      { method: 'POST', path: '/sessions', desc: 'Create session' },
                      { method: 'GET', path: '/sessions/:id/messages', desc: 'Get messages' },
                      { method: 'POST', path: '/api-keys', desc: 'Create API key' },
                      { method: 'POST', path: '/webhooks', desc: 'Create webhook' },
                    ].map((ep) => (
                      <div key={ep.path} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                        <Badge variant={ep.method === 'GET' ? 'secondary' : 'default'} className="text-[10px] w-12 justify-center">
                          {ep.method}
                        </Badge>
                        <code className="text-xs flex-1 truncate">{ep.path}</code>
                        <span className="text-xs text-muted-foreground hidden sm:block">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Tab */}
          <TabsContent value="mcp" className="space-y-6">
            <Card className="border-border/40">
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-lg sm:text-xl">MCP Protocol</CardTitle>
                <CardDescription>
                  Use Co-Op agents in Claude Desktop, Cursor, Kiro, and any MCP-compatible client.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm">
                    <strong>What is MCP?</strong> Model Context Protocol allows AI assistants to use external tools.
                    Co-Op exposes all agents as MCP tools that can be called from Claude, Cursor, or any MCP client.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Discover Available Tools</h4>
                  <CodeBlock code={`curl -X GET ${API_URL}/mcp-server/discover \\
  -H "X-API-Key: coop_your_api_key_here"`} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Create an API key in <a href="/settings/api-keys" className="underline">Settings → API Keys</a>
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Discovery Response</h4>
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
          "sector": { "enum": ["fintech", "greentech", "healthtech", "saas", "ecommerce"] }
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
                  <h4 className="font-medium text-sm mb-3">Execute Tool</h4>
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
                  <h4 className="font-medium text-sm mb-3">Configure in Claude Desktop</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add to your Claude Desktop config (<code className="text-xs bg-muted px-1 rounded">claude_desktop_config.json</code>):
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Generate your API key at <a href="/settings/api-keys" className="underline">Settings → API Keys</a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* A2A Tab */}
          <TabsContent value="a2a" className="space-y-6">
            <Card className="border-border/40">
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-lg sm:text-xl">A2A Protocol</CardTitle>
                <CardDescription>
                  Agent-to-Agent communication for multi-agent queries with cross-critique consensus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm">
                    <strong>What is A2A?</strong> Agent-to-Agent protocol enables multiple agents to collaborate,
                    cross-critique each other&apos;s responses, and synthesize a consensus answer.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">How It Works</h4>
                  <div className="space-y-3">
                    {[
                      { step: '1', title: 'Parallel Generation', desc: 'All selected agents generate responses simultaneously' },
                      { step: '2', title: 'Shuffle & Anonymize', desc: 'Responses are shuffled for fair critique' },
                      { step: '3', title: 'Cross-Critique', desc: 'Each agent critiques other agents\' responses (1-10 score)' },
                      { step: '4', title: 'Synthesize', desc: 'Best response improved with critique feedback' },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-3">Multi-Agent Query</h4>
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
                  <h4 className="font-medium text-sm mb-3">Agent Capabilities</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { agent: 'legal', actions: ['analyze_contract', 'check_compliance', 'review_terms'] },
                      { agent: 'finance', actions: ['calculate_runway', 'analyze_metrics', 'valuation_estimate'] },
                      { agent: 'investor', actions: ['find_investors', 'match_profile', 'research_vc'] },
                      { agent: 'competitor', actions: ['analyze_market', 'compare_features', 'research_competitor'] },
                    ].map((item) => (
                      <div key={item.agent} className="p-3 rounded-lg border border-border/40">
                        <p className="font-medium text-sm capitalize mb-2">{item.agent}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.actions.map((action) => (
                            <Badge key={action} variant="outline" className="text-[10px]">
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

      {/* Available Agents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/40">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
              <Robot weight="regular" className="w-5 h-5" />
              Available Agents
            </CardTitle>
            <CardDescription>
              Four specialized agents powered by LLM Council architecture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="p-4 rounded-lg border border-border/40 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <agent.icon weight="regular" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{agent.name}</p>
                      <Badge variant="outline" className="text-[10px]">{agent.source}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.description}</p>
                    <code className="text-[10px] text-muted-foreground mt-1 block">agentType: &quot;{agent.id}&quot;</code>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* LLM Council */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/40">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-lg sm:text-xl">LLM Council Architecture</CardTitle>
            <CardDescription>
              Every response is cross-validated by multiple AI models for accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The LLM Council ensures response accuracy through mandatory cross-critique between 2-5 AI models.
              Each model generates a response, then critiques other models&apos; responses anonymously.
              The final answer synthesizes the best insights with critique feedback.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { name: 'Llama 3.3 70B Versatile', provider: 'Groq' },
                { name: 'Kimi K2 Instruct', provider: 'Groq' },
                { name: 'Gemini 2.5 Flash', provider: 'Google' },
                { name: 'DeepSeek R1 32B', provider: 'HuggingFace' },
                { name: 'Phi-3 Mini 4K', provider: 'HuggingFace' },
                { name: 'Qwen 2.5 14B 1M', provider: 'HuggingFace' },
              ].map((model) => (
                <div key={model.name} className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs font-medium truncate">{model.name}</p>
                  <p className="text-[10px] text-muted-foreground">{model.provider}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
