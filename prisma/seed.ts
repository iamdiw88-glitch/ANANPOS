import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Units
  const unitNames = ['ถุง', 'พาเลท', 'เส้น', 'มัด', 'คิว', 'ตัน', 'อัน', 'ม้วน', 'กล่อง', 'แผ่น'];
  const units: Awaited<ReturnType<typeof prisma.unit.upsert>>[] = [];
  for (const name of unitNames) {
    const unit = await prisma.unit.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    units.push(unit);
  }
  
  // 2. Seed Categories
  const categoryNames = ['ปูนซีเมนต์', 'เหล็ก', 'หิน/ทราย', 'อิฐ/บล็อก', 'กระเบื้อง', 'สี', 'ท่อ/ข้อต่อ', 'อื่นๆ'];
  const categories: Awaited<ReturnType<typeof prisma.category.upsert>>[] = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const category = await prisma.category.upsert({
      where: { name: categoryNames[i] },
      update: {},
      create: { name: categoryNames[i], sortOrder: i },
    });
    categories.push(category);
  }

  // 3. Seed User (OWNER)
  const pinHash = await bcrypt.hash('1234', 10);
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!owner) {
    await prisma.user.create({
      data: {
        name: 'เจ้าของ',
        role: 'OWNER',
        pinHash,
        isActive: true,
      },
    });
  }

  // Helper to find IDs
  const getUnitId = (name: string) => units.find((u) => u.name === name)!.id;
  const getCatId = (name: string) => categories.find((c) => c.name === name)!.id;

  // 4. Seed Products
  
  // Product 1: ปูนทีพีไอ เขียว 50กก.
  const cement = await prisma.product.upsert({
    where: { code: 'P001' },
    update: {},
    create: {
      code: 'P001',
      name: 'ปูนทีพีไอ เขียว 50กก.',
      categoryId: getCatId('ปูนซีเมนต์'),
      baseUnitId: getUnitId('ถุง'),
      reorderPoint: 100,
      isStockItem: true,
      productUnits: {
        create: [
          {
            unitId: getUnitId('ถุง'),
            conversionRate: 1,
            price: 140,
            isDefaultSale: true,
          },
          {
            unitId: getUnitId('พาเลท'),
            conversionRate: 50,
            price: 6500,
            isDefaultSale: false,
          }
        ]
      },
      stockBalance: {
        create: {
          quantityOnHand: 200
        }
      }
    }
  });

  // Product 2: เหล็กเส้น RB6
  const steel = await prisma.product.upsert({
    where: { code: 'S001' },
    update: {},
    create: {
      code: 'S001',
      name: 'เหล็กเส้น RB6',
      categoryId: getCatId('เหล็ก'),
      baseUnitId: getUnitId('เส้น'),
      reorderPoint: 200,
      isStockItem: true,
      productUnits: {
        create: [
          {
            unitId: getUnitId('เส้น'),
            conversionRate: 1,
            price: 38,
            isDefaultSale: true,
          },
          {
            unitId: getUnitId('มัด'),
            conversionRate: 100,
            price: 3600,
            isDefaultSale: false,
          }
        ]
      },
      stockBalance: {
        create: {
          quantityOnHand: 500
        }
      }
    }
  });

  // Product 3: ทรายหยาบ
  const sand = await prisma.product.upsert({
    where: { code: 'M001' },
    update: {},
    create: {
      code: 'M001',
      name: 'ทรายหยาบ',
      categoryId: getCatId('หิน/ทราย'),
      baseUnitId: getUnitId('คิว'),
      reorderPoint: 0,
      isStockItem: false,
      productUnits: {
        create: [
          {
            unitId: getUnitId('คิว'),
            conversionRate: 1,
            price: 350,
            isDefaultSale: true,
          }
        ]
      }
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
