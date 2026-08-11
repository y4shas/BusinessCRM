import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../utils/prisma';
import { signToken } from '../../utils/jwt';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { UnauthorizedError } from '../../utils/errors';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signToken({ sub: user.id, role: user.role, email: user.email });

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

// POST /auth/logout (stateless — client discards token)
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
