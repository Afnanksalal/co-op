# Co-Op Backend

Enterprise-grade NestJS backend with LLM Council architecture, Supabase Auth, Drizzle ORM, and Upstash Redis.

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (Supabase)
- **Cache/Queue**: Upstash Redis + BullMQ
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **LLM**: Multi-provider (Groq, Google AI, HuggingFace)
- **Validation**: class-validator + Zod
- **Documentation**: Swagger/OpenAPI
- **Hosting**: Render

## LLM Council Architecture

The system uses an "LLM Council" pattern for improved accuracy and reduced hallucination:

1. **Anonymous Generation**: 3-5 LLMs independently generate responses
2. **Shuffle**: Responses are shuffled and anonymized
3. **Cross-Critique**: Each model critiques other models' responses
4. **Scoring**: Critiques include scores (1-10), strengths, weaknesses
5. **Synthesis**: Best-rated response is enhanced based on feedback

### Available Models (7 distinct families)

| Provider | Model | 
|----------|-------|
| Groq | Llama 3.3 70B, Mixtral 8x7B, Gemma 2 9B |
| Google | Gemini 2.0 Flash |
| HuggingFace | Mistral Small 24B, Qwen 2.5 72B, DeepSeek R1 32B |

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Project Structure

```
src/
├── common/
│   ├── decorators/         # @CurrentUser decorator
│   ├── dto/                # ApiResponse, Pagination DTOs
│   ├── filters/            # Exception filters
│   ├── guards/             # Auth & Admin guards (Supabase)
│   ├── llm/                # LLM Council system
│   │   ├── providers/      # Groq, Google, HuggingFace
│   │   ├── llm-council.service.ts
│   │   └── types/
│   ├── redis/              # Upstash Redis service
│   └── supabase/           # Supabase Auth & Storage
├── config/                 # Zod-validated env config
├── database/
│   ├── migrations/
│   └── schema/
└── modules/
    ├── admin/              # PDF uploads, embeddings
    ├── agents/
    │   ├── domains/        # Legal, Finance, Investor, Competitor
    │   ├── orchestrator/
    │   └── queue/          # BullMQ processing
    ├── analytics/
    ├── health/
    ├── mcp/
    ├── sessions/
    └── users/
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service key | No |
| `UPSTASH_REDIS_URL` | Upstash Redis URL | Yes |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis token | Yes |
| `GROQ_API_KEY` | Groq API key | At least one LLM |
| `GOOGLE_AI_API_KEY` | Google AI API key | At least one LLM |
| `HUGGINGFACE_API_KEY` | HuggingFace API key | At least one LLM |
| `PORT` | Server port | No (default: 3000) |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start:prod   # Start production server
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema (dev only)
npm run db:studio    # Open Drizzle Studio
npm run lint         # Run ESLint
npm run test         # Run tests
```

## API Endpoints

### Health
- `GET /api/v1/health` - Health check

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update current user
- `GET /api/v1/users/:id` - Get user by ID

### Sessions
- `POST /api/v1/sessions` - Create session
- `GET /api/v1/sessions` - List user sessions
- `GET /api/v1/sessions/:id` - Get session
- `POST /api/v1/sessions/:id/end` - End session

### Agents
- `POST /api/v1/agents/run` - Run agent with LLM Council
- `POST /api/v1/agents/queue` - Queue agent task (async)
- `GET /api/v1/agents/tasks/:taskId` - Get task status
- `DELETE /api/v1/agents/tasks/:taskId` - Cancel task
- `GET /api/v1/agents/stream/:taskId` - SSE stream

### Admin
- `POST /api/v1/admin/embeddings/upload` - Upload PDF
- `GET /api/v1/admin/embeddings` - List embeddings
- `GET /api/v1/admin/embeddings/:id` - Get embedding
- `DELETE /api/v1/admin/embeddings/:id` - Delete embedding

## Authentication

Uses Supabase Auth. Include the Supabase access token in the Authorization header:

```
Authorization: Bearer <supabase_access_token>
```

## Deployment

### Render

1. Connect your repository to Render
2. Use the `render.yaml` blueprint or configure manually:
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t co-op-backend .
docker run -p 3000:3000 --env-file .env co-op-backend
```

## Free Tier LLM Providers

- **Groq**: https://console.groq.com
- **Google AI Studio**: https://aistudio.google.com
- **HuggingFace**: https://huggingface.co/settings/tokens

## API Documentation

Swagger UI available at `/docs` in development mode.

## License

MIT
