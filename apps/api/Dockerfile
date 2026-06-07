# ================================================================
# Nexus ERP — API Dockerfile (Multi-stage)
# ================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy only the package manifests needed for the API and its workspace deps
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/api/package*.json ./apps/api/

# Install only what the API workspace needs (hoisted to root node_modules)
RUN npm ci --workspace=packages/database --workspace=apps/api --include-workspace-root

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# With npm workspaces, node_modules only exists at the root (hoisted)
COPY --from=deps /app/node_modules ./node_modules
COPY packages/database ./packages/database
COPY apps/api ./apps/api
COPY tsconfig.json ./

WORKDIR /app/packages/database
RUN npx prisma generate

WORKDIR /app/apps/api
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat openssl dumb-init

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./prisma

RUN mkdir -p uploads && chown nestjs:nodejs uploads

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
