# Co-Op Frontend Integration Guide

Complete guide for integrating the Co-Op backend API.

## Architecture Overview

| Service | Purpose |
|---------|---------|
| Neon PostgreSQL | Primary database (users, startups, sessions, etc.) |
| Supabase | Authentication only (Google OAuth + Email/Password) |
| Supabase Storage | File storage (PDFs, documents) |
| Upstash Redis | Caching + BullMQ job queues |
| RAG Service | Separate Python service for embeddings (see /RAG) |

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Supabase Auth Setup](#2-supabase-auth-setup)
3. [API Client Setup](#3-api-client-setup)
4. [Authentication Flow](#4-authentication-flow)
5. [User & Onboarding](#5-user--onboarding)
6. [Sessions & Messages](#6-sessions--messages)
7. [Agent Execution](#7-agent-execution)
8. [Webhooks](#8-webhooks)
9. [Notion Integration](#9-notion-integration)
10. [API Keys](#10-api-keys)
11. [Admin Features](#11-admin-features)
12. [Health & Analytics](#12-health--analytics)
13. [MCP Server](#13-mcp-server)
14. [TypeScript Types](#14-typescript-types)
15. [Error Handling](#15-error-handling)

---

## 1. Environment Variables

```env
# Supabase (Auth Only)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Backend API
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
```


---

## 2. Supabase Auth Setup

Supabase is used ONLY for authentication. Database is Neon PostgreSQL.

### 2.1 Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2.2 Initialize Supabase

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 2.3 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://<project>.supabase.co/auth/v1/callback`
4. In Supabase Dashboard → Authentication → Providers → Enable Google
5. Add Google Client ID and Secret

### 2.4 Auth Functions

```typescript
// lib/auth.ts
import { supabase } from './supabase';

// Google OAuth
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

// Email/Password Sign Up
export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

// Email/Password Sign In
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

// Sign Out
export async function signOut() {
  return supabase.auth.signOut();
}

// Get Access Token (for API calls)
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// Listen to Auth Changes
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
```

### 2.5 Auth Callback (Next.js App Router)

```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
```


---

## 3. API Client Setup

```typescript
// lib/api-client.ts
import { getAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
}

class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: await this.getHeaders(),
    });
    return res.json();
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    return res.json();
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    return res.json();
  }
}

export const api = new ApiClient();
```


---

## 4. Authentication Flow

### 4.1 Protected Route Wrapper

```typescript
// components/ProtectedRoute.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api-client';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Get user from backend (syncs Supabase user to Neon DB)
    const { data: user } = await api.get<User>('/users/me');
    
    if (user && !user.onboardingCompleted) {
      router.push('/onboarding');
      return;
    }
    
    setLoading(false);
  }

  if (loading) return <div>Loading...</div>;
  return <>{children}</>;
}
```

### 4.2 How Auth Works

1. User signs in via Supabase (Google OAuth or Email/Password)
2. Frontend gets JWT access token from Supabase
3. Frontend sends token in `Authorization: Bearer <token>` header
4. Backend validates token with Supabase
5. Backend syncs user to Neon PostgreSQL (creates if not exists)
6. Backend returns user with `onboardingCompleted` status


---

## 5. User & Onboarding

### 5.1 Get Current User

```typescript
// GET /users/me
const { data: user } = await api.get<User>('/users/me');

// Response
interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  authProvider: 'google' | 'email' | null;
  onboardingCompleted: boolean;
  startup: StartupSummary | null;
  createdAt: string;
  updatedAt: string;
}

interface StartupSummary {
  id: string;
  companyName: string;
  industry: string;
  stage: string;
  fundingStage: string | null;
}
```

### 5.2 Check Onboarding Status

```typescript
// GET /users/me/onboarding-status
const { data } = await api.get<{ completed: boolean; hasStartup: boolean }>(
  '/users/me/onboarding-status'
);
```

### 5.3 Complete Onboarding

```typescript
// POST /users/me/onboarding
const { data: user } = await api.post<User>('/users/me/onboarding', {
  // Founder Info (required)
  founderName: 'John Doe',
  founderRole: 'ceo', // ceo|cto|coo|cfo|cpo|founder|cofounder

  // Company Basics (required)
  companyName: 'Acme Inc',
  description: 'We help e-commerce businesses...', // min 20 chars
  tagline: 'AI-powered analytics', // optional
  website: 'https://acme.com', // optional

  // Business Classification (required)
  industry: 'saas', // saas|fintech|healthtech|edtech|ecommerce|ai_ml|...
  businessModel: 'b2b', // b2b|b2c|b2b2c|marketplace|d2c|enterprise|...
  revenueModel: 'subscription', // optional: subscription|freemium|usage_based|...

  // Company Stage (required)
  stage: 'mvp', // idea|prototype|mvp|beta|launched|growth|scale
  foundedYear: 2024,
  launchDate: '2024-06-01', // optional, ISO date

  // Team (required)
  teamSize: '1-5', // 1-5|6-20|21-50|51-200|200+
  cofounderCount: 2,

  // Location (required)
  country: 'United States',
  city: 'San Francisco', // optional
  operatingRegions: 'North America, Europe', // optional

  // Financials
  fundingStage: 'seed', // optional: bootstrapped|pre_seed|seed|series_a|...
  totalRaised: 500000, // optional, USD
  monthlyRevenue: 10000, // optional, USD
  isRevenue: 'yes', // yes|no|pre_revenue (required)

  // Target Market (all optional)
  targetCustomer: 'Mid-market e-commerce companies',
  problemSolved: 'E-commerce businesses struggle to...',
  competitiveAdvantage: 'Proprietary AI model...',
});
```

### 5.4 Update Startup (Post-Onboarding)

```typescript
// PATCH /users/me/startup
const { data: user } = await api.patch<User>('/users/me/startup', {
  monthlyRevenue: 25000,
  teamSize: '6-20',
  stage: 'growth',
});
```

### 5.5 Update Profile

```typescript
// PATCH /users/me
const { data: user } = await api.patch<User>('/users/me', {
  name: 'John Smith',
});
```


---

## 6. Sessions & Messages

Sessions track chat conversations with agents.

### 6.1 Create Session

```typescript
// POST /sessions
const { data: session } = await api.post<Session>('/sessions', {
  startupId: 'uuid-of-startup',
  metadata: { source: 'web' },
});
```

### 6.2 List Sessions

```typescript
// GET /sessions
const { data: sessions } = await api.get<Session[]>('/sessions');
```

### 6.3 Get Session with Messages

```typescript
// GET /sessions/:id/history
const { data } = await api.get<{ session: Session; messages: Message[] }>(
  `/sessions/${sessionId}/history`
);
```

### 6.4 Add Message

```typescript
// POST /sessions/:id/messages
const { data: message } = await api.post<Message>(`/sessions/${sessionId}/messages`, {
  role: 'user', // user|assistant|system
  content: 'What are the legal requirements for my startup?',
  agent: 'legal', // optional: legal|finance|investor|competitor
  metadata: {}, // optional
});
```

### 6.5 Get Messages

```typescript
// GET /sessions/:id/messages?limit=50
const { data: messages } = await api.get<Message[]>(`/sessions/${sessionId}/messages?limit=50`);
```

### 6.6 End Session

```typescript
// POST /sessions/:id/end
await api.post(`/sessions/${sessionId}/end`);
```

### 6.7 Track Activity

```typescript
// POST /sessions/:id/activity
await api.post(`/sessions/${sessionId}/activity`, { action: 'typing' });

// GET /sessions/:id/activity
const { data } = await api.get<{ action: string; timestamp: string } | null>(
  `/sessions/${sessionId}/activity`
);
```


---

## 7. Agent Execution

Four specialized AI agents with mandatory LLM council cross-critique.

| Agent | Purpose |
|-------|---------|
| `legal` | Legal structure, compliance, contracts |
| `finance` | Financial modeling, metrics, projections |
| `investor` | Investor search, pitch feedback, fundraising |
| `competitor` | Market analysis, competitive landscape |

### 7.1 Synchronous Execution

```typescript
// POST /agents/run
const { data: results } = await api.post<AgentPhaseResult[]>('/agents/run', {
  agentType: 'legal',
  prompt: 'What legal structure should I use for my SaaS startup?',
  sessionId: 'session-uuid',
  startupId: 'startup-uuid',
  documents: [], // optional document paths for RAG context
});

// Response: Array of phase results (draft → critique → final)
interface AgentPhaseResult {
  phase: 'draft' | 'critique' | 'final';
  output: {
    content: string;
    confidence: number;
    sources: string[];
    metadata: Record<string, unknown>;
  };
  timestamp: string;
}
```

### 7.2 Async Execution (Recommended for Long Tasks)

```typescript
// POST /agents/queue
const { data } = await api.post<{ taskId: string; jobId: string }>('/agents/queue', {
  agentType: 'investor',
  prompt: 'Find investors for my fintech startup',
  sessionId: 'session-uuid',
  startupId: 'startup-uuid',
  documents: [],
});

const { taskId } = data;
```

### 7.3 Poll Task Status

```typescript
// GET /agents/tasks/:taskId
const { data: status } = await api.get<TaskStatus>(`/agents/tasks/${taskId}`);

interface TaskStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'unknown';
  progress: number;
  result?: {
    success: boolean;
    results: AgentPhaseResult[];
    error: string;
    completedAt: string;
  };
  error?: string;
}
```

### 7.4 SSE Streaming (Real-time Updates)

```typescript
// GET /agents/stream/:taskId (Server-Sent Events)
function streamAgentTask(taskId: string, callbacks: {
  onStatus: (status: TaskStatus) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}) {
  const eventSource = new EventSource(`${API_URL}/agents/stream/${taskId}`);

  eventSource.addEventListener('connected', (e) => {
    console.log('Connected:', JSON.parse(e.data));
  });

  eventSource.addEventListener('status', (e) => {
    callbacks.onStatus(JSON.parse(e.data));
  });

  eventSource.addEventListener('done', (e) => {
    const { status } = JSON.parse(e.data);
    if (status === 'failed') callbacks.onError('Task failed');
    else callbacks.onComplete();
    eventSource.close();
  });

  eventSource.onerror = () => {
    callbacks.onError('Connection lost');
    eventSource.close();
  };

  return () => eventSource.close();
}
```

### 7.5 Cancel Task

```typescript
// DELETE /agents/tasks/:taskId
await api.delete(`/agents/tasks/${taskId}`);
```


---

## 8. Webhooks

Receive HTTP callbacks when events occur.

### 8.1 Create Webhook

```typescript
// POST /webhooks
const { data: webhook } = await api.post<Webhook>('/webhooks', {
  name: 'My Webhook',
  url: 'https://example.com/webhook',
  events: ['session.created', 'agent.completed'],
});

// Available events:
// session.created, session.ended, session.expired
// user.created, user.updated, user.deleted
// startup.created, startup.updated, startup.deleted
// agent.started, agent.completed, agent.failed
// * (all events)
```

### 8.2 List Webhooks

```typescript
// GET /webhooks
const { data: webhooks } = await api.get<Webhook[]>('/webhooks');
```

### 8.3 Update Webhook

```typescript
// PATCH /webhooks/:id
const { data: webhook } = await api.patch<Webhook>(`/webhooks/${id}`, {
  events: ['agent.completed', 'agent.failed'],
  isActive: true,
});
```

### 8.4 Delete Webhook

```typescript
// DELETE /webhooks/:id
await api.delete(`/webhooks/${id}`);
```

### 8.5 Regenerate Secret

```typescript
// POST /webhooks/:id/regenerate-secret
const { data } = await api.post<{ secret: string }>(`/webhooks/${id}/regenerate-secret`);
```

### 8.6 Webhook Payload

```typescript
// Your endpoint receives:
interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Verify signature with X-Webhook-Signature header
```


---

## 9. Notion Integration

Export agent outputs to Notion pages. Uses internal integration (no OAuth).

### 9.1 Check Integration Status

```typescript
// GET /notion/status
const { data } = await api.get<NotionStatus>('/notion/status');

interface NotionStatus {
  connected: boolean;
  workspaceName: string | null;
  workspaceIcon: string | null;
  defaultPageId: string | null;
}
```

### 9.2 Search Pages

```typescript
// GET /notion/pages?query=startup
const { data: pages } = await api.get<NotionPage[]>('/notion/pages?query=startup');

interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
}
```

### 9.3 Export to Notion

```typescript
// POST /notion/export
const { data } = await api.post<NotionExportResult>('/notion/export', {
  pageId: 'notion-page-id', // optional, uses default if not provided
  title: 'Legal Analysis - Acme Inc',
  agentType: 'legal',
  content: 'The analysis content...',
  sources: ['https://source1.com', 'https://source2.com'],
  metadata: { confidence: 0.85 },
});

interface NotionExportResult {
  pageId: string;
  pageUrl: string;
  title: string;
  exportedAt: string;
}
```

---

## 10. API Keys

Create API keys for programmatic access.

### 10.1 Create API Key

```typescript
// POST /api-keys
const { data } = await api.post<ApiKeyCreated>('/api-keys', {
  name: 'Production API Key',
  scopes: ['agents:read', 'agents:write', 'sessions:read'],
});

// IMPORTANT: Save the key immediately - shown only once!
console.log('API Key:', data.key); // co_xxxxxxxxxxxx

// Available scopes:
// read, write, admin
// agents, agents:read, agents:write
// sessions, sessions:read, sessions:write
// webhooks, webhooks:read, webhooks:write
// users:read, startups:read
// notion, mcp
// * (all permissions)
```

### 10.2 List API Keys

```typescript
// GET /api-keys
const { data: keys } = await api.get<ApiKey[]>('/api-keys');

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string; // e.g., "co_abc..."
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
}
```

### 10.3 Revoke API Key

```typescript
// DELETE /api-keys/:id
await api.delete(`/api-keys/${keyId}`);
```


---

## 11. Admin Features

Requires `role: 'admin'` (set in Supabase user metadata).

### 11.1 Upload PDF for Embedding

```typescript
// POST /admin/embeddings/upload (multipart/form-data)
const formData = new FormData();
formData.append('file', pdfFile); // max 50MB
formData.append('filename', 'legal-guide.pdf');
formData.append('startupId', 'startup-uuid');
formData.append('metadata', JSON.stringify({ category: 'legal' }));

const { data } = await api.upload<{ id: string; status: string; path: string }>(
  '/admin/embeddings/upload',
  formData
);
```

### 11.2 List Embeddings

```typescript
// GET /admin/embeddings?page=1&limit=20&startupId=uuid
const { data } = await api.get<PaginatedResult<Embedding>>('/admin/embeddings?page=1&limit=20');

interface Embedding {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunksCreated: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}
```

### 11.3 Get/Delete Embedding

```typescript
// GET /admin/embeddings/:id
const { data: embedding } = await api.get<Embedding>(`/admin/embeddings/${id}`);

// DELETE /admin/embeddings/:id
await api.delete(`/admin/embeddings/${id}`);
```

### 11.4 User Management (Admin)

```typescript
// POST /users (create user)
const { data: user } = await api.post<User>('/users', {
  email: 'newuser@example.com',
  name: 'New User',
});

// PATCH /users/:id (update user)
await api.patch(`/users/${userId}`, { name: 'Updated Name' });

// DELETE /users/:id (delete user)
await api.delete(`/users/${userId}`);

// GET /users/:id (get user by ID)
const { data: user } = await api.get<User>(`/users/${userId}`);
```

### 11.5 Startup Management (Admin)

```typescript
// GET /startups (list all startups)
const { data: startups } = await api.get<Startup[]>('/startups');

// GET /startups/:id (get startup - own or admin)
const { data: startup } = await api.get<Startup>(`/startups/${startupId}`);

// DELETE /startups/:id (admin only)
await api.delete(`/startups/${startupId}`);
```


---

## 12. Health & Analytics

### 12.1 Health Check (Public)

```typescript
// GET /health
const { data } = await api.get<HealthCheck>('/health');

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    redis: 'healthy' | 'degraded' | 'unhealthy';
    supabase: 'healthy' | 'degraded' | 'unhealthy';
    llm: 'healthy' | 'degraded' | 'unhealthy';
  };
}
```

### 12.2 Dashboard Stats (Admin)

```typescript
// GET /analytics/dashboard
const { data } = await api.get<DashboardStats>('/analytics/dashboard');

interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalStartups: number;
  activeSessions: number;
  eventsToday: number;
  eventsByType: { type: string; count: number }[];
}
```

### 12.3 Event Aggregation (Admin)

```typescript
// GET /analytics/events/aggregation?days=7
const { data } = await api.get<EventAggregation[]>('/analytics/events/aggregation?days=7');

interface EventAggregation {
  date: string;
  count: number;
  type: string;
}
```

---

## 13. MCP Server

Expose agents as MCP tools for Claude Desktop, Cursor, Kiro, etc.

### 13.1 Discover Tools

```typescript
// GET /mcp-server/discover
// Header: X-API-Key: your-master-api-key
const response = await fetch(`${API_URL}/mcp-server/discover`, {
  headers: { 'X-API-Key': MASTER_API_KEY },
});

// Returns available tools:
// legal_analysis, finance_analysis, investor_search, competitor_analysis, multi_agent_query
```

### 13.2 Execute Tool

```typescript
// POST /mcp-server/execute
const result = await fetch(`${API_URL}/mcp-server/execute`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': MASTER_API_KEY,
  },
  body: JSON.stringify({
    tool: 'legal_analysis',
    arguments: {
      prompt: 'What legal structure should I use?',
      companyName: 'Acme Inc',
      industry: 'saas',
      stage: 'mvp',
      country: 'United States',
      additionalContext: 'Planning to raise seed funding', // optional
    },
  }),
});

interface McpToolResult {
  success: boolean;
  result: {
    content: string;
    confidence: number;
    sources: string[];
  } | null;
  error: string | null;
  executionTimeMs: number;
  councilMetadata: {
    modelsUsed: string[];
    critiquesCount: number;
    consensusScore: number;
    synthesized: boolean;
  } | null;
}
```


---

## 14. TypeScript Types

```typescript
// types/api.ts

// === ENUMS ===
type FounderRole = 'ceo' | 'cto' | 'coo' | 'cfo' | 'cpo' | 'founder' | 'cofounder';
type Industry = 'saas' | 'fintech' | 'healthtech' | 'edtech' | 'ecommerce' | 'marketplace' | 'ai_ml' | 'artificial_intelligence' | 'cybersecurity' | 'cleantech' | 'biotech' | 'proptech' | 'insurtech' | 'legaltech' | 'hrtech' | 'agritech' | 'logistics' | 'media_entertainment' | 'gaming' | 'food_beverage' | 'travel_hospitality' | 'social' | 'developer_tools' | 'hardware' | 'other';
type BusinessModel = 'b2b' | 'b2c' | 'b2b2c' | 'marketplace' | 'd2c' | 'enterprise' | 'smb' | 'consumer' | 'platform' | 'api' | 'other';
type RevenueModel = 'subscription' | 'transaction_fee' | 'freemium' | 'usage_based' | 'licensing' | 'advertising' | 'commission' | 'one_time' | 'hybrid' | 'not_yet';
type Stage = 'idea' | 'prototype' | 'mvp' | 'beta' | 'launched' | 'growth' | 'scale';
type TeamSize = '1-5' | '6-20' | '21-50' | '51-200' | '200+';
type FundingStage = 'bootstrapped' | 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c_plus' | 'profitable';
type RevenueStatus = 'yes' | 'no' | 'pre_revenue';
type AgentType = 'legal' | 'finance' | 'investor' | 'competitor';
type MessageRole = 'user' | 'assistant' | 'system';

// === USER ===
interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  authProvider: 'google' | 'email' | null;
  onboardingCompleted: boolean;
  startup: StartupSummary | null;
  createdAt: string;
  updatedAt: string;
}

interface StartupSummary {
  id: string;
  companyName: string;
  industry: string;
  stage: string;
  fundingStage: string | null;
}

// === STARTUP (Full) ===
interface Startup {
  id: string;
  founderName: string;
  founderRole: string;
  companyName: string;
  tagline: string | null;
  description: string;
  website: string | null;
  industry: string;
  businessModel: string;
  revenueModel: string | null;
  stage: string;
  foundedYear: number;
  launchDate: string | null;
  teamSize: string;
  cofounderCount: number;
  country: string;
  city: string | null;
  operatingRegions: string | null;
  fundingStage: string | null;
  totalRaised: string | null;
  monthlyRevenue: string | null;
  isRevenue: string;
  targetCustomer: string | null;
  problemSolved: string | null;
  competitiveAdvantage: string | null;
  createdAt: string;
  updatedAt: string;
}

// === SESSION ===
interface Session {
  id: string;
  userId: string;
  startupId: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// === MESSAGE ===
interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  agent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// === AGENT ===
interface AgentOutput {
  content: string;
  confidence: number;
  sources: string[];
  metadata: Record<string, unknown>;
}

interface AgentPhaseResult {
  phase: 'draft' | 'critique' | 'final';
  output: AgentOutput;
  timestamp: string;
}

interface TaskStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' | 'unknown';
  progress: number;
  result?: {
    success: boolean;
    results: AgentPhaseResult[];
    error: string;
    completedAt: string;
  };
  error?: string;
}

// === WEBHOOK ===
interface Webhook {
  id: string;
  userId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// === API KEY ===
interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
}

interface ApiKeyCreated extends ApiKey {
  key: string;
}

// === API RESPONSE ===
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```


---

## 15. Error Handling

### 15.1 API Error Response

```typescript
interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}
```

### 15.2 Common Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request | Check request body/params |
| 401 | Unauthorized | Refresh token or re-login |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 429 | Too Many Requests | Rate limited, wait and retry |
| 500 | Server Error | Contact support |

### 15.3 Error Handler

```typescript
// lib/error-handler.ts
import { signOut } from './auth';

export async function handleApiError(response: Response) {
  if (response.ok) return;
  
  const error = await response.json();
  
  switch (response.status) {
    case 401:
      await signOut();
      window.location.href = '/login';
      break;
    case 403:
      throw new Error('You do not have permission');
    case 404:
      throw new Error('Resource not found');
    case 429:
      throw new Error('Too many requests. Please wait.');
    default:
      throw new Error(error.message || 'An error occurred');
  }
}
```

---

## Quick Start Checklist

- [ ] Set up Supabase project (Auth only)
- [ ] Enable Google OAuth in Supabase
- [ ] Configure environment variables
- [ ] Implement auth flow (login, signup, callback)
- [ ] Create protected route wrapper
- [ ] Build onboarding form
- [ ] Implement session management
- [ ] Build chat interface with agent selection
- [ ] Add SSE streaming for real-time updates
- [ ] Implement webhooks (optional)
- [ ] Build admin panel (if admin user)

---

## API Base URLs

- Development: `http://localhost:3000/api/v1`
- Production: `https://your-domain.com/api/v1`
- Swagger Docs: `http://localhost:3000/docs`
