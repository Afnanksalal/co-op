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

5. **Set up Mobile App (optional)**
   ```bash
   cd MobileApp
   npm install
   npm start
   # Scan QR code with Expo Go app
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
| `chore/` | Maintenance tasks |

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
| `perf` | Performance improvements |
| `ci` | CI/CD changes |

Examples:
```bash
feat(agents): add competitor analysis caching
fix(auth): resolve token refresh race condition
docs(readme): update deployment instructions
perf(rag): optimize vector search queries
ci(github): add automated security audit
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run linting and type checking
4. Ensure CI passes (GitHub Actions)
5. Update documentation if needed
6. Submit a pull request with clear description

### CI/CD Pipeline

All PRs trigger automated checks:
- ESLint and Prettier formatting
- TypeScript type checking
- Build verification
- Security audit (`npm audit`)

### Code Quality

**Backend:**
```bash
cd Backend
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run build         # Verify build
npm audit             # Security check
```

**Frontend:**
```bash
cd Frontend
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run typecheck     # TypeScript checking
npm run build         # Verify build
```

**RAG Service:**
```bash
cd RAG
pip install -r requirements.txt
python -m py_compile app/main.py  # Syntax check
```

## Code Style

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit return types
- Avoid `any` type
- Use meaningful variable names

### React/Next.js

- Use functional components with hooks
- Keep components focused and small
- Use proper TypeScript types for props
- Follow accessibility best practices

### NestJS

- Follow module-based architecture
- Use dependency injection
- Document endpoints with proper DTOs
- Use guards for authentication/authorization
- Implement proper error handling

### Python (RAG)

- Follow PEP 8 style guide
- Use type hints
- Document functions with docstrings
- Use async/await for I/O operations

## Architecture Guidelines

### Adding New Features

1. **Backend**: Create a new module in `src/modules/`
2. **Frontend**: Add pages in `src/app/` and components in `src/components/`
3. **Database**: Add schema in `src/database/schema/` and migration in `src/database/migrations/`
4. **API**: Follow RESTful conventions, add proper DTOs and validation

### Security Considerations

- Never commit secrets or API keys
- Use environment variables for configuration
- Implement proper input validation
- Follow rate limiting guidelines
- Add audit logging for sensitive operations

## Documentation

- Update README for new features
- Add JSDoc comments for complex functions
- Keep API documentation current
- Document environment variables in `.env.example`

## Questions?

- Open a [GitHub Discussion](https://github.com/Afnanksalal/co-op/discussions)
- Check existing [Issues](https://github.com/Afnanksalal/co-op/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
