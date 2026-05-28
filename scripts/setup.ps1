# ================================================================
# Nexus ERP — Quick Setup Script (Windows PowerShell)
# ================================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         NEXUS ERP — QUICK SETUP          ║" -ForegroundColor Cyan
Write-Host "║   Enterprise SaaS Platform with AI       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Node.js 20+ required. Download at https://nodejs.org" -ForegroundColor Red
  exit 1
}

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Docker required. Download at https://docker.com" -ForegroundColor Red
  exit 1
}

Write-Host "✅ Requirements met" -ForegroundColor Green

# Copy env
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "⚠️  .env created — fill in your API keys!" -ForegroundColor Yellow
}

# Start Docker services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Blue
docker-compose up -d postgres redis

Write-Host "⏳ Waiting for database (10s)..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm ci

# Generate Prisma
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
npm run db:generate

# Migrations
Write-Host "🗄️  Running migrations..." -ForegroundColor Blue
npm run db:migrate

# Seed
Write-Host "🌱 Seeding database..." -ForegroundColor Blue
npm run db:seed

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ NEXUS ERP READY!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Start: npm run dev"
Write-Host ""
Write-Host "🌐 URLs:"
Write-Host "   Web:     http://localhost:3000"
Write-Host "   API:     http://localhost:4000/api/v1"
Write-Host "   Swagger: http://localhost:4000/api/docs"
Write-Host ""
Write-Host "🔑 Demo credentials:"
Write-Host "   Email:    admin@nexuserp.com"
Write-Host "   Password: Admin123!"
Write-Host ""
