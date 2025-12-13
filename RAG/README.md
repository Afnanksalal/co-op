# Co-Op RAG Service

Python RAG service with **lazy vectorization**, **domain** (legal/finance) and **sector** filtering using Supabase Storage, Upstash Vector, and Neon PostgreSQL.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Lazy Vectorization Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  UPLOAD (Admin):                                                             │
│  PDF → Backend → Supabase Storage → Register with RAG (status: pending)     │
│                                                                              │
│  QUERY (User):                                                               │
│  Question → RAG Service → Check pending files → Lazy vectorize → Search     │
│                                    ↓                                         │
│                    Download from Supabase → Chunk → Embed → Upstash         │
│                                    ↓                                         │
│                    Search vectors (filtered by domain+sector)                │
│                                    ↓                                         │
│                    Update last_accessed → Generate answer                    │
│                                                                              │
│  CLEANUP (Cron):                                                             │
│  Files not accessed in 30 days → Remove vectors → Status: expired           │
│  (Files remain in Supabase Storage for future re-vectorization)             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Lazy Vectorization**: Vectors created on-demand when user queries, not at upload time
- **TTL Management**: Vectors expire after 30 days of no access, freeing space
- **Persistent Storage**: PDFs stored permanently in Supabase Storage
- **Re-vectorization**: Expired files automatically re-vectorized on next query
- **Domain/Sector Filtering**: Precise document retrieval based on user's sector

## Domains & Sectors

| Domain | Description |
|--------|-------------|
| `legal` | Legal documents, contracts, compliance |
| `finance` | Financial models, reports, projections |

| Sector | Description |
|--------|-------------|
| `fintech` | Financial technology |
| `greentech` | Clean/green technology |
| `healthtech` | Healthcare technology |
| `saas` | Software as a Service |
| `ecommerce` | E-commerce |

## Prerequisites

1. **Supabase Project**
   - Storage bucket: `documents`
   - Service role key (for server-side access)

2. **Upstash Vector Index**
   - Create at [console.upstash.com](https://console.upstash.com)
   - **Dimensions**: `768` (Gemini text-embedding-004)
   - **Distance Metric**: `Cosine`

3. **Neon Database**
   - PostgreSQL connection string from [neon.tech](https://neon.tech)

4. **API Keys**
   - Google AI (Gemini embeddings) from [aistudio.google.com](https://aistudio.google.com)
   - Groq (LLM generation) from [console.groq.com](https://console.groq.com)

## Local Development

```bash
cd RAG
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Register File (called by backend after Supabase upload)
```bash
POST /rag/register
Content-Type: application/json

{
  "file_id": "uuid",
  "filename": "contract.pdf",
  "storage_path": "legal/fintech/uuid/contract.pdf",
  "domain": "legal",
  "sector": "fintech",
  "content_type": "application/pdf"
}
```

### Force Vectorize (admin pre-warming)
```bash
POST /rag/vectorize/{file_id}
```

### Query RAG (lazy vectorizes pending files)
```bash
POST /rag/query
Content-Type: application/json

{
  "query": "What are the key compliance requirements?",
  "domain": "legal",
  "sector": "fintech",
  "limit": 5
}
```

Response includes `vectors_loaded` count showing how many files were lazy-loaded.

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

### Cleanup Expired Vectors (cron job)
```bash
POST /rag/cleanup?days=30
```

---

## Deployment

### Koyeb (Recommended)

1. **Create Koyeb Account**: [koyeb.com](https://www.koyeb.com)

2. **Connect Repository**:
   - Go to Koyeb Dashboard → Create App
   - Select "GitHub" and connect your repo
   - Set the **Dockerfile path**: `RAG/Dockerfile`
   - Set the **Working directory**: `RAG`

3. **Configure Environment Variables**:
   ```
   DATABASE_URL=postgres://...
   UPSTASH_VECTOR_REST_URL=https://...
   UPSTASH_VECTOR_REST_TOKEN=...
   GOOGLE_AI_API_KEY=...
   GROQ_API_KEY=...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_KEY=...
   SUPABASE_STORAGE_BUCKET=documents
   ```

4. **Configure Service**:
   - **Port**: 8000
   - **Health check path**: `/health`
   - **Instance type**: nano (free tier) or small
   - **Region**: Choose closest to your backend

5. **Deploy**: Click "Deploy"

6. **Get URL**: Copy the service URL (e.g., `https://your-app-xxx.koyeb.app`)

7. **Update Backend**: Set `RAG_SERVICE_URL` in your Render backend to the Koyeb URL

### Docker (Self-hosted)

```bash
cd RAG

# Build
docker build -t co-op-rag .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL="postgres://..." \
  -e UPSTASH_VECTOR_REST_URL="https://..." \
  -e UPSTASH_VECTOR_REST_TOKEN="..." \
  -e GOOGLE_AI_API_KEY="..." \
  -e GROQ_API_KEY="..." \
  -e SUPABASE_URL="https://..." \
  -e SUPABASE_SERVICE_KEY="..." \
  -e SUPABASE_STORAGE_BUCKET="documents" \
  co-op-rag
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL URL | Yes |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector REST URL | Yes |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector token | Yes |
| `GOOGLE_AI_API_KEY` | Google AI API key (embeddings) | Yes |
| `GROQ_API_KEY` | Groq API key (LLM) | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name (default: documents) | No |

---

## Integration with Backend

The NestJS backend (on Render) orchestrates the flow:

### Upload Flow
1. **Admin uploads PDF** → Backend uploads to Supabase Storage (`domain/sector/fileId/filename`)
2. **Backend registers file** → Calls `/rag/register` with storage path
3. **File status**: `pending` (no vectors yet)

### Query Flow
1. **User asks question** → Backend calls `/rag/query` with user's sector
2. **RAG checks pending files** → Downloads from Supabase, vectorizes on-demand
3. **RAG searches vectors** → Filtered by domain + sector
4. **RAG updates timestamps** → Tracks last access for TTL
5. **RAG returns context** → Backend injects into LLM Council prompt

### Cleanup Flow (Daily Cron)
1. **Cron calls** `/rag/cleanup?days=30`
2. **RAG finds expired files** → Not accessed in 30 days
3. **RAG removes vectors** → Frees Upstash space
4. **File status**: `expired` (will re-vectorize on next query)

### Backend Configuration

In your Render backend, set:
```
RAG_SERVICE_URL=https://your-rag-service.koyeb.app
```

---

## Database Schema

```sql
CREATE TABLE rag_files (
    id UUID PRIMARY KEY,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    content_type TEXT DEFAULT 'application/pdf',
    domain TEXT NOT NULL,
    sector TEXT NOT NULL,
    vector_status TEXT DEFAULT 'pending',  -- pending | indexed | expired
    chunk_count INT DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Troubleshooting

### "No relevant documents found"
- Check that documents were registered with the correct domain/sector
- Verify the query domain/sector matches registered documents
- Use `/rag/files` to list registered documents and their `vector_status`

### Vectors not loading
- Check Supabase Storage bucket permissions
- Verify `SUPABASE_SERVICE_KEY` has access to the bucket
- Check file exists at the `storage_path`

### Embedding errors
- Verify `GOOGLE_AI_API_KEY` is valid
- Check Upstash Vector index has 768 dimensions

### Database errors
- Verify `DATABASE_URL` includes `?sslmode=require` for Neon
- Check Neon dashboard for connection limits
