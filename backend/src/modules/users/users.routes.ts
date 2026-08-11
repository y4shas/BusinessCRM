import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../utils/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { NotFoundError } from '../../utils/errors';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']).optional(),
});

// GET /users
router.get('/', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: users });
});

// POST /users
router.post('/', validate(createUserSchema), async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  res.status(201).json({ success: true, data: user });
});

// PATCH /users/:id
router.patch('/:id', validate(updateUserSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const { name, email, password, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('User not found');

  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true },
  });
  res.json({ success: true, data: user });
});

// PATCH /users/:id/deactivate
router.patch('/:id/deactivate', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('User not found');

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  res.json({ success: true, data: user });
});

export default router;
