# ===========================================
# Co-Op Backend - Production Dockerfile
# Optimized for Render deployment
# ===========================================

# Build stage
FROM node:22-alpine AS builder

# Install build dependencies for canvas (node-canvas)
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev giflib-dev

WORKDIR /app

# Install dependencies (canvas needs native build)
COPY package*.json ./
RUN npm ci

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

# Install runtime dependencies for canvas and Tesseract OCR
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    cairo \
    pango \
    libjpeg-turbo \
    giflib \
    pixman

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
