<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/NestJS-11-red?logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs Welcome">
</p>

<h1 align="center">🚀 Co-Op</h1>

<p align="center">
  <strong>AI-Powered Advisory Platform for Startups</strong>
</p>

<p align="center">
  Expert guidance across legal, finance, investor relations, and competitive analysis.<br/>
  Powered by a multi-model LLM Council architecture with mandatory cross-critique.
</p>

<p align="center">
  <a href="https://co-op-dev.vercel.app">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#deployment">Deployment</a> •
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## 🎯 The Problem

Early-stage founders need expert advice across multiple domains but lack resources:

| Challenge | Impact |
|-----------|--------|
| **Expensive consultants** | $300-500/hour for quality advice |
| **Generic AI chatbots** | Lack domain expertise and startup context |
| **Fragmented tools** | Different platforms for legal, finance, investors |
| **Hallucinations** | Single-model AI often provides inaccurate information |

## 💡 The Solution

Co-Op provides an AI advisory board that understands your startup's context and validates every response through multi-model consensus:

| Agent | Expertise | Data Source |
|-------|-----------|-------------|
| **⚖️ Legal** | Corporate structure, IP, compliance, contracts | RAG (document search) |
| **💰 Finance** | Financial modeling, metrics, runway, valuation | RAG (document search) |
| **🤝 Investor** | VC matching, pitch optimization, fundraising | Web Research (live) |
| **🎯 Competitor** | Market landscape, positioning, intelligence | Web Research (live) |

---

## ✨ Features

### 🧠 LLM Council Architecture

Multiple AI models collaborate and **mandatorily critique** each other's responses:

```
User Question
     │
     ▼
┌─────────────────────────────────────────────────────┐
│              PHASE 1: GENERATE                      │
│  [Llama 3.3 70B] [Gemini 3 Pro] [GPT OSS 120B]     │
│  [DeepSeek R1 32B] [Llama 3 8B]                    │
│         Each model generates a response            │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│         PHASE 2: CROSS-CRITIQUE (MANDATORY)        │
│  Responses shuffled and anonymized                 │
│  Each model scores & critiques other responses     │
│  Identifies errors, inconsistencies, weaknesses    │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│              PHASE 3: SYNTHESIZE                   │
│  Best response selected by consensus score         │
│  Improved with critique feedback                   │
│  Final answer with confidence score                │
└─────────────────────────────────────────────────────┘
```

**Why this matters:**
- ✅ Reduces hallucinations through cross-validation
- ✅ Combines strengths of different model architectures
- ✅ Provides confidence scores based on consensus
- ✅ Catches errors that single models miss

### 🔬 Real-Time Web Research

Investor and competitor agents use **Google Gemini with Search Grounding** for live web data:

```
Investor Query: "Find seed VCs for AI startups in SF"
                          │
                          ▼
              ┌───────────────────────┐
              │  Gemini Search        │
              │  Grounding (Primary)  │
              └───────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        Success                  Rate Limited
              │                       │
              ▼                       ▼
        Return Results      ┌─────────────────┐
                            │  ScrapingBee    │
                            │  (Fallback)     │
                            └─────────────────┘
```

### 📚 RAG Knowledge Base

Legal and finance agents search through **sector-specific document collections**:

- **Lazy vectorization** - Documents vectorized on-demand, not at upload
- **TTL management** - Vectors expire after 30 days of no access
- **Sector filtering** - Results filtered by startup's sector (fintech, healthtech, etc.)
- **Persistent storage** - PDFs stored permanently in Supabase for re-vectorization

### 🔌 MCP Server Integration

Expose AI agents as tools for **Claude Desktop**, **Cursor**, **Kiro**, and other MCP clients:

```json
{
  "tools": [
    "legal_analysis",
    "finance_analysis", 
    "investor_search",
    "competitor_analysis",
    "multi_agent_query"
  ]
}
```

### 📡 Developer Platform

- **API Keys** - Scoped access control with usage tracking
- **Webhooks** - Real-time event notifications with HMAC verification
- **Notion Export** - Export agent insights directly to your workspace
- **Prometheus Metrics** - Full observability for production deployments

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                  │
│                    Next.js 14 (Vercel)                              │
│         Dashboard • Chat • Onboarding • Settings                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                   │
│                    NestJS 11 (Render)                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Agent Orchestrator                         │  │
│  │     [Legal] [Finance] [Investor] [Competitor]                 │  │
│  │                         │                                     │  │
│  │                         ▼                                     │  │
│  │                    LLM Council                                │  │
│  │     [Llama 3.3] [Gemini 3] [GPT OSS] [DeepSeek]              │  │
│  │              Mandatory Cross-Critique                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│   RAG Service   │  │  Web Research   │  │      Data Layer         │
│ FastAPI (Koyeb) │  │ Gemini Search   │  │  PostgreSQL (Neon)      │
│ Upstash Vector  │  │ + ScrapingBee   │  │  Redis (Upstash)        │
│ Gemini Embed    │  │   Fallback      │  │  Supabase (Auth+Storage)│
└─────────────────┘  └─────────────────┘  └─────────────────────────┘
```

---

## 📁 Project Structure

```
co-op/
├── Backend/                 # NestJS API server
│   ├── src/
│   │   ├── modules/         # Feature modules (agents, users, sessions, etc.)
│   │   ├── common/          # Shared services (LLM Council, RAG, cache)
│   │   └── database/        # Drizzle ORM schemas
│   ├── Dockerfile
│   └── README.md            # Backend documentation
│
├── Frontend/                # Next.js web application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # UI components (Radix + Tailwind)
│   │   └── lib/             # API client, hooks, stores
│   ├── vercel.json
│   └── README.md            # Frontend documentation
│
├── RAG/                     # Python vector search service
│   ├── app/                 # FastAPI application
│   ├── Dockerfile
│   └── README.md            # RAG documentation
│
├── CONTRIBUTING.md          # Contribution guidelines
└── README.md                # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+ (for RAG service)
- PostgreSQL (Neon recommended)
- Redis (Upstash recommended)
- Supabase project
- At least 2 LLM API keys (for council cross-critique)

### 1. Clone Repository

```bash
git clone https://github.com/Afnanksalal/co-op.git
cd co-op
```

### 2. Backend Setup

```bash
cd Backend
cp .env.example .env
# Edit .env with your credentials (see Backend/README.md)

npm install
npm run db:push    # Push database schema
npm run dev        # Start on http://localhost:3000
```

### 3. Frontend Setup

```bash
cd Frontend
cp .env.example .env.local
# Edit .env.local with your credentials

npm install
npm run dev        # Start on http://localhost:3001
```

### 4. RAG Service (Optional)

```bash
cd RAG
cp .env.example .env
# Edit .env with your credentials

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## ☁️ Deployment

### Production URLs

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [co-op-dev.vercel.app](https://co-op-dev.vercel.app) |
| Backend | Render | `https://co-op-80fi.onrender.com` |
| RAG | Koyeb | `https://apparent-nanice-afnan-3cac971c.koyeb.app` |

### Infrastructure (All Free Tiers Available)

| Component | Provider | Purpose |
|-----------|----------|---------|
| Database | [Neon](https://neon.tech) | PostgreSQL |
| Cache/Queue | [Upstash](https://upstash.com) | Redis + QStash |
| Vectors | [Upstash](https://upstash.com) | Vector search |
| Auth/Storage | [Supabase](https://supabase.com) | Authentication + file storage |
| LLM | [Groq](https://console.groq.com) | Llama 3.3, GPT OSS |
| LLM | [Google AI](https://aistudio.google.com) | Gemini 3 Pro + Search |
| LLM | [HuggingFace](https://huggingface.co) | DeepSeek R1, Llama 3 |

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Afnanksalal/co-op&project-name=co-op&root-directory=Frontend)

---

## 🔑 API Overview

### Authentication

```bash
# User authentication (Supabase JWT)
curl -H "Authorization: Bearer <jwt_token>" \
  https://co-op-80fi.onrender.com/api/v1/users/me

# Service authentication (API Key)
curl -H "X-API-Key: coop_xxxxx" \
  https://co-op-80fi.onrender.com/api/v1/mcp-server/discover
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/me/onboarding` | POST | Complete startup profile |
| `/sessions` | POST | Create advisory session |
| `/agents/run` | POST | Run agent (sync) |
| `/agents/queue` | POST | Queue agent (async) |
| `/mcp-server/discover` | GET | List MCP tools |
| `/mcp-server/execute` | POST | Execute MCP tool |
| `/webhooks` | CRUD | Manage webhooks |
| `/api-keys` | CRUD | Manage API keys |

See [Backend README](./Backend/README.md) for complete API documentation.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - App Router, Server Components
- **TypeScript 5** - Type safety
- **Tailwind CSS 3.4** - Styling
- **Radix UI** - Accessible components
- **Zustand** - State management
- **Framer Motion** - Animations

### Backend
- **NestJS 11** - Modular Node.js framework
- **TypeScript 5** - Type safety
- **Drizzle ORM** - Type-safe SQL
- **Upstash QStash** - Serverless queue

### RAG Service
- **FastAPI** - Python web framework
- **Upstash Vector** - Vector database
- **Gemini Embeddings** - text-embedding-004

### LLM Providers
- **Groq** - Llama 3.3 70B, GPT OSS 120B (fast inference)
- **Google AI** - Gemini 3 Pro + Search Grounding
- **HuggingFace** - DeepSeek R1 32B, Llama 3 8B

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/co-op.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m 'feat: add amazing feature'

# Push and create PR
git push origin feature/amazing-feature
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built with ❤️ for founders, by founders
</p>

<p align="center">
  <a href="https://github.com/Afnanksalal/co-op">GitHub</a> •
  <a href="https://github.com/Afnanksalal/co-op/issues">Issues</a> •
  <a href="https://github.com/Afnanksalal/co-op/discussions">Discussions</a>
</p>
