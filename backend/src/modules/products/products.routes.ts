import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../utils/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { NotFoundError } from '../../utils/errors';
import { upload, uploadToS3, deleteFromS3 } from '../../utils/s3';
import { paramInt } from '../../utils/paramInt';

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional().nullable(),
  unitPrice: z.number().positive(),
  currentStock: z.number().int().min(0).optional(),
  minStockAlert: z.number().int().min(0).optional(),
  location: z.string().optional().nullable(),
});

const updateProductSchema = productSchema.partial();

const stockMovementSchema = z.object({
  quantity: z.number().int().positive(),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().optional().nullable(),
});

// GET /products
router.get('/', authorize('ADMIN', 'SALES', 'WAREHOUSE'), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string | undefined;
  const category = req.query.category as string | undefined;
  const lowStock = req.query.lowStock === 'true';

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];
  }
  if (category) where.category = category;
  if (lowStock) {
    // Products where currentStock <= minStockAlert
    // Using raw SQL via Prisma for this comparison
    where.AND = [
      ...(where.AND || []),
    ];
  }

  const allProducts = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } });

  const filtered = lowStock
    ? allProducts.filter((p) => p.currentStock <= p.minStockAlert)
    : allProducts;

  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /products/:id
router.get('/:id', authorize('ADMIN', 'SALES', 'WAREHOUSE'), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      stockMoves: {
        include: { createdBy: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!product) throw new NotFoundError('Product not found');
  res.json({ success: true, data: product });
});

// POST /products
router.post('/', authorize('ADMIN', 'WAREHOUSE'), validate(productSchema), async (req: Request, res: Response) => {
  const product = await prisma.product.create({ data: req.body });
  res.status(201).json({ success: true, data: product });
});

// PUT /products/:id
router.put('/:id', authorize('ADMIN', 'WAREHOUSE'), validate(updateProductSchema), async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Product not found');

  const product = await prisma.product.update({ where: { id }, data: req.body });
  res.json({ success: true, data: product });
});

// POST /products/:id/stock-movements
router.post(
  '/:id/stock-movements',
  authorize('ADMIN', 'WAREHOUSE'),
  validate(stockMovementSchema),
  async (req: Request, res: Response) => {
    const productId = parseInt(String(req.params.id), 10);
    const { quantity, movementType, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundError('Product not found');

      const stockDelta = movementType === 'IN' ? quantity : -quantity;
      const newStock = product.currentStock + stockDelta;

      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current: ${product.currentStock}, Requested: ${quantity}`);
      }

      const [updatedProduct, movement] = await Promise.all([
        tx.product.update({
          where: { id: productId },
          data: { currentStock: newStock },
        }),
        tx.stockMovement.create({
          data: {
            productId,
            quantity,
            movementType,
            reason,
            createdById: req.user!.id,
          },
        }),
      ]);

      return { product: updatedProduct, movement };
    });

    res.status(201).json({ success: true, data: result });
  }
);

// GET /products/:id/stock-movements
router.get(
  '/:id/stock-movements',
  authorize('ADMIN', 'WAREHOUSE', 'ACCOUNTS'),
  async (req: Request, res: Response) => {
    const productId = parseInt(String(req.params.id), 10);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError('Product not found');

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId },
        include: { createdBy: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where: { productId } }),
    ]);

    res.json({
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
);

// POST /products/:id/image — upload product image to S3
router.post(
  '/:id/image',
  authorize('ADMIN', 'WAREHOUSE'),
  upload.single('image'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const id = paramInt(req, 'id');
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');

    // Delete previous image from S3 if one exists
    if (product.imageUrl) {
      await deleteFromS3(product.imageUrl);
    }

    const imageUrl = await uploadToS3(req.file, 'products');

    const updated = await prisma.product.update({
      where: { id },
      data: { imageUrl },
    });

    res.json({ success: true, data: updated });
  }
);

// DELETE /products/:id/image — remove product image
router.delete(
  '/:id/image',
  authorize('ADMIN', 'WAREHOUSE'),
  async (req: Request, res: Response) => {
    const id = paramInt(req, 'id');
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');

    if (product.imageUrl) {
      await deleteFromS3(product.imageUrl);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { imageUrl: null },
    });

    res.json({ success: true, data: updated });
  }
);

export default router;
