import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../utils/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';
import { generateChallanNumber } from '../../utils/challanNumber';

const router = Router();
router.use(authenticate);

const challanItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createChallanSchema = z.object({
  customerId: z.number().int().positive(),
  items: z.array(challanItemSchema).min(1),
});

const updateChallanSchema = z.object({
  customerId: z.number().int().positive().optional(),
  items: z.array(challanItemSchema).min(1).optional(),
});

// GET /challans
router.get('/', authorize('ADMIN', 'SALES', 'ACCOUNTS'), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

  const where: any = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [data, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, mobile: true, businessName: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.challan.count({ where }),
  ]);

  res.json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /challans/:id
router.get('/:id', authorize('ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, role: true } },
      items: {
        include: { product: { select: { id: true, name: true, sku: true, currentStock: true } } },
      },
    },
  });
  if (!challan) throw new NotFoundError('Challan not found');
  res.json({ success: true, data: challan });
});

// POST /challans
router.post('/', authorize('ADMIN', 'SALES'), validate(createChallanSchema), async (req: Request, res: Response) => {
  const { customerId, items } = req.body;

  const challan = await prisma.$transaction(async (tx) => {
    // Verify customer exists
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundError('Customer not found');

    // Fetch all products
    const productIds = items.map((i: any) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      throw new ValidationError('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Build challan items with snapshots
    const challanItems = items.map((item: any) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = new Decimal(product.unitPrice.toString()).mul(item.quantity);
      return {
        productId: item.productId,
        quantity: item.quantity,
        productNameSnap: product.name,
        skuSnap: product.sku,
        unitPriceSnap: product.unitPrice,
        lineTotal,
      };
    });

    const totalQuantity = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
    const challanNumber = await generateChallanNumber();

    return tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        createdById: req.user!.id,
        status: 'DRAFT',
        items: { create: challanItems },
      },
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        items: true,
      },
    });
  });

  res.status(201).json({ success: true, data: challan });
});

// PUT /challans/:id (only DRAFT)
router.put('/:id', authorize('ADMIN', 'SALES'), validate(updateChallanSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const { customerId, items } = req.body;

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Challan not found');
    if (existing.status !== 'DRAFT') throw new ConflictError('Only DRAFT challans can be edited');

    if (customerId) {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new NotFoundError('Customer not found');
    }

    if (items) {
      // Delete existing items
      await tx.challanItem.deleteMany({ where: { challanId: id } });

      const productIds = items.map((i: any) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) throw new ValidationError('One or more products not found');

      const productMap = new Map(products.map((p) => [p.id, p]));
      const challanItems = items.map((item: any) => {
        const product = productMap.get(item.productId)!;
        const lineTotal = new Decimal(product.unitPrice.toString()).mul(item.quantity);
        return {
          challanId: id,
          productId: item.productId,
          quantity: item.quantity,
          productNameSnap: product.name,
          skuSnap: product.sku,
          unitPriceSnap: product.unitPrice,
          lineTotal,
        };
      });

      await tx.challanItem.createMany({ data: challanItems });
      const totalQuantity = items.reduce((sum: number, i: any) => sum + i.quantity, 0);

      return tx.challan.update({
        where: { id },
        data: {
          customerId: customerId || existing.customerId,
          totalQuantity,
        },
        include: { customer: true, items: true },
      });
    }

    return tx.challan.update({
      where: { id },
      data: { customerId: customerId || existing.customerId },
      include: { customer: true, items: true },
    });
  });

  res.json({ success: true, data: updated });
});

// POST /challans/:id/confirm
router.post('/:id/confirm', authorize('ADMIN', 'SALES'), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);

  const confirmed = await prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) throw new NotFoundError('Challan not found');
    if (challan.status !== 'DRAFT') throw new ConflictError(`Challan is already ${challan.status}`);

    // Lock and verify stock for each item
    const insufficientItems: any[] = [];

    for (const item of challan.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || product.currentStock < item.quantity) {
        insufficientItems.push({
          productId: item.productId,
          productName: item.productNameSnap,
          required: item.quantity,
          available: product?.currentStock ?? 0,
        });
      }
    }

    if (insufficientItems.length > 0) {
      throw new ConflictError('Insufficient stock for one or more items');
    }

    // Deduct stock and create movements
    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          movementType: 'OUT',
          reason: `Challan ${challan.challanNumber} confirmed`,
          createdById: req.user!.id,
        },
      });
    }

    return tx.challan.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { customer: true, items: { include: { product: true } }, createdBy: { select: { id: true, name: true } } },
    });
  });

  res.json({ success: true, data: confirmed });
});

// POST /challans/:id/cancel
router.post('/:id/cancel', authorize('ADMIN', 'SALES'), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);

  const cancelled = await prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) throw new NotFoundError('Challan not found');
    if (challan.status === 'CANCELLED') throw new ConflictError('Challan is already cancelled');

    // If was CONFIRMED, reverse stock
    if (challan.status === 'CONFIRMED') {
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'IN',
            reason: `Challan ${challan.challanNumber} cancelled`,
            createdById: req.user!.id,
          },
        });
      }
    }

    return tx.challan.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { customer: true, items: true },
    });
  });

  res.json({ success: true, data: cancelled });
});

export default router;
