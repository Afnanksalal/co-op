# Co-Op Backend

Enterprise-grade NestJS backend with Drizzle ORM, Upstash Redis, and PostgreSQL.

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Cache**: Upstash Redis
- **Validation**: class-validator + Zod
- **Documentation**: Swagger/OpenAPI
- **Hosting**: Render

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
├── common/                 # Shared utilities
│   ├── decorators/         # Custom decorators
│   ├── dto/                # Common DTOs
│   ├── filters/            # Exception filters
│   ├── guards/             # Auth guards
│   └── redis/              # Redis service
├── config/                 # Configuration
├── database/               # Drizzle setup
│   ├── migrations/         # SQL migrations
│   └── schema/             # Table definitions
└── modules/                # Feature modules
    ├── admin/              # Admin endpoints
    ├── agents/             # Agent orchestration
    │   ├── domains/        # Domain-specific agents
    │   │   ├── competitor/
    │   │   ├── finance/
    │   │   ├── investor/
    │   │   └── legal/
    │   └── orchestrator/   # Agent orchestrator
    ├── analytics/          # Event tracking
    ├── health/             # Health checks
    ├── mcp/                # MCP integration
    ├── sessions/           # Session management
    └── users/              # User management
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `UPSTASH_REDIS_URL` | Upstash Redis REST URL | Yes |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis token | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `PORT` | Server port | No (default: 3000) |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | No |

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
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user
- `PATCH /api/v1/users/:id` - Update user

### Sessions
- `POST /api/v1/sessions` - Create session
- `GET /api/v1/sessions` - List user sessions
- `GET /api/v1/sessions/:id` - Get session
- `POST /api/v1/sessions/:id/end` - End session

### Agents
- `POST /api/v1/agents/run` - Run agent
- `GET /api/v1/agents/tasks/:taskId` - Get task status
- `GET /api/v1/agents/stream/:taskId` - SSE stream

### Admin
- `POST /api/v1/admin/embeddings/upload` - Upload PDF
- `GET /api/v1/admin/embeddings` - List embeddings
- `GET /api/v1/admin/embeddings/:id` - Get embedding
- `DELETE /api/v1/admin/embeddings/:id` - Delete embedding

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

## API Documentation

Swagger UI available at `/docs` in development mode.

## License

MIT
