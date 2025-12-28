# Co-Op RAG Service

<p>
  <img src="https://img.shields.io/badge/FastAPI-Latest-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Upstash_Vector-Latest-00e9a3" alt="Upstash">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?logo=docker" alt="Docker">
</p>

Python vector search service with lazy vectorization, jurisdiction-aware filtering, and TTL management.

> **Note**: This service returns **context only** - the backend's LLM Council handles all answer generation.

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Start server
uvicorn app.main:app --reload --port 8000
```

API: `http://localhost:8000`
Docs: `http://localhost:8000/docs`

## Architecture

```
UPLOAD (Admin via Backend):
PDF → Backend → Supabase Storage → Register with RAG (status: pending)
                                   + region, jurisdictions, document_type

QUERY (User via Backend):
Question → RAG → Filter by domain/sector/region/jurisdiction
              → Lazy vectorize pending files
              → Search → Return context
                              ↓
               Backend LLM Council generates answer

CLEANUP (Cron):
Files not accessed in 30 days → Remove vectors → Status: expired
(PDFs remain in Supabase for re-vectorization)
```

## Key Features

| Feature | Description |
|---------|-------------|
| Vector Search Only | Returns context, NOT answers |
| Jurisdiction Filtering | Region + regulatory framework filtering |
| Lazy Vectorization | Vectors created on-demand |
| TTL Management | Vectors expire after 30 days |
| Persistent Storage | PDFs stored in Supabase |
| Gemini Embeddings | text-embedding-004 (768 dim) |
| Optional Compression | HuggingFace Inference API (no local models) |

## Jurisdiction Filtering

The RAG system supports granular filtering by geographic region and regulatory framework:

### Regions

| Region | Description |
|--------|-------------|
| `global` | Applies everywhere (default) |
| `eu` | European Union (GDPR, EU regulations) |
| `us` | United States (SEC, FTC, state laws) |
| `uk` | United Kingdom (post-Brexit) |
| `india` | India (SEBI, RBI, IT Act) |
| `apac` | Asia-Pacific (Singapore, Australia, Japan) |
| `latam` | Latin America (Brazil LGPD, Mexico) |
| `mena` | Middle East & North Africa |
| `canada` | Canada (PIPEDA, provincial laws) |

### Jurisdictions

| Category | Jurisdictions |
|----------|---------------|
| Privacy | `gdpr`, `ccpa`, `lgpd`, `pipeda`, `pdpa`, `dpdp` |
| Financial | `sec`, `finra`, `fca`, `sebi`, `mas`, `esma` |
| Compliance | `hipaa`, `pci_dss`, `sox`, `aml_kyc` |
| IP | `dmca`, `patent`, `trademark`, `copyright` |
| Employment | `employment`, `labor` |
| Corporate | `corporate`, `tax`, `contracts` |

### Document Types

| Type | Description |
|------|-------------|
| `regulation` | Official regulatory text |
| `guidance` | Regulatory guidance documents |
| `case_law` | Court decisions, precedents |
| `template` | Contract/document templates |
| `guide` | How-to guides, best practices |
| `checklist` | Compliance checklists |
| `analysis` | Legal/financial analysis |
| `faq` | Frequently asked questions |

## Environment Variables

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Upstash Vector
UPSTASH_VECTOR_REST_URL="https://xxx.upstash.io"
UPSTASH_VECTOR_REST_TOKEN="xxx"

# Google AI (embeddings)
GOOGLE_AI_API_KEY="AI..."

# Supabase Storage
SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."
SUPABASE_STORAGE_BUCKET="documents"

# API Authentication
RAG_API_KEY="your-secure-api-key"

# Optional: Context Compression (HuggingFace Inference API)
# No local model download required - uses cloud API
COMPRESSION_ENABLED="false"
COMPRESSION_PROVIDER="huggingface"
COMPRESSION_MODEL="mistralai/Mistral-7B-Instruct-v0.2"
HUGGINGFACE_API_KEY="hf_..."
```

## API Endpoints

All endpoints require `X-API-Key` header (except `/health`).

### Health Check

```bash
GET /health
```

### Register File

```bash
POST /rag/register
{
  "file_id": "uuid",
  "filename": "gdpr-guide.pdf",
  "storage_path": "legal/fintech/eu/uuid/gdpr-guide.pdf",
  "domain": "legal",
  "sector": "fintech",
  "region": "eu",
  "jurisdictions": ["gdpr"],
  "document_type": "guide"
}
```

### Query RAG

```bash
POST /rag/query
{
  "query": "What are the GDPR compliance requirements?",
  "domain": "legal",
  "sector": "fintech",
  "region": "eu",
  "jurisdictions": ["gdpr"],
  "limit": 5
}
```

Response:
```json
{
  "context": "[Source: gdpr-guide.pdf | Region: eu | Jurisdictions: gdpr]\nThe requirements include...",
  "sources": [
    {
      "file_id": "uuid",
      "filename": "gdpr-guide.pdf",
      "score": 0.85,
      "region": "eu",
      "jurisdictions": ["gdpr"],
      "document_type": "guide"
    }
  ],
  "region": "eu",
  "jurisdictions": ["gdpr"],
  "chunks_found": 2
}
```

### Force Vectorize

```bash
POST /rag/vectorize/{file_id}
```

### List Files

```bash
GET /rag/files
GET /rag/files?domain=legal&sector=fintech&region=eu
```

### Delete File

```bash
DELETE /rag/files/{file_id}
```

### Cleanup Expired

```bash
POST /rag/cleanup?days=30
```

## Domains & Sectors

| Domain | Used By |
|--------|---------|
| `legal` | Legal Agent |
| `finance` | Finance Agent |

| Sector | Description |
|--------|-------------|
| `fintech` | Financial technology |
| `greentech` | Clean technology |
| `healthtech` | Healthcare technology |
| `saas` | Software as a Service |
| `ecommerce` | E-commerce |

## Deployment

### Koyeb (Recommended)

1. Create Koyeb account
2. Connect repository
3. Set Dockerfile path: `RAG/Dockerfile`
4. Add environment variables
5. Configure port: 8000
6. Deploy

### Docker

```bash
docker build -t co-op-rag .
docker run -p 8000:8000 \
  -e DATABASE_URL="..." \
  -e UPSTASH_VECTOR_REST_URL="..." \
  co-op-rag
```

## Project Structure

```
RAG/
├── app/
│   ├── main.py           # FastAPI application
│   ├── database.py       # PostgreSQL client
│   ├── schemas.py        # Pydantic models
│   └── services.py       # RAG logic
├── Dockerfile
├── requirements.txt
└── README.md
```

## Integration

### Backend Configuration

```bash
RAG_SERVICE_URL=https://your-rag.koyeb.app
RAG_API_KEY=your-secure-key
```

### Flow

1. Admin uploads PDF via Frontend with jurisdiction metadata
2. Backend stores in Supabase, calls `/rag/register`
3. User queries agent (country auto-mapped to region)
4. Backend calls `/rag/query` with region/jurisdiction filters
5. RAG lazy-vectorizes if needed, returns filtered context
6. Backend LLM Council generates jurisdiction-aware answer

### Country to Region Mapping

The backend automatically maps user's country to the appropriate region:
- Germany, France, Italy → `eu`
- United States → `us`
- India → `india`
- Singapore, Japan → `apac`
- Brazil, Mexico → `latam`
- UAE, Saudi Arabia → `mena`
- Unknown → `global`

## Recent Fixes (v1.3.7)

### User Document Chunks Fix
- Fixed `get_user_document_chunks` function
- Upstash Vector SDK `fetch()` returns a list, not a dict
- Changed iteration from `.items()` to direct list iteration
- Added `hasattr()` checks for safe attribute access

## Why No LLM?

| Reason | Benefit |
|--------|---------|
| Single Source of Truth | Backend handles ALL generation |
| Cross-Critique | Multiple models validate responses |
| Simpler Architecture | RAG focuses on retrieval only |
| Cost Efficiency | One LLM layer instead of two |

## License

MIT License - see [LICENSE](../LICENSE) for details.
