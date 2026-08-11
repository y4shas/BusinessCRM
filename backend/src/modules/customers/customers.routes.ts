import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../utils/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { NotFoundError } from '../../utils/errors';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(7),
  email: z.string().email().optional().nullable(),
  businessName: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().optional().nullable(),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const followUpSchema = z.object({
  note: z.string().min(1),
  followUpDate: z.string().datetime().optional().nullable(),
});

// GET /customers
router.get('/', authorize('ADMIN', 'SALES'), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const type = req.query.type as string | undefined;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { mobile: { contains: search } },
      { businessName: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (type) where.customerType = type;

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /customers/:id
router.get('/:id', authorize('ADMIN', 'SALES'), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: {
        include: { createdBy: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
      challans: {
        select: { id: true, challanNumber: true, status: true, totalQuantity: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!customer) throw new NotFoundError('Customer not found');
  res.json({ success: true, data: customer });
});

// POST /customers
router.post('/', authorize('ADMIN', 'SALES'), validate(customerSchema), async (req: Request, res: Response) => {
  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json({ success: true, data: customer });
});

// PUT /customers/:id
router.put('/:id', authorize('ADMIN', 'SALES'), validate(customerSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Customer not found');

  const customer = await prisma.customer.update({ where: { id }, data: req.body });
  res.json({ success: true, data: customer });
});

// DELETE /customers/:id (soft delete)
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Customer not found');

  await prisma.customer.update({ where: { id }, data: { status: 'INACTIVE' } });
  res.json({ success: true, message: 'Customer deactivated' });
});

// POST /customers/:id/follow-ups
router.post('/:id/follow-ups', authorize('ADMIN', 'SALES'), validate(followUpSchema), async (req: Request, res: Response) => {
  const customerId = parseInt(String(req.params.id), 10);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError('Customer not found');

  const { note, followUpDate } = req.body;

  const followUp = await prisma.$transaction(async (tx) => {
    const fu = await tx.followUp.create({
      data: {
        customerId,
        note,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, name: true, role: true } } },
    });

    // Update customer's follow-up date if provided
    if (followUpDate) {
      await tx.customer.update({
        where: { id: customerId },
        data: { followUpDate: new Date(followUpDate) },
      });
    }

    return fu;
  });

  res.status(201).json({ success: true, data: followUp });
});

// GET /customers/:id/follow-ups
router.get('/:id/follow-ups', authorize('ADMIN', 'SALES'), async (req: Request, res: Response) => {
  const customerId = parseInt(String(req.params.id), 10);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError('Customer not found');

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const [data, total] = await Promise.all([
    prisma.followUp.findMany({
      where: { customerId },
      include: { createdBy: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.followUp.count({ where: { customerId } }),
  ]);

  res.json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export default router;
