# Build arguments
ARG nodeVersion=24

# Builder stage
FROM node:${nodeVersion}-alpine AS builder

# Enable corepack for pnpm (included in Node.js 16.9+)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/plugin/package.json ./apps/plugin/
COPY packages/shared/package.json ./packages/shared/

# Copy patches directory (required for pnpm install)
COPY apps/api/patches ./apps/api/patches

# Fetch dependencies to store store directory (offline install preparation)
# This creates a cache that can be reused for faster rebuilds
RUN pnpm fetch --frozen-lockfile

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile --offline

# Copy source code
COPY . .

# Build the API application
RUN pnpm --filter @figma-agent/api build

# Production stage
FROM node:${nodeVersion}-alpine AS api

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Copy patches directory (required for pnpm fetch/install)
COPY apps/api/patches ./apps/api/patches

# Fetch only production dependencies
RUN pnpm fetch --frozen-lockfile --prod

# Install only production dependencies using offline mode (faster, uses fetched cache)
RUN NODE_ENV=production pnpm install --frozen-lockfile --offline --prod

# Copy built application from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy env.js for runtime dotenv loading
COPY apps/api/env.js ./apps/api/env.js

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership of app directory to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "-r", "./apps/api/env.js", "apps/api/dist/main"]
