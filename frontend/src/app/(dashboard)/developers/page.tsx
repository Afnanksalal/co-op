'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.co-op.ai/api/v1';

// SVG Icons
const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z"/>
  </svg>
);

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M160,16A80.07,80.07,0,0,0,83.91,120.78L26.34,178.34A8,8,0,0,0,24,184v40a8,8,0,0,0,8,8H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A80,80,0,1,0,160,16Zm20,76a16,16,0,1,1,16-16A16,16,0,0,1,180,92Z"/>
  </svg>
);

const TerminalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M117.31,134l-72,64a8,8,0,1,1-10.63-12L100,128,34.69,70A8,8,0,1,1,45.32,58l72,64a8,8,0,0,1,0,12ZM216,184H120a8,8,0,0,0,0,16h96a8,8,0,0,0,0-16Z"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>
  </svg>
);

const RobotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80V192a32,32,0,0,0,32,32H200a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48Zm16,144a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V80A16,16,0,0,1,56,64H200a16,16,0,0,1,16,16Zm-36-56a12,12,0,1,1-12-12A12,12,0,0,1,180,136ZM88,136a12,12,0,1,1-12-12A12,12,0,0,1,88,136Zm80,32H88a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16Z"/>
  </svg>
);

const ScalesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M239.43,133l-32-80A8,8,0,0,0,200,48H136V24a8,8,0,0,0-16,0V48H56a8,8,0,0,0-7.43,5l-32,80A8,8,0,0,0,16,136a48,48,0,0,0,96,0,8,8,0,0,0-.57-3L82.89,64H120V208H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V64h37.11l-28.54,69A8,8,0,0,0,144,136a48,48,0,0,0,96,0A8,8,0,0,0,239.43,133ZM64,168a32,32,0,0,1-28.23-48H92.23A32,32,0,0,1,64,168Zm128,0a32,32,0,0,1-28.23-48h56.46A32,32,0,0,1,192,168Z"/>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,40,179.31V200H224A8,8,0,0,1,232,208Z"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"/>
  </svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Z"/>
  </svg>
);

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
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-muted-foreground hover:text-foreground">
          {copied ? <><CheckIcon /><span className="text-[10px] ml-1 text-green-500">Copied</span></> : <><CopyIcon /><span className="text-[10px] ml-1">Copy</span></>}
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
  { id: 'legal', name: 'Legal', Icon: ScalesIcon, description: 'Corporate structure, contracts, compliance', source: 'RAG' },
  { id: 'finance', name: 'Finance', Icon: ChartIcon, description: 'Financial modeling, metrics, runway', source: 'RAG' },
  { id: 'investor', name: 'Investor', Icon: UsersIcon, description: 'VC matching, pitch optimization', source: 'Web Research' },
  { id: 'competitor', name: 'Competitor', Icon: GlobeIcon, description: 'Market analysis, positioning', source: 'Web Research' },
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
  const [activeTab, setActiveTab] = useState('rest');

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-8">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">Developer Docs</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Integrate Co-Op&apos;s AI agents via REST API, MCP, or A2A.</p>
      </motion.div>

      {/* Quick Links */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2 sm:gap-4">
        <Link href="/settings/api-keys" className="block">
          <Card className="border-border/40 hover:border-border transition-colors h-full">
            <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><KeyIcon /></div>
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><CodeIcon /></div>
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><TerminalIcon /></div>
              <div className="text-center sm:text-left min-w-0">
                <p className="font-medium text-[10px] sm:text-sm">Swagger</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">API explorer</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </motion.div>

      {/* Main Documentation Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="rest">REST</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
            <TabsTrigger value="a2a">A2A</TabsTrigger>
          </TabsList>

          {/* REST API Tab */}
          <TabsContent value="rest">
            <Card className="border-border/40">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="font-serif text-base sm:text-xl">REST API</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Full REST API access. Authenticate with Bearer token or API key.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Base URL</h4>
                  <CodeBlock code={API_URL} />
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Authentication</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">Use Supabase JWT token or API key from settings.</p>
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
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Key Endpoints</h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {endpoints.map((ep) => (
                      <div key={ep.path} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                        <Badge variant={ep.method === 'GET' ? 'secondary' : 'default'} className="text-[8px] sm:text-[10px] w-10 sm:w-12 justify-center flex-shrink-0">{ep.method}</Badge>
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
                <CardDescription className="text-xs sm:text-sm">Use in Claude Desktop, Cursor, Kiro, and MCP clients.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-[10px] sm:text-sm"><strong>MCP</strong> lets AI assistants use external tools. Co-Op exposes agents as MCP tools.</p>
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Discover Tools</h4>
                  <CodeBlock code={`curl -X GET ${API_URL}/mcp-server/discover \\
  -H "X-API-Key: coop_your_api_key_here"`} />
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">Create an API key in <Link href="/settings/api-keys" className="underline">Settings → API Keys</Link></p>
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
      "stage": "seed"
    }
  }'`} />
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">Claude Desktop Config</h4>
                  <p className="text-[10px] sm:text-sm text-muted-foreground mb-2 sm:mb-3">Add to <code className="text-[9px] sm:text-xs bg-muted px-1 py-0.5 rounded">claude_desktop_config.json</code>:</p>
                  <CodeBlock code={`{
  "mcpServers": {
    "co-op": {
      "command": "curl",
      "args": ["-X", "GET", "${API_URL}/mcp-server/discover"],
      "env": { "X_API_KEY": "coop_your_api_key_here" }
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
                <CardDescription className="text-xs sm:text-sm">Multi-agent queries with cross-critique consensus.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-[10px] sm:text-sm"><strong>A2A</strong> enables agents to collaborate, cross-critique, and synthesize consensus answers.</p>
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3">How It Works</h4>
                  <div className="space-y-2 sm:space-y-3">
                    {a2aSteps.map((item) => (
                      <div key={item.step} className="flex items-start gap-2 sm:gap-3">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-medium">{item.step}</div>
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
      "agents": ["legal", "finance", "investor"]
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
                          {item.actions.map((action) => (<Badge key={action} variant="outline" className="text-[7px] sm:text-[10px] px-1.5">{action}</Badge>))}
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-border/40">
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="font-serif text-base sm:text-xl flex items-center gap-2">
              <RobotIcon />
              Agents
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Four specialized agents with LLM Council.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {agents.map((agent) => (
                <div key={agent.id} className="p-2.5 sm:p-4 rounded-lg border border-border/40 flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <agent.Icon />
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

      {/* LLM Council */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="border-border/40">
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="font-serif text-base sm:text-xl">LLM Council</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Cross-validated by multiple AI models.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
            <p className="text-[10px] sm:text-sm text-muted-foreground">2-5 AI models generate, cross-critique anonymously, then synthesize the best answer.</p>
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
