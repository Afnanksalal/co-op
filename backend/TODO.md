# Co-Op Backend - TODO

## ✅ Completed

### Authentication & Security
- [x] Supabase Auth integration (token verification)
- [x] Auth guards with Supabase token validation
- [x] Admin guard for admin-only endpoints

### Infrastructure
- [x] NestJS 11 with modular architecture
- [x] Drizzle ORM with PostgreSQL
- [x] Upstash Redis (single source for caching + queues)
- [x] BullMQ with Upstash Redis
- [x] Supabase Storage for file uploads
- [x] Render deployment config (render.yaml, Dockerfile)
- [x] ESLint 9 flat config with strict TypeScript rules
- [x] Swagger/OpenAPI documentation

### LLM Council Architecture (A2A)
- [x] Multi-provider support (Groq, Google AI, HuggingFace)
- [x] Best-in-class models per family (no duplicates):
  - Groq: Llama 3.3 70B, Mixtral 8x7B, Gemma 2 9B
  - Google: Gemini 2.0 Flash
  - HuggingFace: Mistral Small 24B, Qwen 2.5 72B, DeepSeek R1 32B
- [x] Anonymous response generation (all models respond independently)
- [x] Response shuffling for unbiased critique
- [x] Cross-model critique (models critique other models' responses)
- [x] Score-based consensus and synthesis
- [x] Automatic fallback on provider failure

### Agents
- [x] Agent execution queue (BullMQ)
- [x] SSE streaming endpoint
- [x] Task status polling and cancellation
- [x] Orchestrator service
- [x] Legal agent with LLM Council
- [x] Finance agent with LLM Council
- [x] Investor agent with LLM Council
- [x] Competitor agent with LLM Council

### Admin Module
- [x] PDF upload with Supabase Storage
- [x] File management (list, delete, signed URLs)

---

## High Priority

### Authentication & Security
- [ ] Add OAuth2 providers (Google, GitHub) via Supabase
- [ ] Implement API key authentication for service-to-service calls
- [ ] Add rate limiting per user/endpoint

### Database
- [ ] Run initial Drizzle migrations in production
- [ ] Add database connection pooling optimization
- [ ] Implement soft deletes for critical entities

### MCP Integration
- [ ] Implement MCP client connection
- [ ] Add tool discovery and registration
- [ ] Implement tool execution with proper error handling

---

## Medium Priority

### Admin Module
- [ ] Add PDF parsing and chunking
- [ ] Integrate vector database (Pinecone/Qdrant/Weaviate)
- [ ] Implement embedding generation pipeline

### Sessions
- [ ] Add session expiration handling
- [ ] Implement session activity tracking
- [ ] Add session replay/history feature

### Analytics
- [ ] Add metrics collection (Prometheus)
- [ ] Implement event aggregation
- [ ] Add dashboard data endpoints

### Infrastructure
- [ ] Add health check for all external services
- [ ] Implement circuit breaker pattern
- [ ] Add request tracing (OpenTelemetry)
- [ ] Set up structured logging (JSON format for production)

---

## Low Priority

### Developer Experience
- [ ] Add comprehensive API documentation
- [ ] Create Postman/Insomnia collection
- [ ] Add integration tests
- [ ] Set up E2E testing with test database
- [ ] Add seed data scripts

### Performance
- [ ] Implement response caching strategy
- [ ] Add query optimization
- [ ] Implement pagination cursors for large datasets

### Features
- [ ] Implement webhooks for external integrations
- [ ] Add notification system (email/push)
- [ ] Implement audit logging

---

## LLM Council Pattern

The system uses an "LLM Council" pattern for improved accuracy and reduced hallucination:

1. **Anonymous Generation**: Multiple LLMs (3-5) independently generate responses to the same prompt
2. **Shuffle**: Responses are shuffled and anonymized
3. **Cross-Critique**: Each model critiques other models' responses (not their own)
4. **Scoring**: Critiques include scores (1-10), strengths, and weaknesses
5. **Synthesis**: Best-rated response is enhanced based on critique feedback

### Available Models (7 distinct families)

| Provider | Model | Name |
|----------|-------|------|
| Groq | llama-3.3-70b-versatile | Llama 3.3 70B |
| Groq | mixtral-8x7b-32768 | Mixtral 8x7B |
| Groq | gemma2-9b-it | Gemma 2 9B |
| Google | gemini-2.0-flash | Gemini 2.0 Flash |
| HuggingFace | mistralai/Mistral-Small-24B-Instruct-2501 | Mistral Small 24B |
| HuggingFace | Qwen/Qwen2.5-72B-Instruct | Qwen 2.5 72B |
| HuggingFace | deepseek-ai/DeepSeek-R1-Distill-Qwen-32B | DeepSeek R1 32B |

### Free Tier LLM Providers
- **Groq**: https://console.groq.com
- **Google AI Studio**: https://aistudio.google.com
- **HuggingFace**: https://huggingface.co/settings/tokens

---

## API Endpoints

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update current user profile
- `GET /api/v1/users/:id` - Get user by ID

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

### Health
- `GET /api/v1/health` - Health check

---

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set up PostgreSQL database (Render/Neon/Supabase)
3. Create Supabase project for auth and storage
4. Create Upstash Redis instance (used for both caching and BullMQ)
5. Get API keys from LLM providers (at least one required):
   - Groq: https://console.groq.com
   - Google AI: https://aistudio.google.com
   - HuggingFace: https://huggingface.co/settings/tokens
6. Run `npm run db:push` to sync schema

## Deployment Checklist

- [ ] Set all environment variables in Render
- [ ] Configure Supabase credentials
- [ ] Configure Upstash Redis URL and token
- [ ] Set up database connection
- [ ] Configure at least one LLM provider
- [ ] Configure CORS origins
- [ ] Enable rate limiting for production
