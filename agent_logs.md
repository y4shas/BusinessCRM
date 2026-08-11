# Agent Development Log — Mini ERP + CRM Operations Portal

## Session 1 — 2026-08-12

### 00:41 — Project Kickoff
- Read `Implementation.md` in full
- Tech Stack: Node.js + TypeScript + Express (backend), React + TypeScript + Vite (frontend), MySQL (Amazon RDS), Prisma ORM, JWT auth, Docker + docker-compose, Nginx
- 7 database models: User, Customer, FollowUp, Product, StockMovement, Challan, ChallanItem
- 4 user roles: ADMIN, SALES, WAREHOUSE, ACCOUNTS
- Created task tracker

### Pending Credentials
- **Amazon RDS MySQL**: endpoint, port (3306), username, password, database name
- These will be stored in `backend/.env` (not committed to git)
- Development will use a local MySQL container (docker-compose.yml dev variant)
