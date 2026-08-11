import { Router, Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// GET /dashboard/summary
// All roles can access — returns role-scoped data
router.get('/summary', authenticate, async (req: Request, res: Response) => {
  const role = req.user!.role;

  // ── ADMIN: full overview ─────────────────────────────────────────────────────
  if (role === 'ADMIN') {
    const [
      totalCustomers, leadCustomers, activeCustomers, inactiveCustomers,
      totalProducts, allProducts,
      draftChallans, confirmedChallans, cancelledChallans,
      recentChallans, recentFollowUps,
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
        take: 5, orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, businessName: true } } },
      }),
      prisma.followUp.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      }),
    ]);

    const lowStockCount = allProducts.filter(p => p.currentStock <= p.minStockAlert).length;

    return res.json({
      success: true,
      role: 'ADMIN',
      data: {
        customers: {
          total: totalCustomers,
          byStatus: { LEAD: leadCustomers, ACTIVE: activeCustomers, INACTIVE: inactiveCustomers },
        },
        products: { total: totalProducts, lowStock: lowStockCount },
        challans: { DRAFT: draftChallans, CONFIRMED: confirmedChallans, CANCELLED: cancelledChallans },
        recentChallans,
        recentFollowUps,
      },
    });
  }

  // ── SALES: customers + challans ──────────────────────────────────────────────
  if (role === 'SALES') {
    const [
      totalCustomers, leadCustomers, activeCustomers,
      draftChallans, confirmedChallans,
      recentChallans, upcomingFollowUps,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'LEAD' } }),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.challan.count({ where: { status: 'DRAFT' } }),
      prisma.challan.count({ where: { status: 'CONFIRMED' } }),
      prisma.challan.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, businessName: true } } },
      }),
      prisma.followUp.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      role: 'SALES',
      data: {
        customers: { total: totalCustomers, byStatus: { LEAD: leadCustomers, ACTIVE: activeCustomers } },
        challans: { DRAFT: draftChallans, CONFIRMED: confirmedChallans },
        recentChallans,
        recentFollowUps: upcomingFollowUps,
      },
    });
  }

  // ── WAREHOUSE: inventory focus ───────────────────────────────────────────────
  if (role === 'WAREHOUSE') {
    const [allProducts, totalProducts, recentMovements, pendingChallans] = await Promise.all([
      prisma.product.findMany({ select: { currentStock: true, minStockAlert: true } }),
      prisma.product.count(),
      prisma.stockMovement.findMany({
        take: 8, orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.challan.findMany({
        where: { status: 'CONFIRMED' },
        take: 5, orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, businessName: true } } },
      }),
    ]);

    const lowStockProducts = allProducts.filter(p => p.currentStock <= p.minStockAlert).length;
    const totalStock = allProducts.reduce((s, p) => s + p.currentStock, 0);

    return res.json({
      success: true,
      role: 'WAREHOUSE',
      data: {
        products: { total: totalProducts, lowStock: lowStockProducts, totalStock },
        recentMovements,
        pendingChallans,
      },
    });
  }

  // ── ACCOUNTS: financials focus ───────────────────────────────────────────────
  if (role === 'ACCOUNTS') {
    const [
      draftChallans, confirmedChallans, cancelledChallans,
      recentChallans, allConfirmedItems,
    ] = await Promise.all([
      prisma.challan.count({ where: { status: 'DRAFT' } }),
      prisma.challan.count({ where: { status: 'CONFIRMED' } }),
      prisma.challan.count({ where: { status: 'CANCELLED' } }),
      prisma.challan.findMany({
        take: 8, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, businessName: true } },
          items: { select: { lineTotal: true } },
        },
      }),
      prisma.challanItem.findMany({
        where: { challan: { status: 'CONFIRMED' } },
        select: { lineTotal: true },
      }),
    ]);

    const totalRevenue = allConfirmedItems.reduce((s, i) => s + Number(i.lineTotal), 0);

    const challanWithTotals = recentChallans.map(c => ({
      ...c,
      total: c.items.reduce((s: number, i: any) => s + Number(i.lineTotal), 0),
    }));

    return res.json({
      success: true,
      role: 'ACCOUNTS',
      data: {
        challans: { DRAFT: draftChallans, CONFIRMED: confirmedChallans, CANCELLED: cancelledChallans },
        totalRevenue,
        recentChallans: challanWithTotals,
      },
    });
  }

  return res.json({ success: true, role, data: {} });
});

export default router;
