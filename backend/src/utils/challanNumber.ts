import prisma from './prisma';

/**
 * Generates a challan number in the format CH-YYYY-NNNNN
 * Should be called inside a transaction.
 */
export async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  const last = await prisma.challan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: 'desc' },
    select: { challanNumber: true },
  });

  let seq = 1;
  if (last) {
    const parts = last.challanNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${seq.toString().padStart(5, '0')}`;
}
