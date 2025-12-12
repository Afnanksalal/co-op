# Contributing to Co-Op Backend

Thank you for your interest in contributing to Co-Op! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- Git
- A code editor (VS Code recommended)

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/co-op.git
cd co-op/backend

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_ORG/co-op.git
```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required for development:
- PostgreSQL database (local or Neon free tier)
- Upstash Redis (free tier)
- Supabase project (free tier)
- At least one LLM API key

### 3. Setup Database

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

---

## Project Structure

```
src/
├── common/           # Shared utilities (guards, filters, services)
├── config/           # Environment configuration
├── database/         # Drizzle ORM schemas
└── modules/          # Feature modules (NestJS modules)
```

Each module follows NestJS conventions:
- `*.module.ts` - Module definition
- `*.controller.ts` - HTTP endpoints
- `*.service.ts` - Business logic
- `dto/` - Data transfer objects
- `types/` - TypeScript types

---

## Coding Standards

### TypeScript
- Use strict mode
- Prefer `interface` over `type` for objects
- Use explicit return types
- Avoid `any`

### NestJS Patterns
- Use dependency injection
- Keep controllers thin
- Use DTOs with class-validator
- Use guards for auth

### Code Style
- Run `npm run lint` before committing
- Run `npm run format` to auto-format

---

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code refactoring |
| `test` | Tests |
| `chore` | Maintenance |

Examples:
```bash
feat(agents): add competitor analysis agent
fix(auth): handle expired JWT tokens
docs(readme): add deployment instructions
```

---

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes following coding standards
3. Test: `npm run lint && npm run test && npm run build`
4. Commit with conventional commit message
5. Push and create PR on GitHub

### PR Requirements
- Passes lint and tests
- Builds successfully
- Has descriptive title and description
- Updates documentation if needed

---

## Testing

```bash
npm run test        # Unit tests
npm run test:watch  # Watch mode
npm run test:cov    # Coverage
npm run test:e2e    # E2E tests
```

---

## Documentation

- Use JSDoc for public APIs
- Use Swagger decorators on controllers
- Update README for significant changes

---

## Questions?

Open a GitHub issue for discussion.

Thank you for contributing!
