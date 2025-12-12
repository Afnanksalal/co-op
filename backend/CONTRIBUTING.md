# Contributing to Co-Op Backend

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Start development server: `npm run dev`

## Code Style

- Follow the existing code patterns
- Use TypeScript strict mode
- Run `npm run lint` before committing
- Run `npm run format` to format code

## Commit Messages

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `npm run test`
4. Submit PR with clear description

## Project Structure

- `src/common/` - Shared utilities, guards, decorators
- `src/config/` - Configuration and environment
- `src/database/` - Drizzle schema and migrations
- `src/modules/` - Feature modules (NestJS modules)

## Questions?

Open an issue for discussion.
