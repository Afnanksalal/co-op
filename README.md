<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/status-production--ready-success.svg" alt="Status">
</p>

# Co-Op

**AI-Powered Advisory Platform for Startups**

Co-Op is an intelligent advisory platform that provides startups with expert guidance across legal, finance, investor relations, and competitive analysis domains. Powered by a multi-model LLM Council architecture, Co-Op delivers high-quality, cross-validated insights that help founders make better decisions faster.

---

## The Problem

Early-stage founders face a critical challenge: they need expert advice across multiple domains (legal, finance, fundraising, market analysis) but lack the resources to hire specialists. The current solutions are:

- **Expensive consultants** — $300-500/hour for quality advice
- **Generic AI chatbots** — Lack domain expertise and context
- **Fragmented tools** — Different platforms for different needs
- **Information overload** — Too much generic content, not enough actionable insights

Founders waste 15-20 hours per week searching for answers, often making costly mistakes due to lack of specialized guidance.

## The Solution

Co-Op provides an AI advisory board that understands your startup's context and delivers expert-level guidance across all critical domains:

| Domain | What It Does |
|--------|--------------|
| **Legal Agent** | Corporate structure, IP protection, compliance, contracts |
| **Finance Agent** | Financial modeling, metrics, runway planning, valuation |
| **Investor Agent** | VC/angel matching, pitch optimization, fundraising strategy |
| **Competitor Agent** | Market landscape, positioning, competitive intelligence |

### Why Co-Op is Different

1. **LLM Council Architecture** — Multiple AI models collaborate and critique each other's responses, ensuring higher accuracy and reducing hallucinations
2. **Context-Aware** — Understands your industry, stage, and specific situation
3. **RAG-Powered Knowledge** — Legal and finance agents access curated document libraries for accurate, up-to-date information
4. **Sector-Specific** — Tailored insights for fintech, healthtech, greentech, SaaS, and e-commerce startups

---

## Target Market

### Primary: Early-Stage Startups
- Pre-seed to Series A companies
- 1-50 employees
- Need guidance but can't afford full-time specialists

### Sectors Supported
- **Fintech** — Regulatory compliance, financial modeling
- **Healthtech** — HIPAA, FDA pathways, healthcare regulations
- **Greentech** — Sustainability metrics, green financing
- **SaaS** — Unit economics, growth metrics, pricing
- **E-commerce** — Marketplace dynamics, logistics, payments

### Market Size
- 150M+ startups globally
- $4.5B spent annually on startup advisory services
- 72% of founders cite "lack of expertise" as top challenge

---

## Core Features

### 🤖 AI Agents

Four specialized domain experts that understand startup context:

| Agent | Expertise | Data Source |
|-------|-----------|-------------|
| **Legal Agent** | Corporate structure, IP, compliance, contracts, terms of service | RAG (curated legal docs) |
| **Finance Agent** | Financial modeling, unit economics, runway, valuation, cap tables | RAG (finance templates) |
| **Investor Agent** | VC/angel matching, pitch decks, fundraising strategy, term sheets | Web research (real-time) |
| **Competitor Agent** | Market landscape, positioning, feature comparison, SWOT analysis | Web research (real-time) |

Each agent follows a three-phase process:
1. **Draft** — Generate initial response using domain knowledge
2. **Critique** — Self-review for accuracy and completeness
3. **Final** — Refined response with confidence score and sources

### 🧠 LLM Council

Unlike single-model AI, Co-Op uses a council of multiple LLMs that collaborate and critique each other:

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Council Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Question → [Llama 3.3] ──┐                                   │
│             [GPT OSS]   ───┼──→ Shuffle → Cross-Critique       │
│             [Gemini 3]  ───┤         ↓                         │
│             [DeepSeek]  ───┘    Score & Rank                   │
│                                     ↓                          │
│                              Synthesize Best                    │
│                                     ↓                          │
│                              Final Response                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this matters:**
- Reduces hallucinations through cross-validation
- Combines strengths of different model architectures
- Provides confidence scores based on consensus
- Automatic failover if a model is unavailable

### 🔗 A2A (Agent-to-Agent) Protocol

When you ask a complex question, multiple agents collaborate:

```
User: "I'm building a fintech app. What do I need to know?"

┌─────────────────────────────────────────────────────────────────┐
│                    A2A Multi-Agent Query                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Legal Agent]     → Regulatory requirements, licenses        │
│   [Finance Agent]   → Unit economics, compliance costs         │
│   [Investor Agent]  → Fintech-focused VCs, check sizes         │
│   [Competitor Agent]→ Market landscape, differentiation        │
│                                                                 │
│         ↓ All responses shuffled (anonymized) ↓                │
│                                                                 │
│   Each agent critiques other agents' responses                 │
│   Scores aggregated → Best insights synthesized                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**A2A ensures:**
- Comprehensive answers covering all angles
- Cross-domain validation (legal checks finance, etc.)
- No single point of failure
- Richer, more nuanced responses

### 🔌 MCP Server (Model Context Protocol)

Co-Op exposes an MCP server for IDE and tool integration:

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

**Use cases:**
- Query Co-Op directly from VS Code, Cursor, or any MCP-compatible IDE
- Build custom workflows with AI agent capabilities
- Integrate startup advisory into your development process

**Example MCP call:**
```json
{
  "tool": "legal_analysis",
  "arguments": {
    "prompt": "What licenses do I need for a payment app?",
    "companyName": "PayFlow",
    "industry": "fintech",
    "sector": "fintech",
    "stage": "seed",
    "country": "United States"
  }
}
```

### 📡 Webhooks

Real-time event notifications for building integrations:

| Event | Trigger |
|-------|---------|
| `session.created` | New advisory session started |
| `session.ended` | Session completed |
| `agent.started` | Agent begins processing |
| `agent.completed` | Agent response ready |
| `agent.failed` | Agent encountered error |
| `user.created` | New user registered |
| `startup.created` | Startup profile created |
| `*` | Subscribe to all events |

**Webhook payload:**
```json
{
  "event": "agent.completed",
  "timestamp": "2024-12-13T10:30:00Z",
  "data": {
    "taskId": "abc-123",
    "agentType": "legal",
    "sessionId": "session-456",
    "confidence": 0.87
  }
}
```

**Security:**
- HMAC-SHA256 signature verification
- Automatic retries with exponential backoff
- HTTPS required in production

### 🔑 API Keys

Scoped access control for programmatic use:

| Scope | Access |
|-------|--------|
| `agents:read` | View agent responses |
| `agents:write` | Run agent queries |
| `sessions:read` | View session history |
| `sessions:write` | Create/manage sessions |
| `webhooks:read` | View webhook configs |
| `webhooks:write` | Manage webhooks |
| `mcp` | MCP server access |
| `*` | Full access |

**Create an API key:**
```bash
curl -X POST https://co-op-80fi.onrender.com/api/v1/api-keys \
  -H "Authorization: Bearer <jwt>" \
  -d '{"name": "Production", "scopes": ["agents:write", "sessions:read"]}'
```

### 📚 RAG Knowledge Base

Lazy-loading document retrieval for legal and finance agents:

**How it works:**
1. Admin uploads PDFs to Supabase Storage
2. Files registered with domain (legal/finance) and sector
3. On first query, documents are vectorized on-demand
4. Vectors stored in Upstash with 30-day TTL
5. Unused vectors automatically cleaned up

**Supported sectors:**
- Fintech
- Greentech  
- Healthtech
- SaaS
- E-commerce

**Admin upload:**
```bash
curl -X POST https://co-op-80fi.onrender.com/api/v1/admin/embeddings/upload \
  -H "Authorization: Bearer <admin_jwt>" \
  -F "file=@contract-template.pdf" \
  -F "domain=legal" \
  -F "sector=fintech"
```

### 📝 Notion Integration

Export agent insights directly to your Notion workspace:

```bash
curl -X POST https://co-op-80fi.onrender.com/api/v1/notion/export \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "title": "Legal Structure Analysis",
    "agentType": "legal",
    "content": "Based on your fintech startup...",
    "sources": ["Delaware Corp Guide", "SEC Regulations"],
    "metadata": {"confidence": 0.92}
  }'
```

### ⚡ Real-Time Streaming

SSE (Server-Sent Events) for immediate feedback:

```javascript
const eventSource = new EventSource(
  `https://co-op-80fi.onrender.com/api/v1/agents/stream/${taskId}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.status, data.progress);
};
```

Events: `connected` → `status` (progress updates) → `done`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENTS                                     │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   Web App       │   Mobile App    │   IDE Plugin    │   API Consumers       │
│   (Next.js)     │   (React Native)│   (MCP Client)  │   (REST/Webhooks)     │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────┬───────────┘
         │                 │                 │                     │
         └─────────────────┴─────────────────┴─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                         (Supabase Auth + Guards)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICE                                    │
│                        (NestJS on Render)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Agent Orchestrator                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │   │
│  │  │  Legal   │ │ Finance  │ │ Investor │ │Competitor│               │   │
│  │  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │               │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘               │   │
│  │       │            │            │            │                      │   │
│  │       └────────────┴─────┬──────┴────────────┘                      │   │
│  │                          ▼                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    LLM Council                               │   │   │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │   │
│  │  │  │ Llama   │  │ GPT OSS │  │ Gemini  │  │DeepSeek │        │   │   │
│  │  │  │ 3.3 70B │  │  120B   │  │ 3 Pro   │  │ R1 32B  │        │   │   │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │   │
│  │  │         Draft → Critique → Synthesize → Final               │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────────┐                    ┌─────────────────────────────────┐
│    RAG Service      │                    │         Data Layer              │
│  (FastAPI on Koyeb) │                    │                                 │
│  ┌───────────────┐  │                    │  ┌───────────┐ ┌─────────────┐ │
│  │ Lazy Vectors  │  │                    │  │PostgreSQL │ │   Redis     │ │
│  │ (Upstash)     │  │                    │  │  (Neon)   │ │  (Upstash)  │ │
│  └───────────────┘  │                    │  └───────────┘ └─────────────┘ │
│  ┌───────────────┐  │                    │  ┌───────────┐ ┌─────────────┐ │
│  │ PDF Storage   │  │                    │  │ Supabase  │ │  Supabase   │ │
│  │ (Supabase)    │  │                    │  │   Auth    │ │   Storage   │ │
│  └───────────────┘  │                    │  └───────────┘ └─────────────┘ │
└─────────────────────┘                    └─────────────────────────────────┘
```

---

## How It Works

### 1. Onboarding
Founders complete a comprehensive profile capturing company details, industry, stage, and goals. This context powers personalized responses.

### 2. Ask a Question
```
"What legal structure should I use for my fintech startup 
 that plans to raise a seed round?"
```

### 3. Multi-Model Processing
The LLM Council processes your question:
1. **Draft Phase** — Multiple models generate initial responses
2. **Critique Phase** — Models anonymously review each other's work
3. **Synthesis Phase** — Best insights are combined into a final response

### 4. RAG Enhancement (Legal/Finance)
For legal and finance queries, the system retrieves relevant documents from the knowledge base, ensuring accurate and up-to-date information.

### 5. Actionable Response
You receive expert-level guidance with:
- Clear recommendations
- Source citations
- Confidence scores
- Follow-up suggestions

---

## Project Structure

```
co-op/
├── backend/          # NestJS API server
│   ├── src/
│   │   ├── modules/  # Feature modules (agents, users, sessions, etc.)
│   │   ├── common/   # Shared services (LLM, RAG, cache, etc.)
│   │   └── database/ # Drizzle ORM schemas
│   └── README.md     # Backend technical documentation
│
├── frontend/         # Web application (Coming Soon)
│   └── README.md     # Frontend documentation
│
├── RAG/              # Document retrieval service
│   ├── app/          # FastAPI application
│   └── README.md     # RAG technical documentation
│
└── README.md         # This file
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (or Neon account)
- Redis (or Upstash account)
- Supabase project

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/co-op.git
cd co-op
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run db:push
npm run dev
```

### 3. RAG Service Setup
```bash
cd RAG
cp .env.example .env
# Edit .env with your credentials
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. Access the Platform
- **Backend API**: http://localhost:3000/api/v1
- **API Docs**: http://localhost:3000/docs
- **RAG Service**: http://localhost:8000
- **RAG Docs**: http://localhost:8000/docs

---

## Deployment

### Production URLs
| Service | Platform | URL |
|---------|----------|-----|
| Backend | Render | `https://co-op-80fi.onrender.com` |
| RAG | Koyeb | `https://apparent-nanice-afnan-3cac971c.koyeb.app` |
| Frontend | Vercel | Coming Soon |

### Infrastructure
| Component | Provider | Purpose |
|-----------|----------|---------|
| Database | Neon | PostgreSQL with serverless scaling |
| Cache | Upstash | Redis for sessions and rate limiting |
| Vectors | Upstash | Vector database for RAG |
| Auth | Supabase | Authentication and user management |
| Storage | Supabase | PDF document storage |
| Backend | Render | NestJS API hosting |
| RAG | Koyeb | FastAPI service hosting |

---

## API Overview

### Authentication
All endpoints require authentication via Supabase JWT or API key.

```bash
# Using Bearer token
curl -H "Authorization: Bearer <supabase_jwt>" \
  https://co-op-80fi.onrender.com/api/v1/users/me

# Using API key
curl -H "X-API-Key: <your_api_key>" \
  https://co-op-80fi.onrender.com/api/v1/agents/run
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/onboarding` | POST | Complete startup profile |
| `/sessions` | POST | Create advisory session |
| `/agents/run` | POST | Run single agent query |
| `/agents/stream/{taskId}` | GET | Stream agent response (SSE) |
| `/mcp-server/tools/call` | POST | MCP tool execution |

See [Backend README](./backend/README.md) for complete API documentation.

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| NestJS 11 | API framework |
| TypeScript | Type safety |
| Drizzle ORM | Database access |
| BullMQ | Job queue |

### RAG Service
| Technology | Purpose |
|------------|---------|
| FastAPI | API framework |
| Upstash Vector | Vector storage |
| Gemini Embeddings | Text embeddings |
| LangChain | Text splitting |

### LLM Providers
| Provider | Models |
|----------|--------|
| Groq | Llama 3.3 70B, GPT OSS 120B |
| Google AI | Gemini 3 Pro |
| HuggingFace | DeepSeek R1 32B, Llama 3 8B |

---

## Roadmap

### Current Release ✅
- [x] Multi-agent architecture with LLM Council
- [x] RAG with lazy vectorization and PDF uploads
- [x] Web application (Next.js + React Native)
- [x] MCP server for IDE integration
- [x] A2A (Agent-to-Agent) cross-critique
- [x] Notion export integration
- [x] Custom knowledge base (admin PDF uploads)
- [x] Webhooks and API keys

### Next: Idea Validation Mode
Transform raw ideas into validated startup concepts:
- Idea feasibility analysis using multi-agent consensus
- Market size estimation and TAM/SAM/SOM breakdown
- Legal requirements checklist by jurisdiction
- Minimum viable finance model generation
- Competitor landscape mapping
- Go-to-market strategy suggestions

### Future: Integration Hub
- Slack and Discord bots
- VS Code and JetBrains extensions
- Zapier and Make integrations
- CRM connectors (HubSpot, Salesforce)
- Accounting integrations (QuickBooks, Xero)

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](./backend/CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Conventional commits
- 80%+ test coverage for new features

---

## Security

Security is a top priority. Please see our [Security Policy](./backend/SECURITY.md) for:
- Vulnerability reporting
- Security best practices
- Compliance information

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Co-Op

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Support

- **Documentation**: [Backend](./backend/README.md) | [RAG](./RAG/README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/co-op/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/co-op/discussions)

---

## Acknowledgments

- [NestJS](https://nestjs.com/) — Backend framework
- [FastAPI](https://fastapi.tiangolo.com/) — RAG service framework
- [Supabase](https://supabase.com/) — Auth and storage
- [Upstash](https://upstash.com/) — Redis and vector database
- [Neon](https://neon.tech/) — Serverless PostgreSQL

---

<p align="center">
  Built with ❤️ for founders, by founders
</p>
