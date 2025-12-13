# Co-Op RAG Service

<p>
  <img src="https://img.shields.io/badge/FastAPI-Latest-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Upstash_Vector-Latest-00e9a3" alt="Upstash">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?logo=docker" alt="Docker">
</p>

Python vector search service with **lazy vectorization**, **domain/sector filtering**, and **TTL management** using Supabase Storage, Upstash Vector, and Neon PostgreSQL.

> **Important**: This service returns **context only** - NO LLM answer generation. The backend's LLM Council handles all answer generation with mandatory cross-critique.

## Table of Contents

- [Architecture](#architecture)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Lazy Vectorization Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UPLOAD (Admin via Backend):                                                │
│  PDF → Backend → Supabase Storage → Register with RAG (status: pending)     │
│                                                                             │
│  QUERY (User via Backend):                                                  │
│  Question → Backend → RAG Service → Check pending files → Lazy vectorize    │
│                                    ↓                                        │
│                    Download from Supabase → Chunk → Embed → Upstash         │
│                                    ↓                                        │
│                    Search vectors (filtered by domain+sector)               │
│                                    ↓                                        │
│                    Return context chunks to Backend                         │
│                                    ↓                                        │
│                    Backend LLM Council generates answer                     │
│                                                                             │
│  CLEANUP (Cron):                                                            │
│  Files not accessed in 30 days → Remove vectors → Status: expired           │
│  (Files remain in Supabase Storage for future re-vectorization)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Vector Search Only** | Returns context chunks, NOT answers (backend handles LLM) |
| **Lazy Vectorization** | Vectors created on-demand when user queries, not at upload |
| **TTL Management** | Vectors expire after 30 days of no access, freeing space |
| **Persistent Storage** | PDFs stored permanently in Supabase Storage |
| **Re-vectorization** | Expired files automatically re-vectorized on next query |
| **Domain/Sector Filtering** | Precise document retrieval based on user's sector |
| **Gemini Embeddings** | Uses text-embedding-004 (768 dimensions) |

### Domains & Sectors

| Domain | Description | Used By |
|--------|-------------|---------|
| `legal` | Contracts, compliance, IP | Legal Agent |
| `finance` | Financial models, reports | Finance Agent |

| Sector | Description |
|--------|-------------|
| `fintech` | Financial technology |
| `greentech` | Clean/green technology |
| `healthtech` | Healthcare technology |
| `saas` | Software as a Service |
| `ecommerce` | E-commerce |

---

## Quick Start

### Prerequisites

1. **Supabase Project**
   - Storage bucket: `documents`
   - Service role key (for server-side access)

2. **Upstash Vector Index**
   - Create at [console.upstash.com](https://console.upstash.com)
   - **Dimensions**: `768` (Gemini text-embedding-004)
   - **Distance Metric**: `Cosine`

3. **Neon Database**
   - PostgreSQL connection string
   - Schema managed by backend (Drizzle ORM)

4. **Google AI API Key**
   - For Gemini embeddings from [aistudio.google.com](https://aistudio.google.com)

### Installation

```bash
cd RAG

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
uvicorn app.main:app --reload --port 8000
```

API available at `http://localhost:8000`
Docs at `http://localhost:8000/docs`

---

## Environment Variables

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Upstash Vector
UPSTASH_VECTOR_REST_URL="https://xxx.upstash.io"
UPSTASH_VECTOR_REST_TOKEN="xxx"

# Google AI (for embeddings)
GOOGLE_AI_API_KEY="AI..."

# Supabase Storage
SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."
SUPABASE_STORAGE_BUCKET="documents"

# API Authentication
RAG_API_KEY="your-secure-api-key"

# CORS (optional)
CORS_ORIGINS="https://co-op-80fi.onrender.com"
```

---

## API Endpoints

All endpoints require `X-API-Key` header (except `/health`).

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "db": "Neon",
  "vector": "Upstash",
  "storage": "Supabase",
  "domains": ["legal", "finance"],
  "sectors": ["fintech", "greentech", "healthtech", "saas", "ecommerce"]
}
```

### Register File

Called by backend after uploading PDF to Supabase Storage.

```bash
POST /rag/register
Content-Type: application/json
X-API-Key: your-api-key

{
  "file_id": "uuid",
  "filename": "contract.pdf",
  "storage_path": "legal/fintech/uuid/contract.pdf",
  "domain": "legal",
  "sector": "fintech",
  "content_type": "application/pdf"
}
```

Response:
```json
{
  "success": true,
  "file_id": "uuid",
  "message": "File registered for legal/fintech. Vectors will be created on first query."
}
```

### Force Vectorize

Pre-warm vectors for a specific file (admin operation).

```bash
POST /rag/vectorize/{file_id}
X-API-Key: your-api-key
```

Response:
```json
{
  "success": true,
  "file_id": "uuid",
  "chunks_created": 42,
  "message": "Vectorized 42 chunks"
}
```

### Query RAG

Main endpoint - returns context chunks for LLM.

```bash
POST /rag/query
Content-Type: application/json
X-API-Key: your-api-key

{
  "query": "What are the key compliance requirements?",
  "domain": "legal",
  "sector": "fintech",
  "limit": 5
}
```

Response:
```json
{
  "context": "[Source: contract.pdf]\nThe key compliance requirements include...\n\n---\n\n[Source: regulations.pdf]\nAdditional requirements...",
  "sources": [
    {
      "file_id": "uuid",
      "filename": "contract.pdf",
      "score": 0.8542,
      "domain": "legal",
      "sector": "fintech",
      "chunk_index": 3
    }
  ],
  "domain": "legal",
  "sector": "fintech",
  "vectors_loaded": 0,
  "chunks_found": 2
}
```

### List Files

```bash
GET /rag/files
GET /rag/files?domain=legal
GET /rag/files?sector=fintech
GET /rag/files?domain=legal&sector=fintech
```

### Get File

```bash
GET /rag/files/{file_id}
```

### Delete File

```bash
DELETE /rag/files/{file_id}
```

### Cleanup Expired Vectors

Remove vectors for files not accessed in X days (cron job).

```bash
POST /rag/cleanup?days=30
X-API-Key: your-api-key
```

Response:
```json
{
  "success": true,
  "files_cleaned": 5,
  "vectors_removed": 210,
  "message": "Cleaned up 5 files with 210 vectors"
}
```

---

## Deployment

### Koyeb (Recommended)

1. **Create Koyeb Account**: [koyeb.com](https://www.koyeb.com)

2. **Connect Repository**:
   - Go to Koyeb Dashboard → Create App
   - Select "GitHub" and connect your repo
   - **Dockerfile path**: `RAG/Dockerfile`
   - **Working directory**: `RAG`

3. **Configure Environment Variables**:
   ```
   DATABASE_URL=postgresql://...
   UPSTASH_VECTOR_REST_URL=https://...
   UPSTASH_VECTOR_REST_TOKEN=...
   GOOGLE_AI_API_KEY=...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_KEY=...
   SUPABASE_STORAGE_BUCKET=documents
   RAG_API_KEY=your-secure-api-key
   ```

4. **Configure Service**:
   - **Port**: 8000
   - **Health check path**: `/health`
   - **Instance type**: nano (free tier) or small

5. **Deploy**

6. **Update Backend**: Set `RAG_SERVICE_URL` and `RAG_API_KEY` in Render

### Docker (Self-hosted)

```bash
cd RAG

# Build
docker build -t co-op-rag .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e UPSTASH_VECTOR_REST_URL="https://..." \
  -e UPSTASH_VECTOR_REST_TOKEN="..." \
  -e GOOGLE_AI_API_KEY="..." \
  -e SUPABASE_URL="https://..." \
  -e SUPABASE_SERVICE_KEY="..." \
  -e SUPABASE_STORAGE_BUCKET="documents" \
  -e RAG_API_KEY="your-secure-api-key" \
  co-op-rag
```

---

## Integration

### Backend Configuration

In your Render backend `.env`:

```bash
RAG_SERVICE_URL=https://your-rag-service.koyeb.app
RAG_API_KEY=your-secure-api-key
```

### Upload Flow

```
1. Admin uploads PDF via Frontend
2. Backend uploads to Supabase Storage (domain/sector/fileId/filename)
3. Backend calls POST /rag/register with storage path
4. File status: pending (no vectors yet)
```

### Query Flow

```
1. User asks question via Frontend
2. Backend calls POST /rag/query with user's sector
3. RAG checks pending files → Downloads from Supabase → Vectorizes on-demand
4. RAG searches vectors (filtered by domain + sector)
5. RAG updates timestamps (for TTL tracking)
6. RAG returns context chunks
7. Backend injects context into LLM Council prompt
8. LLM Council generates cross-critiqued answer
```

### Cleanup Flow (Daily Cron)

```
1. Cron calls POST /rag/cleanup?days=30
2. RAG finds files not accessed in 30 days
3. RAG removes vectors from Upstash (frees space)
4. File status: expired (will re-vectorize on next query)
5. PDFs remain in Supabase Storage
```

---

## Why No LLM in RAG?

The RAG service intentionally does NOT include LLM answer generation:

| Reason | Benefit |
|--------|---------|
| **Single Source of Truth** | Backend's LLM Council handles ALL answer generation |
| **Cross-Critique** | Multiple models validate each other's responses |
| **No Duplicate Dependencies** | No need for Groq/OpenAI keys in RAG |
| **Simpler Architecture** | RAG focuses on retrieval, backend on generation |
| **Cost Efficiency** | One LLM layer instead of two |

The backend receives context from RAG and uses it to augment the LLM Council prompt, ensuring accurate, cross-validated answers.

---

## RAG vs Web Research

| Agent | Data Source | Service |
|-------|-------------|---------|
| Legal | RAG | This service (document search) |
| Finance | RAG | This service (document search) |
| Investor | Web Research | Backend (Gemini + ScrapingBee) |
| Competitor | Web Research | Backend (Gemini + ScrapingBee) |

RAG is used for legal and finance because these domains require searching through uploaded documents. Investor and competitor agents need real-time web data.

---

## Database Schema

The `rag_files` table is managed by the backend's Drizzle ORM:

```sql
CREATE TABLE rag_files (
    id UUID PRIMARY KEY,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    content_type TEXT DEFAULT 'application/pdf',
    domain TEXT NOT NULL,           -- 'legal' | 'finance'
    sector TEXT NOT NULL,           -- 'fintech' | 'greentech' | etc.
    vector_status TEXT DEFAULT 'pending',  -- 'pending' | 'indexed' | 'expired'
    chunk_count INT DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Troubleshooting

### "No relevant documents found"

- Check documents registered with correct domain/sector
- Verify query domain/sector matches registered documents
- Use `GET /rag/files` to list documents and their `vector_status`

### Vectors not loading

- Check Supabase Storage bucket permissions
- Verify `SUPABASE_SERVICE_KEY` has access to bucket
- Check file exists at `storage_path`

### Embedding errors

- Verify `GOOGLE_AI_API_KEY` is valid
- Check Upstash Vector index has 768 dimensions

### Database errors

- Verify `DATABASE_URL` includes `?sslmode=require` for Neon
- Check Neon dashboard for connection limits
- Schema managed by backend - ensure backend has run migrations

### Authentication errors

- Verify `RAG_API_KEY` matches between RAG service and backend
- Check `X-API-Key` header is being sent

---

## Project Structure

```
RAG/
├── app/
│   ├── main.py           # FastAPI application
│   ├── database.py       # Neon PostgreSQL client
│   ├── services.py       # RAG logic (vectorize, query, cleanup)
│   └── schemas.py        # Pydantic models
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## License

MIT License - see [LICENSE](../LICENSE) for details.
