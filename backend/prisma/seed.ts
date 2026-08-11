import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const roles = [
    { name: 'Admin User', email: 'admin@demo.local', password: 'Admin@123', role: 'ADMIN' as const },
    { name: 'Sales User', email: 'sales@demo.local', password: 'Sales@123', role: 'SALES' as const },
    { name: 'Warehouse User', email: 'warehouse@demo.local', password: 'Warehouse@123', role: 'WAREHOUSE' as const },
    { name: 'Accounts User', email: 'accounts@demo.local', password: 'Accounts@123', role: 'ACCOUNTS' as const },
  ];

  for (const u of roles) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
    console.log(`✅ Upserted user: ${u.email} (${u.role})`);
  }

  // Seed some sample products
  const products = [
    { name: 'Steel Rod 12mm', sku: 'STL-ROD-12', category: 'Steel', unitPrice: 450.0, currentStock: 500, minStockAlert: 50, location: 'Rack A1' },
    { name: 'Steel Rod 16mm', sku: 'STL-ROD-16', category: 'Steel', unitPrice: 680.0, currentStock: 300, minStockAlert: 30, location: 'Rack A2' },
    { name: 'Cement Bag 50kg', sku: 'CEM-BAG-50', category: 'Cement', unitPrice: 380.0, currentStock: 200, minStockAlert: 20, location: 'Bay B1' },
    { name: 'Binding Wire 1kg', sku: 'BND-WIR-1', category: 'Wire', unitPrice: 95.0, currentStock: 150, minStockAlert: 15, location: 'Rack C1' },
    { name: 'Sand (per cubic ft)', sku: 'SND-CUB-1', category: 'Aggregate', unitPrice: 60.0, currentStock: 1000, minStockAlert: 100, location: 'Yard D1' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    console.log(`✅ Upserted product: ${p.name}`);
  }

  // Seed sample customers
  const customers = [
    { name: 'Rajesh Kumar', mobile: '9876543210', email: 'rajesh@example.com', businessName: 'Kumar Construction', customerType: 'WHOLESALE' as const, status: 'ACTIVE' as const },
    { name: 'Priya Sharma', mobile: '9823456789', email: 'priya@example.com', businessName: 'Sharma Builders', customerType: 'RETAIL' as const, status: 'LEAD' as const },
    { name: 'Amit Patel', mobile: '9765432109', email: 'amit@example.com', businessName: 'Patel Distributors', customerType: 'DISTRIBUTOR' as const, status: 'ACTIVE' as const },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { mobile: c.mobile } });
    if (!existing) {
      await prisma.customer.create({ data: c });
      console.log(`✅ Created customer: ${c.name}`);
    }
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
