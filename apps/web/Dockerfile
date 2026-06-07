# ================================================================
# Nexus ERP — Web Dockerfile (Multi-stage, Next.js 15)
# ================================================================

# Stage 1: Build — single stage so npm ci and next build share the same
# Node.js context without cross-stage node_modules copy (avoids symlink issues)
FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Root manifest + lock file (monorepo root)
COPY package*.json ./
# Web workspace manifest
COPY apps/web/package*.json ./apps/web/
# Root tsconfig required: apps/web/tsconfig.json extends ../../tsconfig.json
COPY tsconfig.json ./
# Web source
COPY apps/web ./apps/web

# Install dependencies in the same stage as the build so npm workspace context
# is intact and no cross-stage COPY of node_modules is needed
RUN npm ci --workspace=apps/web --include-workspace-root

# Build-time env vars (placeholders — real values injected at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXTAUTH_SECRET=build-placeholder-not-used-at-runtime
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NODE_OPTIONS=--max-old-space-size=4096

WORKDIR /app/apps/web

# Ensure public dir exists (Next.js requires it)
RUN mkdir -p public

RUN npm run build

# ================================================================
# Stage 2: Production — minimal Alpine runtime image
# ================================================================
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# standalone output includes server.js + node_modules snapshot
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# static files must live at .next/static relative to server.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
# public assets (may be empty but dir must exist)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
