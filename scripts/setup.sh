#!/bin/bash
# ================================================================
# Nexus ERP — Quick Setup Script
# ================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║         NEXUS ERP — QUICK SETUP          ║"
echo "║   Enterprise SaaS Platform with AI       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check requirements
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js 20+ required${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker required${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose required${NC}"; exit 1; }

echo -e "${GREEN}✅ All requirements met${NC}"

# Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}⚠️  .env created from .env.example — fill in your API keys!${NC}"
fi

# Start infrastructure
echo -e "${BLUE}🐳 Starting Docker services...${NC}"
docker-compose up -d postgres redis

# Wait for Postgres
echo "⏳ Waiting for database..."
sleep 5

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

# Generate Prisma client
echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
npm run db:generate

# Run migrations
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
npm run db:migrate

# Seed database
echo -e "${BLUE}🌱 Seeding database with demo data...${NC}"
npm run db:seed

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ NEXUS ERP READY!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "🚀 Start development:"
echo "   npm run dev"
echo ""
echo "🌐 URLs:"
echo "   Web:     http://localhost:3000"
echo "   API:     http://localhost:4000/api/v1"
echo "   Swagger: http://localhost:4000/api/docs"
echo ""
echo "🔑 Demo credentials:"
echo "   Email:    admin@nexuserp.com"
echo "   Password: Admin123!"
echo ""
