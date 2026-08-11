import { Router, Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// GET /dashboard/summary
router.get('/summary', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const [
    totalCustomers,
    leadCustomers,
    activeCustomers,
    inactiveCustomers,
    totalProducts,
    allProducts,
    draftChallans,
    confirmedChallans,
    cancelledChallans,
    recentChallans,
    recentFollowUps,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: 'LEAD' } }),
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
    prisma.customer.count({ where: { status: 'INACTIVE' } }),
    prisma.product.count(),
    prisma.product.findMany({ select: { currentStock: true, minStockAlert: true } }),
    prisma.challan.count({ where: { status: 'DRAFT' } }),
    prisma.challan.count({ where: { status: 'CONFIRMED' } }),
    prisma.challan.count({ where: { status: 'CANCELLED' } }),
    prisma.challan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, businessName: true } } },
    }),
    prisma.followUp.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const lowStockCount = allProducts.filter((p) => p.currentStock <= p.minStockAlert).length;

  res.json({
    success: true,
    data: {
      customers: {
        total: totalCustomers,
        byStatus: { LEAD: leadCustomers, ACTIVE: activeCustomers, INACTIVE: inactiveCustomers },
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
      },
      challans: {
        DRAFT: draftChallans,
        CONFIRMED: confirmedChallans,
        CANCELLED: cancelledChallans,
      },
      recentChallans,
      recentFollowUps,
    },
  });
});

export default router;
