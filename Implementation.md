# Implementation Plan — Mini ERP + CRM Operations Portal

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Backend | Node.js + TypeScript + Express.js |
| Database | MySQL (Amazon RDS) |
| ORM | Prisma (or TypeORM — Prisma assumed below) |
| Auth | JWT (access token, role claim embedded) |
| Frontend | React + TypeScript |
| Containerization | Docker + docker-compose |
| Deployment | AWS EC2 (app containers) + AWS RDS (MySQL) |
| Reverse proxy / TLS | Nginx container (optional Let's Encrypt) |

---

## 2. High-Level Architecture

```
                        ┌────────────────────────┐
                        │        AWS EC2          │
                        │  ┌──────────────────┐   │
   Browser ───HTTPS──▶  │  │ Nginx (reverse    │   │
                        │  │ proxy, port 80/443)│  │
                        │  └─────────┬─────────┘   │
                        │            │              │
                        │  ┌─────────▼─────────┐    │
                        │  │ frontend container │   │
                        │  │ (React static build)│  │
                        │  └────────────────────┘   │
                        │  ┌────────────────────┐   │
                        │  │ backend container   │   │
                        │  │ (Express API :4000) │   │
                        │  └─────────┬──────────┘   │
                        └────────────┼──────────────┘
                                     │  (private subnet / SG rule)
                              ┌──────▼───────┐
                              │  AWS RDS      │
                              │  MySQL 8.x    │
                              └───────────────┘
```

- EC2 hosts both containers via `docker-compose` (Nginx, backend, frontend).
- RDS MySQL is a separate managed instance, reachable only from the EC2 security group (not public).
- Env vars injected via `.env` file (EC2) / Docker secrets, never committed.

---

## 3. Database Schema (MySQL / Prisma models)

### 3.1 User
```prisma
model User {
  id           Int       @id @default(autoincrement())
  name         String
  email        String    @unique
  passwordHash String
  role         Role
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  challans     Challan[]        @relation("CreatedByUser")
  stockMoves   StockMovement[]  @relation("CreatedByUser")
  followUps    FollowUp[]       @relation("CreatedByUser")
}

enum Role {
  ADMIN
  SALES
  WAREHOUSE
  ACCOUNTS
}
```

### 3.2 Customer
```prisma
model Customer {
  id            Int            @id @default(autoincrement())
  name          String
  mobile        String
  email         String?
  businessName  String?
  gstNumber     String?
  customerType  CustomerType
  address       String?
  status        CustomerStatus @default(LEAD)
  followUpDate  DateTime?
  notes         String?        @db.Text
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  challans      Challan[]
  followUps     FollowUp[]
}

enum CustomerType {
  RETAIL
  WHOLESALE
  DISTRIBUTOR
}

enum CustomerStatus {
  LEAD
  ACTIVE
  INACTIVE
}
```

### 3.3 FollowUp (CRM notes log)
```prisma
model FollowUp {
  id          Int      @id @default(autoincrement())
  customerId  Int
  customer    Customer @relation(fields: [customerId], references: [id])
  note        String   @db.Text
  followUpDate DateTime?
  createdById Int
  createdBy   User     @relation("CreatedByUser", fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
}
```

### 3.4 Product
```prisma
model Product {
  id            Int        @id @default(autoincrement())
  name          String
  sku           String     @unique
  category      String?
  unitPrice     Decimal    @db.Decimal(10, 2)
  currentStock  Int        @default(0)
  minStockAlert Int        @default(0)
  location      String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  stockMoves    StockMovement[]
  challanItems  ChallanItem[]
}
```

### 3.5 StockMovement
```prisma
model StockMovement {
  id           Int          @id @default(autoincrement())
  productId    Int
  product      Product      @relation(fields: [productId], references: [id])
  quantity     Int
  movementType MovementType
  reason       String?
  createdById  Int
  createdBy    User         @relation("CreatedByUser", fields: [createdById], references: [id])
  createdAt    DateTime     @default(now())
}

enum MovementType {
  IN
  OUT
}
```

### 3.6 Challan (Sales Challan)
```prisma
model Challan {
  id            Int           @id @default(autoincrement())
  challanNumber String        @unique   // e.g. CH-2026-00001, auto-generated
  customerId    Int
  customer      Customer      @relation(fields: [customerId], references: [id])
  totalQuantity Int
  status        ChallanStatus @default(DRAFT)
  createdById   Int
  createdBy     User          @relation("CreatedByUser", fields: [createdById], references: [id])
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  items         ChallanItem[]
}

enum ChallanStatus {
  DRAFT
  CONFIRMED
  CANCELLED
}
```

### 3.7 ChallanItem (product snapshot — not just a foreign key)
```prisma
model ChallanItem {
  id            Int      @id @default(autoincrement())
  challanId     Int
  challan       Challan  @relation(fields: [challanId], references: [id])
  productId     Int
  product       Product  @relation(fields: [productId], references: [id])

  // snapshot fields captured at time of adding to challan
  productNameSnap String
  skuSnap         String
  unitPriceSnap   Decimal @db.Decimal(10, 2)

  quantity      Int
  lineTotal     Decimal  @db.Decimal(10, 2)
}
```

**Business rule enforcement (application layer, inside a DB transaction):**
- On `POST /challans/:id/confirm`: for each `ChallanItem`, lock the `Product` row (`SELECT ... FOR UPDATE`), verify `currentStock >= quantity`. If any line fails, roll back the whole transaction and return `409 Conflict` with the list of insufficient items. If all pass, decrement stock and insert a `StockMovement` (`OUT`, reason = `"Challan <number> confirmed"`) per item.

---

## 4. REST API Specification

Base URL: `/api/v1`
Auth: `Authorization: Bearer <JWT>` on all routes except `/auth/login`.
Standard error shape: `{ "success": false, "message": string, "errors"?: object }`

### 4.1 Auth
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | Public | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | Any authenticated | Returns current user profile |
| POST | `/auth/logout` | Any authenticated | Stateless — client discards token (optional token blacklist) |

### 4.2 Users (admin-managed test accounts)
| Method | Path | Roles |
|---|---|---|
| GET | `/users` | Admin |
| POST | `/users` | Admin |
| PATCH | `/users/:id` | Admin |
| PATCH | `/users/:id/deactivate` | Admin |

### 4.3 Customers
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/customers` | Admin, Sales | Query: `page, limit, search, status, type` |
| GET | `/customers/:id` | Admin, Sales | Includes follow-up history |
| POST | `/customers` | Admin, Sales | |
| PUT | `/customers/:id` | Admin, Sales | |
| DELETE | `/customers/:id` | Admin | Soft delete (`status = INACTIVE`) |
| POST | `/customers/:id/follow-ups` | Admin, Sales | Add note + next follow-up date |
| GET | `/customers/:id/follow-ups` | Admin, Sales | |

### 4.4 Products / Inventory
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/products` | Admin, Sales, Warehouse | Query: `page, limit, search, category, lowStock=true` |
| GET | `/products/:id` | Admin, Sales, Warehouse | |
| POST | `/products` | Admin, Warehouse | |
| PUT | `/products/:id` | Admin, Warehouse | |
| POST | `/products/:id/stock-movements` | Admin, Warehouse | `{ quantity, movementType, reason }` — adjusts `currentStock` |
| GET | `/products/:id/stock-movements` | Admin, Warehouse, Accounts | Paginated log |

### 4.5 Sales Challans
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/challans` | Admin, Sales, Accounts | Query: `page, limit, status, customerId` |
| GET | `/challans/:id` | Admin, Sales, Accounts, Warehouse | |
| POST | `/challans` | Admin, Sales | Creates as `DRAFT`; auto-generates `challanNumber`; body: `{ customerId, items: [{ productId, quantity }] }` |
| PUT | `/challans/:id` | Admin, Sales | Only editable while `DRAFT` |
| POST | `/challans/:id/confirm` | Admin, Sales | Transitions `DRAFT → CONFIRMED`; runs stock-deduction transaction; `409` on insufficient stock |
| POST | `/challans/:id/cancel` | Admin, Sales | `DRAFT` or `CONFIRMED → CANCELLED`; if was `CONFIRMED`, reverses stock via `IN` movement |
| GET | `/challans/:id/pdf` | Admin, Sales, Accounts | Bonus: exports challan as PDF |

### 4.6 Dashboard / misc (optional convenience endpoints)
| Method | Path | Roles |
|---|---|---|
| GET | `/dashboard/summary` | Admin | Counts: customers by status, low-stock products, draft challans |
| GET | `/health` | Public | Liveness check for Docker/ALB |

---

## 5. Auth & Role Middleware

- `authenticate` middleware: verifies JWT, attaches `req.user`.
- `authorize(...roles)` middleware: `403` if `req.user.role` not in list.
- Password hashing: `bcrypt` (cost factor 10+).
- JWT payload: `{ sub: userId, role, email }`, expiry 8h, signed with `JWT_SECRET`.

---

## 6. Test Credentials on Login Page

The login screen renders a small "Test Accounts" panel (dev/staging builds only, controlled by `SHOW_TEST_CREDENTIALS=true` env flag) listing one seeded login per role, with a "Fill" button that auto-populates the form:

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.local | Admin@123 |
| Sales | sales@demo.local | Sales@123 |
| Warehouse | warehouse@demo.local | Warehouse@123 |
| Accounts | accounts@demo.local | Accounts@123 |

These are created by a `prisma/seed.ts` script run once after migration. The panel is conditionally rendered in React based on the `VITE_SHOW_TEST_CREDENTIALS` build-time env var, so it can be disabled for a real production build.

---

## 7. Folder Structure

```
mini-erp-crm/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   └── challans/
│   │   ├── middleware/ (auth, roleGuard, errorHandler, validate)
│   │   ├── prisma/ (schema.prisma, seed.ts, migrations/)
│   │   ├── utils/ (challanNumberGenerator, jwt, logger)
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/ (Login, Customers, Products, Challans, Dashboard)
│   │   ├── components/
│   │   ├── api/ (axios client + typed endpoints)
│   │   └── context/ (AuthContext)
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── nginx/
│   └── default.conf
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 8. Docker Setup

### 8.1 `backend/Dockerfile`
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

### 8.2 `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### 8.3 `docker-compose.prod.yml` (runs on EC2; RDS is external, not a container)
```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    env_file: ./backend/.env
    restart: always
    expose:
      - "4000"

  frontend:
    build: ./frontend
    restart: always
    expose:
      - "80"

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend
    restart: always
```

No `db` service is defined locally-for-prod since RDS is external; a `docker-compose.yml` (dev) variant additionally spins up a local `mysql:8` container so development doesn't require RDS access.

---

## 9. AWS Deployment Steps

1. **RDS**: Create a MySQL 8.x instance (`db.t3.micro`, free-tier eligible), private subnet, note endpoint/port/username/password. Security group: inbound 3306 only from the EC2 instance's security group.
2. **EC2**: Launch `t2.micro`/`t3.micro` (Amazon Linux 2023 or Ubuntu), open inbound 22 (SSH, restricted IP), 80, 443. Install Docker + docker-compose plugin.
3. Clone the repo onto EC2 (or pull via CI), create `backend/.env` from `.env.example` with real RDS credentials and `JWT_SECRET`.
4. Run migrations against RDS: `npx prisma migrate deploy` (from a one-off container or locally with the RDS endpoint whitelisted temporarily), then `npx prisma db seed`.
5. `docker compose -f docker-compose.prod.yml up -d --build`.
6. (Bonus) Point a domain at the EC2 Elastic IP and add Let's Encrypt via `certbot` for HTTPS, or place behind an Application Load Balancer with ACM cert.
7. (Bonus) GitHub Actions workflow: on push to `main`, SSH into EC2, `git pull` + `docker compose up -d --build`.

---

## 10. Environment Variables

**backend/.env**
```
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://<user>:<password>@<rds-endpoint>:3306/mini_erp_crm
JWT_SECRET=<random-64-char-secret>
JWT_EXPIRES_IN=8h
SHOW_TEST_CREDENTIALS=true
CORS_ORIGIN=https://<frontend-domain>
```

**frontend/.env**
```
VITE_API_BASE_URL=https://<backend-domain>/api/v1
VITE_SHOW_TEST_CREDENTIALS=true
```

Neither file is committed; only `.env.example` counterparts are, per README instructions.

---

## 11. Validation & Error Handling Conventions

- Request validation via `zod` schemas per route, run in a `validate(schema)` middleware → `400` with field-level `errors` object on failure.
- Central `errorHandler` middleware maps known errors (`NotFoundError`, `ConflictError`, `ValidationError`) to appropriate status codes (404, 409, 400); unhandled errors → `500` with a generic message (details only logged server-side).
- Pagination convention: `?page=1&limit=20` → response includes `{ data, meta: { page, limit, total, totalPages } }`.

---

## 12. Known Assumptions

- Single-tenant system (one company), no multi-tenancy.
- "Invoice" generation from confirmed challans is out of scope for the 48-hour window; challan itself serves as the fulfillment document (noted as a limitation in the submission).
- Soft-delete only for customers; products are never hard-deleted (referenced by historical challans/movements).
- Challan `challanNumber` format: `CH-<YYYY>-<zero-padded sequence>`, generated inside the create transaction to avoid collisions.
