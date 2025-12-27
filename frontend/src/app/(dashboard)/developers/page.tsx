'use client';

import { useState } from 'react';
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
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-muted-foreground hover:text-foreground">
          <span className="text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-3 text-xs font-mono leading-relaxed">
          <code className="text-foreground/90">{code}</code>
        </pre>
      </div>
    </div>
  );
}

const endpoints = [
  { method: 'POST', path: '/agents/run', desc: 'Run sync' },
  { method: 'POST', path: '/agents/queue', desc: 'Queue task' },
  { method: 'GET', path: '/agents/tasks/:id', desc: 'Get status' },
  { method: 'GET', path: '/agents/stream/:id', desc: 'SSE stream' },
];

const agentCapabilities = [
  { agent: 'legal', actions: ['contracts', 'compliance'] },
  { agent: 'finance', actions: ['runway', 'metrics'] },
  { agent: 'investor', actions: ['find_vcs', 'match'] },
  { agent: 'competitor', actions: ['market', 'compare'] },
];

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState('rest');

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight">Developer Docs</h1>
        <p className="text-muted-foreground text-sm mt-1">Integrate Co-Op&apos;s AI agents via REST API, MCP, or A2A.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link href="/settings/api-keys">
          <Card className="border-border/40 hover:border-border transition-colors h-full">
            <CardContent className="p-3 text-center">
              <p className="font-medium text-sm">API Keys</p>
              <p className="text-xs text-muted-foreground">Create keys</p>
            </CardContent>
          </Card>
        </Link>
        <a href="https://github.com/Afnanksalal/co-op" target="_blank" rel="noopener noreferrer">
          <Card className="border-border/40 hover:border-border transition-colors h-full">
            <CardContent className="p-3 text-center">
              <p className="font-medium text-sm">GitHub</p>
              <p className="text-xs text-muted-foreground">Source code</p>
            </CardContent>
          </Card>
        </a>
        <a href={`${API_URL.replace('/api/v1', '')}/docs`} target="_blank" rel="noopener noreferrer">
          <Card className="border-border/40 hover:border-border transition-colors h-full">
            <CardContent className="p-3 text-center">
              <p className="font-medium text-sm">Swagger</p>
              <p className="text-xs text-muted-foreground">API explorer</p>
            </CardContent>
          </Card>
        </a>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rest">REST</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
          <TabsTrigger value="a2a">A2A</TabsTrigger>
        </TabsList>

        <TabsContent value="rest">
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-xl">REST API</CardTitle>
              <CardDescription>Authenticate with Bearer token or API key.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-sm mb-3">Base URL</h4>
                <CodeBlock code={API_URL} />
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Authentication</h4>
                <CodeBlock code={`curl -X GET ${API_URL}/users/me \\
  -H "Authorization: Bearer <token>"

# Or use API Key
curl -X GET ${API_URL}/mcp-server/discover \\
  -H "X-API-Key: coop_xxxxx"`} />
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Run Agent</h4>
                <CodeBlock code={`curl -X POST ${API_URL}/agents/run \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"agentType": "legal", "prompt": "..."}'`} />
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Endpoints</h4>
                <div className="space-y-2">
                  {endpoints.map((ep) => (
                    <div key={ep.path} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                      <Badge variant={ep.method === 'GET' ? 'secondary' : 'default'} className="text-[10px] w-12 justify-center">{ep.method}</Badge>
                      <code className="text-xs flex-1">{ep.path}</code>
                      <span className="text-xs text-muted-foreground">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp">
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-xl">MCP Protocol</CardTitle>
              <CardDescription>Use in Claude Desktop, Cursor, or Kiro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-sm mb-3">Discover Tools</h4>
                <CodeBlock code={`curl -X GET ${API_URL}/mcp-server/discover \\
  -H "X-API-Key: coop_your_api_key"`} />
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Execute Tool</h4>
                <CodeBlock code={`curl -X POST ${API_URL}/mcp-server/execute \\
  -H "X-API-Key: coop_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "investor_search", "arguments": {...}}'`} />
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Claude Desktop Config</h4>
                <CodeBlock code={`{
  "mcpServers": {
    "co-op": {
      "command": "curl",
      "args": ["-X", "GET", "${API_URL}/mcp-server/discover"],
      "env": { "X_API_KEY": "coop_your_api_key" }
    }
  }
}`} language="json" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="a2a">
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-xl">A2A Protocol</CardTitle>
              <CardDescription>Multi-agent queries with cross-critique.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-sm mb-3">Multi-Agent Query</h4>
                <CodeBlock code={`curl -X POST ${API_URL}/mcp-server/execute \\
  -H "X-API-Key: coop_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "multi_agent_query",
    "arguments": {
      "prompt": "Prepare for Series A",
      "agents": ["legal", "finance", "investor"]
    }
  }'`} />
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Agent Capabilities</h4>
                <div className="grid grid-cols-2 gap-3">
                  {agentCapabilities.map((item) => (
                    <div key={item.agent} className="p-3 rounded-lg border border-border/40">
                      <p className="font-medium text-sm capitalize mb-2">{item.agent}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.actions.map((action) => (
                          <Badge key={action} variant="outline" className="text-[10px]">{action}</Badge>
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
    </div>
  );
}
