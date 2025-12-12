# ===========================================
# Co-Op Backend - Production Dockerfile
# Optimized for Render deployment
# ===========================================

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy TypeScript config files needed for build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ===========================================
# Production stage
# ===========================================
FROM node:22-alpine AS production

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy production dependencies and built app
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Switch to non-root user
USER nestjs

# Expose port (Render uses PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
