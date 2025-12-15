# Contributing to Co-Op

Thank you for your interest in contributing to Co-Op! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+ (for RAG service)
- Git
- Code editor (VS Code recommended)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/co-op.git
   cd co-op
   ```

2. **Set up Backend**
   ```bash
   cd Backend
   cp .env.example .env
   npm install
   npm run db:push
   npm run dev
   ```

3. **Set up Frontend**
   ```bash
   cd Frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```

4. **Set up RAG Service (optional)**
   ```bash
   cd RAG
   cp .env.example .env
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

## Development Workflow

### Branch Naming

| Prefix | Purpose |
|--------|---------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation |
| `refactor/` | Code refactoring |
| `test/` | Test additions |

Example: `feature/add-slack-integration`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Code restructuring |
| `test` | Tests |
| `chore` | Maintenance |

Examples:
```bash
feat(agents): add competitor analysis caching
fix(auth): resolve token refresh race condition
docs(readme): update deployment instructions
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run linting and tests
4. Update documentation if needed
5. Submit a pull request

### Code Quality

**Backend:**
```bash
cd Backend
npm run lint
npm run format
npm run build
```

**Frontend:**
```bash
cd Frontend
npm run lint
npm run format
npm run typecheck
npm run build
```

## Code Style

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit return types
- Avoid `any` type

### React/Next.js

- Use functional components
- Use hooks appropriately
- Keep components focused

### NestJS

- Follow module-based architecture
- Use dependency injection
- Document endpoints with Swagger

## Testing

- Write tests for new features
- Maintain existing test coverage
- Test edge cases

## Documentation

- Update README for new features
- Add JSDoc comments for complex functions
- Keep API documentation current

## Questions?

- Open a [GitHub Discussion](https://github.com/Afnanksalal/co-op/discussions)
- Check existing [Issues](https://github.com/Afnanksalal/co-op/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
