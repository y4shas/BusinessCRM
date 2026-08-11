import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import customersRoutes from './modules/customers/customers.routes';
import productsRoutes from './modules/products/products.routes';
import challansRoutes from './modules/challans/challans.routes';
import dashboardRoutes from './modules/challans/dashboard.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── Security & Parsing Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/customers`, customersRoutes);
app.use(`${API_PREFIX}/products`, productsRoutes);
app.use(`${API_PREFIX}/challans`, challansRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
