# ================================================================
# Nexus ERP — Web Dockerfile (Multi-stage, Next.js 15)
# ================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Root lock file + workspace manifest (monorepo lock is at root)
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm ci --workspace=apps/web --include-workspace-root

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# Root tsconfig is required: apps/web/tsconfig.json extends ../../tsconfig.json
COPY tsconfig.json ./
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder values so NextAuth and API rewrites don't throw during next build
# (real values are injected at runtime via docker-compose / k8s env)
ENV NEXTAUTH_SECRET=build-placeholder-not-used-at-runtime
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=http://localhost:4000

WORKDIR /app/apps/web

# Ensure public dir exists (Next.js requires it; app may not have one yet)
RUN mkdir -p public

RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production

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
