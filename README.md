# Mini ERP + CRM Operations Portal

A full-stack business operations portal with customer management (CRM), inventory tracking, and sales challan management.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript + Express.js |
| Database | MySQL 8.x (Amazon RDS in prod, Docker container in dev) |
| ORM | Prisma |
| Auth | JWT (role-based: ADMIN, SALES, WAREHOUSE, ACCOUNTS) |
| Frontend | React + TypeScript + Vite |
| Containerization | Docker + docker-compose |
| Deployment | AWS EC2 + AWS RDS |

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose (for local MySQL)

### 1. Clone & setup

```bash
git clone <repo-url>
cd BusinessCRM
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env — for local dev, use the local MySQL DATABASE_URL (see .env.example)
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Or use Docker Compose (recommended)

```bash
# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start everything (creates local MySQL + backend + frontend + nginx)
docker compose up -d

# Run migrations
docker compose exec backend npx prisma migrate deploy
docker compose exec backend ts-node prisma/seed.ts
```

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.local | Admin@123 |
| Sales | sales@demo.local | Sales@123 |
| Warehouse | warehouse@demo.local | Warehouse@123 |
| Accounts | accounts@demo.local | Accounts@123 |

> These are seeded by `prisma/seed.ts`. The login page has a **Test Accounts** panel (dev/staging only, controlled by `VITE_SHOW_TEST_CREDENTIALS=true`).

## API

Base URL: `/api/v1`  
Auth: `Authorization: Bearer <JWT>` on all endpoints except `/auth/login`.

### Key Endpoints

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Users | `GET/POST/PATCH /users` (Admin only) |
| Customers | `GET/POST/PUT/DELETE /customers`, `POST/GET /customers/:id/follow-ups` |
| Products | `GET/POST/PUT /products`, `POST/GET /products/:id/stock-movements` |
| Challans | `GET/POST/PUT /challans`, `POST /challans/:id/confirm`, `POST /challans/:id/cancel` |
| Dashboard | `GET /dashboard/summary` |

## Production Deployment (AWS)

See [Implementation.md](./Implementation.md) §9 for detailed AWS deployment steps.

```bash
# On EC2, after cloning & creating backend/.env with real RDS credentials:
docker compose -f docker-compose.prod.yml up -d --build
```

## Folder Structure

```
BusinessCRM/
├── backend/
│   ├── src/
│   │   ├── modules/       # auth, users, customers, products, challans
│   │   ├── middleware/    # auth, validate, errorHandler
│   │   └── utils/         # jwt, prisma, errors, challanNumber
│   └── prisma/            # schema.prisma, seed.ts, migrations/
├── frontend/
│   └── src/
│       ├── pages/         # Login, Dashboard, Customers, Products, Challans, Users
│       ├── components/    # Sidebar, ProtectedLayout
│       ├── context/       # AuthContext
│       └── api/           # Axios client + typed endpoints
├── nginx/                 # Reverse proxy config
├── docker-compose.yml     # Dev (includes local MySQL)
└── docker-compose.prod.yml # Prod (RDS external)
```
