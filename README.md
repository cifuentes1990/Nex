# Nexus ERP — Enterprise SaaS Platform

> AI-Powered Enterprise Resource Planning System for Modern Businesses

![Nexus ERP](https://img.shields.io/badge/version-1.0.0-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![NestJS](https://img.shields.io/badge/NestJS-10-red) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Overview

Nexus ERP is a production-grade, AI-powered enterprise platform combining:
- **POS System** — Touch-optimized point of sale
- **ERP Core** — Inventory, orders, invoicing, suppliers
- **CRM** — Customer intelligence & loyalty
- **BI Analytics** — Real-time dashboards & forecasting
- **AI Assistant** — GPT-4 + Claude business intelligence
- **SaaS Infrastructure** — Multi-tenant, multi-branch

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Shadcn/UI, Framer Motion |
| State | Zustand, TanStack Query |
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Database | PostgreSQL 16, Redis 7 |
| AI | OpenAI GPT-4, Anthropic Claude, LangChain |
| Real-time | Socket.io WebSockets |
| Auth | NextAuth.js, JWT, Google OAuth |
| Payments | Stripe, MercadoPago |
| Infrastructure | Docker, Docker Compose, Nginx |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Windows
```powershell
git clone https://github.com/your-org/nexus-erp
cd nexus-erp
.\scripts\setup.ps1
npm run dev
```

### Linux/macOS
```bash
git clone https://github.com/your-org/nexus-erp
cd nexus-erp
chmod +x scripts/setup.sh
./scripts/setup.sh
npm run dev
```

### Manual Setup
```bash
# 1. Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Install dependencies
npm ci

# 4. Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Start development
npm run dev
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nexuserp.com | Admin123! |
| Manager | manager@nexuserp.com | Admin123! |
| Cashier | cajero@nexuserp.com | Admin123! |

## URLs

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/docs |
| PgAdmin | http://localhost:5050 |
| Minio | http://localhost:9001 |

## Project Structure

```
nexus-erp/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (auth)/     # Login, Register
│   │   │   │   └── (dashboard)/# All dashboard pages
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # API client, utils
│   │   │   └── store/          # Zustand stores
│   └── api/                    # NestJS backend
│       └── src/
│           ├── modules/        # Feature modules
│           │   ├── auth/       # JWT + OAuth
│           │   ├── products/   # Product catalog
│           │   ├── inventory/  # Stock management
│           │   ├── orders/     # POS + Orders
│           │   ├── invoices/   # PDF invoicing
│           │   ├── customers/  # CRM
│           │   ├── analytics/  # BI + KPIs
│           │   ├── ai/         # GPT-4 + Claude
│           │   └── ...
│           ├── common/         # Guards, decorators
│           ├── config/         # Prisma, config
│           └── gateways/       # WebSockets
├── packages/
│   └── database/               # Prisma schema + seeds
├── docker/                     # Nginx, Postgres config
├── scripts/                    # Setup scripts
└── .github/workflows/          # CI/CD pipelines
```

## Key Features

### AI Business Assistant
- Real-time business context injection
- GPT-4 + Claude dual-model support
- Automatic insight generation
- Demand forecasting
- Fraud detection
- Auto-generated promotions

### POS System
- Touch-optimized interface
- Barcode/QR scanner support
- Offline-capable (PWA)
- Multiple payment methods
- Receipt printing
- Real-time cart

### Invoicing
- Professional PDF generation with QR codes
- Electronic invoice support
- Partial payments & credits
- Overdue detection
- Excel export

### Analytics
- Real-time WebSocket updates
- 30/60/90-day sales trends
- Category revenue breakdown
- Customer segmentation (RFM)
- Sales heatmap by hour
- Profit & margin analysis
- AI-powered forecasting

## Deployment

### Vercel + Railway (Recommended)
```bash
# Deploy web to Vercel
cd apps/web && vercel --prod

# Deploy API to Railway
railway up
```

### Docker Production
```bash
docker-compose up -d
```

### AWS / DigitalOcean
See `docs/deployment.md` for full infrastructure guide.

## API Documentation

Full Swagger documentation at `/api/docs` when running locally.

### Key Endpoints
```
POST /api/v1/auth/login          # Login
POST /api/v1/auth/register       # Register org + admin
GET  /api/v1/analytics/dashboard # Dashboard KPIs
GET  /api/v1/products            # Product catalog
POST /api/v1/orders              # Create sale (POS)
GET  /api/v1/invoices/:id/pdf    # Download invoice PDF
POST /api/v1/ai/chat             # AI assistant
GET  /api/v1/ai/insights         # Business insights
GET  /api/v1/analytics/forecast  # Sales forecasting
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=your-32-char-secret
```

## Security

- JWT + Refresh Token rotation
- Role-based access control (7 roles)
- Rate limiting (Throttler)
- Helmet.js security headers
- Input validation (class-validator)
- SQL injection protection (Prisma)
- XSS protection
- CORS configuration
- Audit logging

## License

MIT License — Open source, free to use and modify.

---

Built with by the Nexus ERP Team | nexuserp.com
