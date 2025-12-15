# Contributing to Co-Op Backend

Thank you for your interest in contributing!

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- Git

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/co-op.git
cd co-op/Backend
npm install

# Configure environment
cp .env.example .env

# Setup database
npm run db:push

# Start development
npm run dev
```

## Development

### Project Structure

```
src/
├── common/           # Shared utilities
├── config/           # Environment config
├── database/         # Drizzle schemas
└── modules/          # Feature modules
```

### Code Style

- TypeScript strict mode
- Use dependency injection
- Use DTOs with class-validator
- Document with Swagger decorators

### Commands

```bash
npm run lint         # Check code
npm run format       # Format code
npm run test         # Run tests
npm run build        # Build
```

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(agents): add competitor analysis
fix(auth): handle expired tokens
docs(readme): update instructions
```

## Pull Request Process

1. Create feature branch: `git checkout -b feat/my-feature`
2. Make changes
3. Run: `npm run lint && npm run build`
4. Submit PR

## License

By contributing, you agree to the MIT License.
