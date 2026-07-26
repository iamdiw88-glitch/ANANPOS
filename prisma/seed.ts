import { PrismaClient, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const DAY_MS = 24 * 60 * 60 * 1000
let seed = 424242

function random() {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function randInt(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min
}

function pick<T>(items: T[]) {
  return items[randInt(0, items.length - 1)]
}

function chance(rate: number) {
  return random() < rate
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function dateDaysAgo(days: number, hour = 9) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, randInt(0, 59), 0, 0)
  return date
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function dateOnly(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function yymmdd(date: Date) {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yy}${mm}${dd}`
}

function nextDoc(prefix: string, date: Date, counters: Map<string, number>) {
  const key = `${prefix}-${yymmdd(date)}`
  const next = (counters.get(key) || 0) + 1
  counters.set(key, next)
  return `${key}-${String(next).padStart(4, "0")}`
}

async function clearBusinessData() {
  await prisma.returnItem.deleteMany()
  await prisma.return.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoiceSale.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.delivery.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.stockBalance.deleteMany()
  await prisma.productUnit.deleteMany()
  await prisma.product.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.category.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.attendanceLog.deleteMany()
  await prisma.dieselStockLedger.deleteMany()
  await prisma.fuelLog.deleteMany()
  await prisma.maintenanceLog.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.deliveryCustomer.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.user.deleteMany()
  await prisma.setting.deleteMany()
}

async function main() {
  console.log("Resetting ANANPOS business data...")
  await clearBusinessData()

  const pinHash = await bcrypt.hash("1234", 10)
  const [ownerUser, staffUser, cashierUser] = await Promise.all([
    prisma.user.create({ data: { name: "เจ้าของร้าน", role: "OWNER", pinHash, isActive: true } }),
    prisma.user.create({ data: { name: "ผู้จัดการร้าน", role: "STAFF", pinHash, isActive: true } }),
    prisma.user.create({ data: { name: "แคชเชียร์", role: "CASHIER", pinHash, isActive: true } }),
  ])
  const users = [ownerUser, staffUser, cashierUser]

  await prisma.setting.createMany({
    data: [
      { key: "isVatEnabled", value: "true" },
      { key: "vatRate", value: "7" },
      { key: "allowNegativeStock", value: "false" },
      { key: "storeName", value: "ANAN วัสดุก่อสร้าง" },
    ],
  })

  const unitNames = ["ถุง", "พาเลท", "เส้น", "มัด", "คิว", "ตัน", "อัน", "ม้วน", "กล่อง", "แผ่น", "ถัง", "รายการ"]
  const units = new Map<string, Awaited<ReturnType<typeof prisma.unit.create>>>()
  for (const name of unitNames) {
    units.set(name, await prisma.unit.create({ data: { name } }))
  }

  const categoryNames = ["ปูนซีเมนต์", "เหล็ก", "หิน/ทราย", "อิฐ/บล็อก", "กระเบื้อง", "สี", "ท่อ/ข้อต่อ", "อื่นๆ"]
  const categories = new Map<string, Awaited<ReturnType<typeof prisma.category.create>>>()
  for (let index = 0; index < categoryNames.length; index++) {
    const name = categoryNames[index]
    categories.set(name, await prisma.category.create({ data: { name, sortOrder: index } }))
  }

  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { code: "SUP-001", name: "เชียงรายซีเมนต์", phone: "0811111111", address: "อ.เมือง เชียงราย" } }),
    prisma.supplier.create({ data: { code: "SUP-002", name: "สหเหล็กภาคเหนือ", phone: "0822222222", address: "อ.เทิง เชียงราย" } }),
    prisma.supplier.create({ data: { code: "SUP-003", name: "แม่ลาววัสดุ", phone: "0833333333", address: "อ.แม่ลาว เชียงราย" } }),
  ])

  const productSeeds = [
    {
      code: "CEM-001",
      name: "ปูนทีพีไอ เขียว 50 กก.",
      category: "ปูนซีเมนต์",
      baseUnit: "ถุง",
      openingStock: 1800,
      reorderPoint: 250,
      cost: 118,
      units: [
        { unit: "ถุง", conversionRate: 1, price: 145, contractorPrice: 138, isDefaultSale: true },
        { unit: "พาเลท", conversionRate: 50, price: 7000, contractorPrice: 6800, isDefaultSale: false },
      ],
    },
    {
      code: "CEM-002",
      name: "ปูนเสือ 50 กก.",
      category: "ปูนซีเมนต์",
      baseUnit: "ถุง",
      openingStock: 1400,
      reorderPoint: 200,
      cost: 112,
      units: [{ unit: "ถุง", conversionRate: 1, price: 138, contractorPrice: 132, isDefaultSale: true }],
    },
    {
      code: "STL-006",
      name: "เหล็กเส้น RB6",
      category: "เหล็ก",
      baseUnit: "เส้น",
      openingStock: 4500,
      reorderPoint: 500,
      cost: 29,
      units: [
        { unit: "เส้น", conversionRate: 1, price: 38, contractorPrice: 35, isDefaultSale: true },
        { unit: "มัด", conversionRate: 100, price: 3600, contractorPrice: 3400, isDefaultSale: false },
      ],
    },
    {
      code: "STL-012",
      name: "เหล็กข้ออ้อย DB12",
      category: "เหล็ก",
      baseUnit: "เส้น",
      openingStock: 1600,
      reorderPoint: 180,
      cost: 112,
      units: [{ unit: "เส้น", conversionRate: 1, price: 138, contractorPrice: 130, isDefaultSale: true }],
    },
    {
      code: "SND-001",
      name: "ทรายหยาบ",
      category: "หิน/ทราย",
      baseUnit: "คิว",
      openingStock: 0,
      reorderPoint: 0,
      cost: 300,
      isStockItem: false,
      units: [{ unit: "คิว", conversionRate: 1, price: 380, contractorPrice: 350, isDefaultSale: true }],
    },
    {
      code: "STN-001",
      name: "หิน 3/4",
      category: "หิน/ทราย",
      baseUnit: "คิว",
      openingStock: 0,
      reorderPoint: 0,
      cost: 420,
      isStockItem: false,
      units: [{ unit: "คิว", conversionRate: 1, price: 520, contractorPrice: 490, isDefaultSale: true }],
    },
    {
      code: "BLK-001",
      name: "บล็อกคอนกรีต 7 ซม.",
      category: "อิฐ/บล็อก",
      baseUnit: "อัน",
      openingStock: 12000,
      reorderPoint: 1200,
      cost: 5.5,
      units: [{ unit: "อัน", conversionRate: 1, price: 8, contractorPrice: 7.5, isDefaultSale: true }],
    },
    {
      code: "PVC-004",
      name: "ท่อ PVC 4 นิ้ว",
      category: "ท่อ/ข้อต่อ",
      baseUnit: "เส้น",
      openingStock: 850,
      reorderPoint: 120,
      cost: 142,
      units: [{ unit: "เส้น", conversionRate: 1, price: 185, contractorPrice: 175, isDefaultSale: true }],
    },
    {
      code: "PNT-001",
      name: "สีทาภายนอก 15 ลิตร",
      category: "สี",
      baseUnit: "ถัง",
      openingStock: 220,
      reorderPoint: 35,
      cost: 620,
      units: [{ unit: "ถัง", conversionRate: 1, price: 790, contractorPrice: 760, isDefaultSale: true }],
    },
    {
      code: "ROOF-001",
      name: "กระเบื้องลอนคู่",
      category: "กระเบื้อง",
      baseUnit: "แผ่น",
      openingStock: 3000,
      reorderPoint: 400,
      cost: 39,
      units: [{ unit: "แผ่น", conversionRate: 1, price: 55, contractorPrice: 52, isDefaultSale: true }],
    },
  ]

  const productRows: Array<{
    product: Awaited<ReturnType<typeof prisma.product.create>>
    defaultUnit: Awaited<ReturnType<typeof prisma.productUnit.create>>
    cost: number
  }> = []

  for (const seedProduct of productSeeds) {
    const product = await prisma.product.create({
      data: {
        code: seedProduct.code,
        name: seedProduct.name,
        categoryId: categories.get(seedProduct.category)!.id,
        baseUnitId: units.get(seedProduct.baseUnit)!.id,
        reorderPoint: seedProduct.reorderPoint,
        isStockItem: seedProduct.isStockItem ?? true,
        stockBalance: seedProduct.isStockItem === false ? undefined : { create: { quantityOnHand: seedProduct.openingStock } },
      },
    })

    let defaultUnit = null as Awaited<ReturnType<typeof prisma.productUnit.create>> | null
    for (const unitSeed of seedProduct.units) {
      const productUnit = await prisma.productUnit.create({
        data: {
          productId: product.id,
          unitId: units.get(unitSeed.unit)!.id,
          conversionRate: unitSeed.conversionRate,
          price: unitSeed.price,
          contractorPrice: unitSeed.contractorPrice,
          isDefaultSale: unitSeed.isDefaultSale,
        },
      })
      if (unitSeed.isDefaultSale) defaultUnit = productUnit
    }

    if (product.isStockItem) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "ADJUST",
          quantityBase: seedProduct.openingStock,
          unitCost: seedProduct.cost,
          refType: "ADJUSTMENT",
          note: "ยอดยกมาตั้งต้นจาก seed จำลอง 2 เดือน",
          createdById: ownerUser.id,
          createdAt: dateDaysAgo(60, 8),
        },
      })
    }

    productRows.push({ product, defaultUnit: defaultUnit!, cost: seedProduct.cost })
  }

  const miscProduct = await prisma.product.create({
    data: {
      code: "MISC-001",
      name: "สินค้านอกระบบ",
      searchTags: "สินค้าทั่วไป จิปาถะ อื่นๆ misc",
      categoryId: categories.get("อื่นๆ")!.id,
      baseUnitId: units.get("รายการ")!.id,
      reorderPoint: 0,
      isStockItem: false,
      isActive: true,
    },
  })
  await prisma.productUnit.create({
    data: {
      productId: miscProduct.id,
      unitId: units.get("รายการ")!.id,
      conversionRate: 1,
      price: 0,
      contractorPrice: null,
      isDefaultSale: true,
      isActive: true,
    },
  })

  const employees = await Promise.all([
    prisma.employee.create({ data: { employeeCode: "EMP-001", name: "อนันต์ เจ้าของร้าน", nickname: "อนันต์", role: "OWNER", position: "เจ้าของร้าน", phone: "0812345001", startDate: dateDaysAgo(400), avatarColor: "#2563EB", userId: ownerUser.id } }),
    prisma.employee.create({ data: { employeeCode: "EMP-002", name: "มาลี ผู้จัดการ", nickname: "มาลี", role: "MANAGER", position: "ผู้จัดการร้าน", phone: "0812345002", startDate: dateDaysAgo(300), avatarColor: "#0F766E", userId: staffUser.id } }),
    prisma.employee.create({ data: { employeeCode: "EMP-003", name: "กานต์ แคชเชียร์", nickname: "กานต์", role: "STAFF", position: "แคชเชียร์", phone: "0812345003", startDate: dateDaysAgo(260), avatarColor: "#7C3AED", userId: cashierUser.id } }),
    prisma.employee.create({ data: { employeeCode: "EMP-004", name: "ชัย คนขับรถ", nickname: "ชัย", role: "DRIVER", employeeType: "driver", position: "คนขับรถบรรทุก", phone: "0812345004", startDate: dateDaysAgo(220), avatarColor: "#EA580C" } }),
    prisma.employee.create({ data: { employeeCode: "EMP-005", name: "นัท คนขับรถ", nickname: "นัท", role: "DRIVER", employeeType: "driver", position: "คนขับรถกระบะ", phone: "0812345005", startDate: dateDaysAgo(200), avatarColor: "#16A34A" } }),
    prisma.employee.create({ data: { employeeCode: "EMP-006", name: "เอก โฟคลิฟท์", nickname: "เอก", role: "STAFF", position: "พนักงานคลัง/โฟคลิฟท์", phone: "0812345006", startDate: dateDaysAgo(180), avatarColor: "#475569" } }),
    prisma.employee.create({ data: { employeeCode: "EMP-007", name: "ฝน ฝ่ายขาย", nickname: "ฝน", role: "STAFF", position: "ฝ่ายขาย", phone: "0812345007", startDate: dateDaysAgo(150), avatarColor: "#DB2777" } }),
    prisma.employee.create({ data: { employeeCode: "EMP-008", name: "บอล รถตัก", nickname: "บอล", role: "STAFF", position: "พนักงานรถตัก", phone: "0812345008", startDate: dateDaysAgo(120), avatarColor: "#0891B2" } }),
  ])
  const drivers = employees.filter((employee) => employee.role === "DRIVER")

  const attendanceRows: Prisma.AttendanceLogCreateManyInput[] = []
  /*
  const saleRows: Prisma.SaleCreateManyInput[] = []
  const saleItemDrafts: Array<{
    billNo: string
    productId: number
    productUnitId: number
    quantity: number
    quantityBase: number
    unitPrice: number
    lineTotal: number
  }> = []
  const deliveryDrafts: Array<{ billNo: string; data: Omit<Prisma.DeliveryCreateManyInput, "saleId"> }> = []
  const invoiceDrafts: Array<{ billNo: string; invoiceNo: string; amount: number; data: Prisma.InvoiceCreateManyInput }> = []
  const paymentDrafts: Array<{ invoiceNo: string; data: Omit<Prisma.PaymentCreateManyInput, "invoiceId"> }> = []
  const stockMovementDrafts: Array<Omit<Prisma.StockMovementCreateManyInput, "refId"> & { billNo: string }> = []
  const returnDrafts: Array<{
    billNo: string
    customerId: number | null
    item: { productId: number; productUnitId: number; unitPrice: number; quantity: number; quantityBase: number }
  }> = []
  const inUseVehicleIds = new Set<number>()

  for (let day = 59; day >= 0; day--) {
    const salesCount = randInt(day % 7 === 0 ? 1 : 1, day % 7 === 0 ? 2 : 3)

    for (let index = 0; index < salesCount; index++) {
      const saleDate = dateDaysAgo(day, randInt(8, 17))
      const billNo = nextDoc("INV", saleDate, saleCounters)
      const customer = chance(0.68) ? pick(customers) : null
      const createdById = pick(users).id
      const itemCount = randInt(1, 4)
      const selectedProducts = [...productRows].sort(() => random() - 0.5).slice(0, itemCount)
      const saleItems = selectedProducts.map((row) => {
        let quantity = 1
        if (row.product.code.startsWith("CEM")) quantity = randInt(5, 80)
        else if (row.product.code.startsWith("STL")) quantity = randInt(5, 120)
        else if (row.product.code.startsWith("BLK")) quantity = randInt(80, 1200)
        else if (row.product.code.startsWith("SND") || row.product.code.startsWith("STN")) quantity = randInt(1, 9)
        else quantity = randInt(1, 35)

        const unitPrice = customer?.priceTier === "CONTRACTOR" && row.defaultUnit.contractorPrice != null ? row.defaultUnit.contractorPrice : row.defaultUnit.price
        return {
          row,
          quantity,
          quantityBase: quantity * row.defaultUnit.conversionRate,
          unitPrice,
          lineTotal: roundMoney(quantity * unitPrice),
        }
      })

      const subtotal = roundMoney(saleItems.reduce((sum, item) => sum + item.lineTotal, 0))
      const discountAmount = chance(0.18) ? roundMoney((subtotal * randInt(1, 4)) / 100) : 0
      const afterDiscount = roundMoney(subtotal - discountAmount)
      const vatRate = chance(0.35) ? 0.07 : 0
      const vatAmount = roundMoney(afterDiscount * vatRate)
      const grandTotal = roundMoney(afterDiscount + vatAmount)

      let paymentType: "CASH" | "CREDIT" | "PARTIAL" = "CASH"
      if (customer?.type === "CREDIT" && chance(0.62)) paymentType = chance(0.25) ? "PARTIAL" : "CREDIT"
      else if (customer && chance(0.12)) paymentType = "PARTIAL"

      const initialPaid = paymentType === "CASH" ? grandTotal : paymentType === "PARTIAL" ? roundMoney((grandTotal * randInt(35, 65)) / 100) : 0
      let laterPaid = 0
      const receivable = roundMoney(grandTotal - initialPaid)
      if (receivable > 0 && day > 12 && chance(0.42)) {
        laterPaid = chance(0.62) ? receivable : roundMoney((receivable * randInt(30, 75)) / 100)
      }
      const paidAmount = roundMoney(initialPaid + laterPaid)
      const saleStatus = paidAmount >= grandTotal ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"

      saleRows.push({
        billNo,
        customerId: customer?.id ?? null,
        saleDate,
        subtotal,
        discountAmount,
        vatRate,
        vatAmount,
        grandTotal,
        paymentType,
        paidAmount,
        status: saleStatus,
        docType: vatRate > 0 ? "TAX_INVOICE" : "RECEIPT",
        createdById,
        createdAt: saleDate,
      })

      for (const item of saleItems) {
        saleItemDrafts.push({
          billNo,
          productId: item.row.product.id,
          productUnitId: item.row.defaultUnit.id,
          quantity: item.quantity,
          quantityBase: item.quantityBase,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })
        soldCounts.set(item.row.product.id, (soldCounts.get(item.row.product.id) || 0) + Math.max(1, Math.round(item.quantity)))
        if (item.row.product.isStockItem) {
          stockDeltas.set(item.row.product.id, (stockDeltas.get(item.row.product.id) || 0) + item.quantityBase)
          stockMovementDrafts.push({
            billNo,
            productId: item.row.product.id,
            movementType: "SALE_OUT",
            quantityBase: -Math.abs(item.quantityBase),
            refType: "SALE",
            createdById,
            createdAt: saleDate,
          })
        }
      }

      if (customer && receivable > 0) {
        const dueDate = addDays(saleDate, customer.creditTermDays || 30)
        const invoiceBalance = roundMoney(receivable - laterPaid)
        const invoiceNo = nextDoc("AR", saleDate, invoiceCounters)
        invoiceDrafts.push({
          billNo,
          invoiceNo,
          amount: receivable,
          data: {
            invoiceNo,
            customerId: customer.id,
            invoiceDate: saleDate,
            dueDate,
            totalAmount: receivable,
            paidAmount: laterPaid,
            balance: invoiceBalance,
            status: invoiceBalance <= 0 ? "PAID" : laterPaid > 0 ? "PARTIAL" : "OPEN",
            createdById: staffUser.id,
            createdAt: saleDate,
          },
        })
        if (laterPaid > 0) {
          const paymentDate = addDays(saleDate, randInt(5, 18))
          paymentDrafts.push({
            invoiceNo,
            data: {
              paymentNo: nextDoc("PAY", paymentDate, paymentCounters),
              customerId: customer.id,
              amount: laterPaid,
              method: pick(["CASH", "TRANSFER", "CHEQUE"] as const),
              paymentDate,
              reference: chance(0.55) ? `REF${randInt(10000, 99999)}` : null,
              createdById: cashierUser.id,
              createdAt: paymentDate,
            },
          })
        }
        customerBalance.set(customer.id, roundMoney((customerBalance.get(customer.id) || 0) + invoiceBalance))
      }

      if (chance(0.52)) {
        const isNamed = customer || chance(0.78)
        const profile = isNamed ? pick(deliveryProfiles) : null
        let deliveryCustomerId: number | null = null
        const recipientName = customer?.name || profile?.name || null
        const recipientPhone = customer?.phone || profile?.phone || `09${randInt(10000000, 99999999)}`
        const address = customer?.address || profile?.address || "ลูกค้าหน้าร้าน ไม่ระบุชื่อ ฝากส่งหน้างาน"

        if (recipientName) {
          const deliveryCustomer = deliveryCustomerByPhone.get(recipientPhone)
          if (deliveryCustomer) {
            deliveryCustomerId = deliveryCustomer.id
            const current = deliveryCustomerTotals.get(deliveryCustomer.id) || {
              totalPurchased: 0,
              purchaseCount: 0,
              lastPurchasedAt: saleDate,
              customerId: customer?.id,
            }
            deliveryCustomerTotals.set(deliveryCustomer.id, {
              totalPurchased: roundMoney(current.totalPurchased + grandTotal),
              purchaseCount: current.purchaseCount + 1,
              lastPurchasedAt: saleDate > current.lastPurchasedAt ? saleDate : current.lastPurchasedAt,
              customerId: customer?.id ?? current.customerId,
            })
          }
        }

        const deliveryStatus = day <= 2 && chance(0.35) ? "IN_TRANSIT" : day <= 1 && chance(0.3) ? "PENDING" : chance(0.04) ? "FAILED" : "DELIVERED"
        const vehicle = pick(deliveryVehicles)
        const driver = pick(drivers)
        if (deliveryStatus === "IN_TRANSIT") inUseVehicleIds.add(vehicle.id)

        deliveryDrafts.push({
          billNo,
          data: {
            customerId: customer?.id,
            deliveryCustomerId,
            deliveryAddress: address,
            recipientName,
            recipientPhone,
            recipientPhone2: profile?.phone2,
            subdistrictName: profile?.subdistrictName,
            moo: profile?.moo,
            villageName: profile?.villageName,
            scheduledDate: addDays(saleDate, randInt(0, 2)),
            status: deliveryStatus,
            driverName: driver.nickname || driver.name,
            driverId: driver.id,
            vehicle: vehicle.plateNumber,
            vehicleId: vehicle.id,
            deliveredAt: deliveryStatus === "DELIVERED" ? addDays(saleDate, randInt(0, 3)) : null,
            isCOD: paymentType === "CASH" && chance(0.22),
            cashExpectedAmount: paymentType === "CASH" ? grandTotal : null,
            cashActualAmount: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? grandTotal : null,
            cashSettledAt: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? addDays(saleDate, randInt(1, 4)) : null,
            cashSettledById: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? cashierUser.id : null,
            createdById,
            createdAt: saleDate,
          },
        })
      }

      if (saleItems[0] && chance(0.04)) {
        returnDrafts.push({
          billNo,
          customerId: customer?.id ?? null,
          item: {
            productId: saleItems[0].row.product.id,
            productUnitId: saleItems[0].row.defaultUnit.id,
            unitPrice: saleItems[0].unitPrice,
            quantity: Math.max(1, Math.floor(saleItems[0].quantity * 0.15)),
            quantityBase: Math.max(1, Math.floor(saleItems[0].quantityBase * 0.15)),
          },
        })
      }
    }
  }

  if (saleRows.length > 0) {
    await prisma.sale.createMany({ data: saleRows })
  }
  const createdSales = await prisma.sale.findMany({
    where: { billNo: { in: saleRows.map((sale) => sale.billNo) } },
    select: { id: true, billNo: true },
  })
  const saleIdByBillNo = new Map(createdSales.map((sale) => [sale.billNo, sale.id]))

  if (saleItemDrafts.length > 0) {
    await prisma.saleItem.createMany({
      data: saleItemDrafts.map((item) => ({
        saleId: saleIdByBillNo.get(item.billNo)!,
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        quantityBase: item.quantityBase,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    })
  }

  if (deliveryDrafts.length > 0) {
    await prisma.delivery.createMany({
      data: deliveryDrafts.map((delivery) => ({
        saleId: saleIdByBillNo.get(delivery.billNo)!,
        ...delivery.data,
      })),
    })
  }

  if (invoiceDrafts.length > 0) {
    await prisma.invoice.createMany({ data: invoiceDrafts.map((invoice) => invoice.data) })
    const createdInvoices = await prisma.invoice.findMany({
      where: { invoiceNo: { in: invoiceDrafts.map((invoice) => invoice.invoiceNo) } },
      select: { id: true, invoiceNo: true },
    })
    const invoiceIdByNo = new Map(createdInvoices.map((invoice) => [invoice.invoiceNo, invoice.id]))
    await prisma.invoiceSale.createMany({
      data: invoiceDrafts.map((invoice) => ({
        invoiceId: invoiceIdByNo.get(invoice.invoiceNo)!,
        saleId: saleIdByBillNo.get(invoice.billNo)!,
        amount: invoice.amount,
      })),
    })
    if (paymentDrafts.length > 0) {
      await prisma.payment.createMany({
        data: paymentDrafts.map((payment) => ({
          invoiceId: invoiceIdByNo.get(payment.invoiceNo)!,
          ...payment.data,
        })),
      })
    }
  }

  for (const draft of stockMovementDrafts) {
    const { billNo, ...movement } = draft
    stockMovementRows.push({ ...movement, refId: saleIdByBillNo.get(billNo)! })
  }

  for (const draft of returnDrafts) {
    const saleId = saleIdByBillNo.get(draft.billNo)
    if (saleId) returnableSales.push({ saleId, customerId: draft.customerId, item: draft.item })
  }

  await Promise.all(
    Array.from(inUseVehicleIds, (id) =>
      prisma.vehicle.update({
        where: { id },
        data: { status: "IN_USE" },
      }),
    ),
  )

  */
  for (let day = 59; day >= 0; day--) {
    const date = dateDaysAgo(day)
    const weekday = date.getDay()
    if (weekday === 0 && !chance(0.35)) continue

    for (const employee of employees) {
      if (!chance(weekday === 0 ? 0.45 : 0.92)) continue
      const checkIn = dateDaysAgo(day, randInt(7, 9))
      const checkOut = new Date(checkIn.getTime() + randInt(8, 10) * 60 * 60 * 1000 + randInt(0, 45) * 60 * 1000)
      attendanceRows.push({
        employeeId: employee.id,
        date: dateOnly(date),
        checkIn,
        checkOut,
        workMinutes: Math.round((checkOut.getTime() - checkIn.getTime()) / 60000),
        method: "MANUAL",
        recordedById: staffUser.id,
      })
    }
  }
  await prisma.attendanceLog.createMany({ data: attendanceRows })

  const vehicles = await Promise.all([
    prisma.vehicle.create({ data: { vehicleCode: "VH-001", plateNumber: "บจ 1234 เชียงราย", vehicleType: "TRUCK", brand: "Isuzu", model: "NPR", year: 2562, color: "ขาว", insuranceExpiry: addDays(new Date(), 80), taxExpiry: addDays(new Date(), 120), inspectionExpiry: addDays(new Date(), 65) } }),
    prisma.vehicle.create({ data: { vehicleCode: "VH-002", plateNumber: "กข 5678 เชียงราย", vehicleType: "PICKUP", brand: "Toyota", model: "Revo", year: 2564, color: "เทา", insuranceExpiry: addDays(new Date(), 35), taxExpiry: addDays(new Date(), 90), inspectionExpiry: addDays(new Date(), 100) } }),
    prisma.vehicle.create({ data: { vehicleCode: "VH-003", plateNumber: "1กค 9988 เชียงราย", vehicleType: "MOTORCYCLE", brand: "Honda", model: "Wave", year: 2563, color: "แดง", insuranceExpiry: addDays(new Date(), 20), taxExpiry: addDays(new Date(), 45), inspectionExpiry: addDays(new Date(), 45) } }),
    prisma.vehicle.create({ data: { vehicleCode: "VH-004", plateNumber: "FORK-01", vehicleType: "FORKLIFT", brand: "Toyota", model: "8FD", year: 2560, color: "ส้ม", status: "AVAILABLE" } }),
    prisma.vehicle.create({ data: { vehicleCode: "VH-005", plateNumber: "LOAD-01", vehicleType: "LOADER", brand: "Komatsu", model: "WA100", year: 2559, color: "เหลือง", status: "AVAILABLE" } }),
    prisma.vehicle.create({ data: { vehicleCode: "VH-006", plateNumber: "LIFT-01", vehicleType: "LIFT", brand: "Nissan", model: "Lift", year: 2561, color: "น้ำเงิน", status: "AVAILABLE" } }),
  ])
  const deliveryVehicles = vehicles.filter((vehicle) => ["TRUCK", "PICKUP", "MOTORCYCLE"].includes(vehicle.vehicleType))

  const customers = await Promise.all([
    prisma.customer.create({ data: { code: "CUS-001", name: "ร้านช่างเอก", phone: "0815551001", address: "ต.ตับเต่า อ.เทิง", type: "CREDIT", creditLimit: 80000, creditTermDays: 30, priceTier: "CONTRACTOR" } }),
    prisma.customer.create({ data: { code: "CUS-002", name: "โครงการบ้านแม่ลอย", phone: "0815551002", address: "ต.แม่ลอย อ.เทิง", type: "CREDIT", creditLimit: 120000, creditTermDays: 30, priceTier: "CONTRACTOR" } }),
    prisma.customer.create({ data: { code: "CUS-003", name: "หจก.เชียงคำก่อสร้าง", phone: "0815551003", address: "อ.เชียงคำ", type: "CREDIT", creditLimit: 150000, creditTermDays: 45, priceTier: "CONTRACTOR" } }),
    prisma.customer.create({ data: { code: "CUS-004", name: "คุณสมชาย ใจดี", phone: "0815551004", address: "ต.เวียง อ.เทิง", type: "CASH", creditLimit: 0, creditTermDays: 0, priceTier: "RETAIL" } }),
    prisma.customer.create({ data: { code: "CUS-005", name: "ร้านวัสดุบ้านใหม่", phone: "0815551005", address: "ต.หงาว อ.เทิง", type: "CREDIT", creditLimit: 60000, creditTermDays: 30, priceTier: "CONTRACTOR" } }),
    prisma.customer.create({ data: { code: "CUS-006", name: "คุณมานะ รับเหมา", phone: "0815551006", address: "ต.งิ้ว อ.เทิง", type: "CASH", creditLimit: 0, creditTermDays: 0, priceTier: "CONTRACTOR" } }),
  ])

  const deliveryProfiles = [
    { name: "คุณสมชาย ใจดี", phone: "0911111001", phone2: "0921111001", address: "หมู่ 4 บ้านใหม่ ต.ตับเต่า อ.เทิง", subdistrictName: "ตับเต่า", moo: 4, villageName: "บ้านใหม่" },
    { name: "คุณลำดวน", phone: "0911111002", address: "หมู่ 7 บ้านห้วยไคร้ ต.หงาว อ.เทิง", subdistrictName: "หงาว", moo: 7, villageName: "บ้านห้วยไคร้" },
    { name: "ช่างเปี๊ยก", phone: "0911111003", address: "หมู่ 2 บ้านป่าตาล ต.เวียง อ.เทิง", subdistrictName: "เวียง", moo: 2, villageName: "บ้านป่าตาล" },
    { name: "ป้าเดือน", phone: "0911111004", address: "หมู่ 5 บ้านแม่ลอย ต.แม่ลอย อ.เทิง", subdistrictName: "แม่ลอย", moo: 5, villageName: "บ้านแม่ลอย" },
    { name: "คุณนพดล", phone: "0911111005", address: "หมู่ 3 บ้านร่องแช่ ต.งิ้ว อ.เทิง", subdistrictName: "งิ้ว", moo: 3, villageName: "บ้านร่องแช่" },
  ]

  const deliveryCustomerByPhone = new Map<string, Awaited<ReturnType<typeof prisma.deliveryCustomer.create>>>()
  const deliveryCustomerTotals = new Map<number, { totalPurchased: number; purchaseCount: number; lastPurchasedAt: Date; customerId?: number | null }>()

  for (const customer of customers) {
    if (!customer.phone || !customer.address) continue
    const deliveryCustomer = await prisma.deliveryCustomer.create({
      data: {
        name: customer.name,
        phone: customer.phone,
        deliveryAddress: customer.address,
        customerId: customer.id,
      },
    })
    deliveryCustomerByPhone.set(customer.phone, deliveryCustomer)
  }

  for (const profile of deliveryProfiles) {
    const deliveryCustomer = await prisma.deliveryCustomer.create({
      data: {
        name: profile.name,
        phone: profile.phone,
        phone2: profile.phone2,
        deliveryAddress: profile.address,
        subdistrictName: profile.subdistrictName,
        moo: profile.moo,
        villageName: profile.villageName,
      },
    })
    deliveryCustomerByPhone.set(profile.phone, deliveryCustomer)
  }

  const saleCounters = new Map<string, number>()
  const invoiceCounters = new Map<string, number>()
  const paymentCounters = new Map<string, number>()
  const purchaseCounters = new Map<string, number>()
  const returnCounters = new Map<string, number>()
  const customerBalance = new Map<number, number>()
  const soldCounts = new Map<number, number>()
  const stockDeltas = new Map<number, number>()
  const stockMovementRows: Prisma.StockMovementCreateManyInput[] = []
  const returnableSales: Array<{ saleId: number; customerId: number | null; item: { productId: number; productUnitId: number; unitPrice: number; quantity: number; quantityBase: number } }> = []

  for (let day = 59; day >= 0; day--) {
    const purchaseDate = dateDaysAgo(day, 10)
    if (day % 14 === 0 || chance(0.08)) {
      const supplier = pick(suppliers)
      const purchaseItems = productRows
        .filter((row) => row.product.isStockItem && chance(0.45))
        .slice(0, randInt(2, 3))

      if (purchaseItems.length > 0) {
        let subtotal = 0
        const purchase = await prisma.purchase.create({
          data: {
            purchaseNo: nextDoc("PO", purchaseDate, purchaseCounters),
            supplierId: supplier.id,
            purchaseDate,
            subtotal: 0,
            total: 0,
            status: "RECEIVED",
            createdById: staffUser.id,
            createdAt: purchaseDate,
          },
        })

        for (const row of purchaseItems) {
          const quantity = row.product.code.startsWith("CEM") ? randInt(120, 280) : row.product.code.startsWith("BLK") ? randInt(800, 1800) : randInt(40, 220)
          const lineTotal = roundMoney(quantity * row.cost)
          subtotal += lineTotal
          await prisma.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              productId: row.product.id,
              productUnitId: row.defaultUnit.id,
              quantity,
              unitCost: row.cost,
              lineTotal,
            },
          })
          await prisma.stockBalance.update({
            where: { productId: row.product.id },
            data: { quantityOnHand: { increment: quantity * row.defaultUnit.conversionRate } },
          })
          await prisma.stockMovement.create({
            data: {
              productId: row.product.id,
              movementType: "PURCHASE_IN",
              quantityBase: quantity * row.defaultUnit.conversionRate,
              unitCost: row.cost,
              refType: "PURCHASE",
              refId: purchase.id,
              createdById: staffUser.id,
              createdAt: purchaseDate,
            },
          })
        }

        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { subtotal: roundMoney(subtotal), total: roundMoney(subtotal) },
        })
      }
    }
  }

  const saleRows: Prisma.SaleCreateManyInput[] = []
  const saleItemDrafts: Array<{
    billNo: string
    productId: number
    productUnitId: number
    quantity: number
    quantityBase: number
    unitPrice: number
    lineTotal: number
  }> = []
  const deliveryDrafts: Array<{ billNo: string; data: Omit<Prisma.DeliveryCreateManyInput, "saleId"> }> = []
  const invoiceDrafts: Array<{ billNo: string; invoiceNo: string; amount: number; data: Prisma.InvoiceCreateManyInput }> = []
  const paymentDrafts: Array<{ invoiceNo: string; data: Omit<Prisma.PaymentCreateManyInput, "invoiceId"> }> = []
  const stockMovementDrafts: Array<Omit<Prisma.StockMovementCreateManyInput, "refId"> & { billNo: string }> = []
  const returnDrafts: Array<{
    billNo: string
    customerId: number | null
    item: { productId: number; productUnitId: number; unitPrice: number; quantity: number; quantityBase: number }
  }> = []
  const inUseVehicleIds = new Set<number>()

  for (let day = 59; day >= 0; day--) {
    const salesCount = randInt(day % 7 === 0 ? 1 : 1, day % 7 === 0 ? 2 : 3)

    for (let index = 0; index < salesCount; index++) {
      const saleDate = dateDaysAgo(day, randInt(8, 17))
      const billNo = nextDoc("INV", saleDate, saleCounters)
      const customer = chance(0.68) ? pick(customers) : null
      const createdById = pick(users).id
      const itemCount = randInt(1, 4)
      const selectedProducts = [...productRows].sort(() => random() - 0.5).slice(0, itemCount)
      const saleItems = selectedProducts.map((row) => {
        let quantity = 1
        if (row.product.code.startsWith("CEM")) quantity = randInt(5, 80)
        else if (row.product.code.startsWith("STL")) quantity = randInt(5, 120)
        else if (row.product.code.startsWith("BLK")) quantity = randInt(80, 1200)
        else if (row.product.code.startsWith("SND") || row.product.code.startsWith("STN")) quantity = randInt(1, 9)
        else quantity = randInt(1, 35)

        const unitPrice = customer?.priceTier === "CONTRACTOR" && row.defaultUnit.contractorPrice != null ? row.defaultUnit.contractorPrice : row.defaultUnit.price
        return {
          row,
          quantity,
          quantityBase: quantity * row.defaultUnit.conversionRate,
          unitPrice,
          lineTotal: roundMoney(quantity * unitPrice),
        }
      })

      const subtotal = roundMoney(saleItems.reduce((sum, item) => sum + item.lineTotal, 0))
      const discountAmount = chance(0.18) ? roundMoney((subtotal * randInt(1, 4)) / 100) : 0
      const afterDiscount = roundMoney(subtotal - discountAmount)
      const vatRate = chance(0.35) ? 0.07 : 0
      const vatAmount = roundMoney(afterDiscount * vatRate)
      const grandTotal = roundMoney(afterDiscount + vatAmount)

      let paymentType: "CASH" | "CREDIT" | "PARTIAL" = "CASH"
      if (customer?.type === "CREDIT" && chance(0.62)) paymentType = chance(0.25) ? "PARTIAL" : "CREDIT"
      else if (customer && chance(0.12)) paymentType = "PARTIAL"

      const initialPaid = paymentType === "CASH" ? grandTotal : paymentType === "PARTIAL" ? roundMoney((grandTotal * randInt(35, 65)) / 100) : 0
      let laterPaid = 0
      const receivable = roundMoney(grandTotal - initialPaid)
      if (receivable > 0 && day > 12 && chance(0.42)) {
        laterPaid = chance(0.62) ? receivable : roundMoney((receivable * randInt(30, 75)) / 100)
      }
      const paidAmount = roundMoney(initialPaid + laterPaid)
      const saleStatus = paidAmount >= grandTotal ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"

      saleRows.push({
        billNo,
        customerId: customer?.id ?? null,
        saleDate,
        subtotal,
        discountAmount,
        vatRate,
        vatAmount,
        grandTotal,
        paymentType,
        paidAmount,
        status: saleStatus,
        docType: vatRate > 0 ? "TAX_INVOICE" : "RECEIPT",
        createdById,
        createdAt: saleDate,
      })

      for (const item of saleItems) {
        saleItemDrafts.push({
          billNo,
          productId: item.row.product.id,
          productUnitId: item.row.defaultUnit.id,
          quantity: item.quantity,
          quantityBase: item.quantityBase,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })
        soldCounts.set(item.row.product.id, (soldCounts.get(item.row.product.id) || 0) + Math.max(1, Math.round(item.quantity)))
        if (item.row.product.isStockItem) {
          stockDeltas.set(item.row.product.id, (stockDeltas.get(item.row.product.id) || 0) + item.quantityBase)
          stockMovementDrafts.push({
            billNo,
            productId: item.row.product.id,
            movementType: "SALE_OUT",
            quantityBase: -Math.abs(item.quantityBase),
            refType: "SALE",
            createdById,
            createdAt: saleDate,
          })
        }
      }

      if (customer && receivable > 0) {
        const dueDate = addDays(saleDate, customer.creditTermDays || 30)
        const invoiceBalance = roundMoney(receivable - laterPaid)
        const invoiceNo = nextDoc("AR", saleDate, invoiceCounters)
        invoiceDrafts.push({
          billNo,
          invoiceNo,
          amount: receivable,
          data: {
            invoiceNo,
            customerId: customer.id,
            invoiceDate: saleDate,
            dueDate,
            totalAmount: receivable,
            paidAmount: laterPaid,
            balance: invoiceBalance,
            status: invoiceBalance <= 0 ? "PAID" : laterPaid > 0 ? "PARTIAL" : "OPEN",
            createdById: staffUser.id,
            createdAt: saleDate,
          },
        })
        if (laterPaid > 0) {
          const paymentDate = addDays(saleDate, randInt(5, 18))
          paymentDrafts.push({
            invoiceNo,
            data: {
              paymentNo: nextDoc("PAY", paymentDate, paymentCounters),
              customerId: customer.id,
              amount: laterPaid,
              method: pick(["CASH", "TRANSFER", "CHEQUE"] as const),
              paymentDate,
              reference: chance(0.55) ? `REF${randInt(10000, 99999)}` : null,
              createdById: cashierUser.id,
              createdAt: paymentDate,
            },
          })
        }
        customerBalance.set(customer.id, roundMoney((customerBalance.get(customer.id) || 0) + invoiceBalance))
      }

      if (chance(0.52)) {
        const isNamed = customer || chance(0.78)
        const profile = isNamed ? pick(deliveryProfiles) : null
        let deliveryCustomerId: number | null = null
        const recipientName = customer?.name || profile?.name || null
        const recipientPhone = customer?.phone || profile?.phone || `09${randInt(10000000, 99999999)}`
        const address = customer?.address || profile?.address || "ลูกค้าหน้าร้าน ไม่ระบุชื่อ ฝากส่งหน้างาน"

        if (recipientName) {
          const deliveryCustomer = deliveryCustomerByPhone.get(recipientPhone)
          if (deliveryCustomer) {
            deliveryCustomerId = deliveryCustomer.id
            const current = deliveryCustomerTotals.get(deliveryCustomer.id) || {
              totalPurchased: 0,
              purchaseCount: 0,
              lastPurchasedAt: saleDate,
              customerId: customer?.id,
            }
            deliveryCustomerTotals.set(deliveryCustomer.id, {
              totalPurchased: roundMoney(current.totalPurchased + grandTotal),
              purchaseCount: current.purchaseCount + 1,
              lastPurchasedAt: saleDate > current.lastPurchasedAt ? saleDate : current.lastPurchasedAt,
              customerId: customer?.id ?? current.customerId,
            })
          }
        }

        const deliveryStatus = day <= 2 && chance(0.35) ? "IN_TRANSIT" : day <= 1 && chance(0.3) ? "PENDING" : chance(0.04) ? "FAILED" : "DELIVERED"
        const vehicle = pick(deliveryVehicles)
        const driver = pick(drivers)
        if (deliveryStatus === "IN_TRANSIT") inUseVehicleIds.add(vehicle.id)

        deliveryDrafts.push({
          billNo,
          data: {
            customerId: customer?.id,
            deliveryCustomerId,
            deliveryAddress: address,
            recipientName,
            recipientPhone,
            recipientPhone2: profile?.phone2,
            subdistrictName: profile?.subdistrictName,
            moo: profile?.moo,
            villageName: profile?.villageName,
            scheduledDate: addDays(saleDate, randInt(0, 2)),
            status: deliveryStatus,
            driverName: driver.nickname || driver.name,
            driverId: driver.id,
            vehicle: vehicle.plateNumber,
            vehicleId: vehicle.id,
            deliveredAt: deliveryStatus === "DELIVERED" ? addDays(saleDate, randInt(0, 3)) : null,
            isCOD: paymentType === "CASH" && chance(0.22),
            cashExpectedAmount: paymentType === "CASH" ? grandTotal : null,
            cashActualAmount: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? grandTotal : null,
            cashSettledAt: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? addDays(saleDate, randInt(1, 4)) : null,
            cashSettledById: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? cashierUser.id : null,
            createdById,
            createdAt: saleDate,
          },
        })
      }

      if (saleItems[0] && chance(0.04)) {
        returnDrafts.push({
          billNo,
          customerId: customer?.id ?? null,
          item: {
            productId: saleItems[0].row.product.id,
            productUnitId: saleItems[0].row.defaultUnit.id,
            unitPrice: saleItems[0].unitPrice,
            quantity: Math.max(1, Math.floor(saleItems[0].quantity * 0.15)),
            quantityBase: Math.max(1, Math.floor(saleItems[0].quantityBase * 0.15)),
          },
        })
      }
    }
  }

  if (saleRows.length > 0) {
    await prisma.sale.createMany({ data: saleRows })
  }
  const createdSales = await prisma.sale.findMany({
    where: { billNo: { in: saleRows.map((sale) => sale.billNo) } },
    select: { id: true, billNo: true },
  })
  const saleIdByBillNo = new Map(createdSales.map((sale) => [sale.billNo, sale.id]))

  if (saleItemDrafts.length > 0) {
    await prisma.saleItem.createMany({
      data: saleItemDrafts.map((item) => ({
        saleId: saleIdByBillNo.get(item.billNo)!,
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        quantityBase: item.quantityBase,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    })
  }

  if (deliveryDrafts.length > 0) {
    await prisma.delivery.createMany({
      data: deliveryDrafts.map((delivery) => ({
        saleId: saleIdByBillNo.get(delivery.billNo)!,
        ...delivery.data,
      })),
    })
  }

  if (invoiceDrafts.length > 0) {
    await prisma.invoice.createMany({ data: invoiceDrafts.map((invoice) => invoice.data) })
    const createdInvoices = await prisma.invoice.findMany({
      where: { invoiceNo: { in: invoiceDrafts.map((invoice) => invoice.invoiceNo) } },
      select: { id: true, invoiceNo: true },
    })
    const invoiceIdByNo = new Map(createdInvoices.map((invoice) => [invoice.invoiceNo, invoice.id]))
    await prisma.invoiceSale.createMany({
      data: invoiceDrafts.map((invoice) => ({
        invoiceId: invoiceIdByNo.get(invoice.invoiceNo)!,
        saleId: saleIdByBillNo.get(invoice.billNo)!,
        amount: invoice.amount,
      })),
    })
    if (paymentDrafts.length > 0) {
      await prisma.payment.createMany({
        data: paymentDrafts.map((payment) => ({
          invoiceId: invoiceIdByNo.get(payment.invoiceNo)!,
          ...payment.data,
        })),
      })
    }
  }

  for (const draft of stockMovementDrafts) {
    const { billNo, ...movement } = draft
    stockMovementRows.push({ ...movement, refId: saleIdByBillNo.get(billNo)! })
  }

  for (const draft of returnDrafts) {
    const saleId = saleIdByBillNo.get(draft.billNo)
    if (saleId) returnableSales.push({ saleId, customerId: draft.customerId, item: draft.item })
  }

  await Promise.all(
    Array.from(inUseVehicleIds, (id) =>
      prisma.vehicle.update({
        where: { id },
        data: { status: "IN_USE" },
      }),
    ),
  )

  if (process.env.ANANPOS_LEGACY_SEED === "1") {
  for (let day = 59; day >= 0; day--) {
    const salesCount = randInt(day % 7 === 0 ? 1 : 1, day % 7 === 0 ? 2 : 3)

    for (let index = 0; index < salesCount; index++) {
      const saleDate = dateDaysAgo(day, randInt(8, 17))
      const customer = chance(0.68) ? pick(customers) : null
      const itemCount = randInt(1, 4)
      const selectedProducts = [...productRows].sort(() => random() - 0.5).slice(0, itemCount)
      const saleItems = selectedProducts.map((row) => {
        let quantity = 1
        if (row.product.code.startsWith("CEM")) quantity = randInt(5, 80)
        else if (row.product.code.startsWith("STL")) quantity = randInt(5, 120)
        else if (row.product.code.startsWith("BLK")) quantity = randInt(80, 1200)
        else if (row.product.code.startsWith("SND") || row.product.code.startsWith("STN")) quantity = randInt(1, 9)
        else quantity = randInt(1, 35)

        const unitPrice = customer?.priceTier === "CONTRACTOR" && row.defaultUnit.contractorPrice != null ? row.defaultUnit.contractorPrice : row.defaultUnit.price
        return {
          row,
          quantity,
          quantityBase: quantity * row.defaultUnit.conversionRate,
          unitPrice,
          lineTotal: roundMoney(quantity * unitPrice),
        }
      })

      const subtotal = roundMoney(saleItems.reduce((sum, item) => sum + item.lineTotal, 0))
      const discountAmount = chance(0.18) ? roundMoney(subtotal * randInt(1, 4) / 100) : 0
      const afterDiscount = roundMoney(subtotal - discountAmount)
      const vatRate = chance(0.35) ? 0.07 : 0
      const vatAmount = roundMoney(afterDiscount * vatRate)
      const grandTotal = roundMoney(afterDiscount + vatAmount)

      let paymentType: "CASH" | "CREDIT" | "PARTIAL" = "CASH"
      if (customer?.type === "CREDIT" && chance(0.62)) paymentType = chance(0.25) ? "PARTIAL" : "CREDIT"
      else if (customer && chance(0.12)) paymentType = "PARTIAL"

      const initialPaid = paymentType === "CASH" ? grandTotal : paymentType === "PARTIAL" ? roundMoney(grandTotal * randInt(35, 65) / 100) : 0
      let laterPaid = 0
      const receivable = roundMoney(grandTotal - initialPaid)
      if (receivable > 0 && day > 12 && chance(0.42)) {
        laterPaid = chance(0.62) ? receivable : roundMoney(receivable * randInt(30, 75) / 100)
      }
      const paidAmount = roundMoney(initialPaid + laterPaid)
      const saleStatus = paidAmount >= grandTotal ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"

      const sale = await prisma.sale.create({
        data: {
          billNo: nextDoc("INV", saleDate, saleCounters),
          customerId: customer?.id ?? null,
          saleDate,
          subtotal,
          discountAmount,
          vatRate,
          vatAmount,
          grandTotal,
          paymentType,
          paidAmount,
          status: saleStatus,
          docType: vatRate > 0 ? "TAX_INVOICE" : "RECEIPT",
          createdById: pick(users).id,
          createdAt: saleDate,
          items: {
            create: saleItems.map((item) => ({
              productId: item.row.product.id,
              productUnitId: item.row.defaultUnit.id,
              quantity: item.quantity,
              quantityBase: item.quantityBase,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
      })

      for (const item of saleItems) {
        soldCounts.set(item.row.product.id, (soldCounts.get(item.row.product.id) || 0) + Math.max(1, Math.round(item.quantity)))
        if (item.row.product.isStockItem) {
          stockDeltas.set(item.row.product.id, (stockDeltas.get(item.row.product.id) || 0) + item.quantityBase)
          stockMovementRows.push({
            productId: item.row.product.id,
            movementType: "SALE_OUT",
            quantityBase: -Math.abs(item.quantityBase),
            refType: "SALE",
            refId: sale.id,
            createdById: sale.createdById,
            createdAt: saleDate,
          })
        }
      }

      if (customer && receivable > 0) {
        const dueDate = addDays(saleDate, customer.creditTermDays || 30)
        const invoiceBalance = roundMoney(receivable - laterPaid)
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNo: nextDoc("AR", saleDate, invoiceCounters),
            customerId: customer.id,
            invoiceDate: saleDate,
            dueDate,
            totalAmount: receivable,
            paidAmount: laterPaid,
            balance: invoiceBalance,
            status: invoiceBalance <= 0 ? "PAID" : laterPaid > 0 ? "PARTIAL" : "OPEN",
            createdById: staffUser.id,
            createdAt: saleDate,
            invoiceSales: { create: { saleId: sale.id, amount: receivable } },
          },
        })
        if (laterPaid > 0) {
          await prisma.payment.create({
            data: {
              paymentNo: nextDoc("PAY", addDays(saleDate, randInt(5, 18)), paymentCounters),
              customerId: customer.id,
              invoiceId: invoice.id,
              amount: laterPaid,
              method: pick(["CASH", "TRANSFER", "CHEQUE"] as const),
              paymentDate: addDays(saleDate, randInt(5, 18)),
              reference: chance(0.55) ? `REF${randInt(10000, 99999)}` : null,
              createdById: cashierUser.id,
            },
          })
        }
        customerBalance.set(customer.id, roundMoney((customerBalance.get(customer.id) || 0) + invoiceBalance))
      }

      if (chance(0.52)) {
        const isNamed = customer || chance(0.78)
        const profile = isNamed ? pick(deliveryProfiles) : null
        let deliveryCustomerId: number | null = null
        const recipientName = customer?.name || profile?.name || null
        const recipientPhone = customer?.phone || profile?.phone || `09${randInt(10000000, 99999999)}`
        const address = customer?.address || profile?.address || "ลูกค้าหน้าร้าน ไม่ระบุชื่อ ฝากส่งหน้างาน"

        if (recipientName) {
          let deliveryCustomer = deliveryCustomerByPhone.get(recipientPhone)
          if (!deliveryCustomer) {
            deliveryCustomer = await prisma.deliveryCustomer.create({
              data: {
                name: recipientName,
                phone: recipientPhone,
                phone2: profile?.phone2,
                deliveryAddress: address,
                subdistrictName: profile?.subdistrictName,
                moo: profile?.moo,
                villageName: profile?.villageName,
                customerId: customer?.id,
              },
            })
            deliveryCustomerByPhone.set(recipientPhone, deliveryCustomer)
          }
          deliveryCustomerId = deliveryCustomer.id
          const current = deliveryCustomerTotals.get(deliveryCustomer.id) || {
            totalPurchased: 0,
            purchaseCount: 0,
            lastPurchasedAt: saleDate,
            customerId: customer?.id,
          }
          deliveryCustomerTotals.set(deliveryCustomer.id, {
            totalPurchased: roundMoney(current.totalPurchased + grandTotal),
            purchaseCount: current.purchaseCount + 1,
            lastPurchasedAt: saleDate > current.lastPurchasedAt ? saleDate : current.lastPurchasedAt,
            customerId: customer?.id ?? current.customerId,
          })
        }

        const deliveryStatus = day <= 2 && chance(0.35) ? "IN_TRANSIT" : day <= 1 && chance(0.3) ? "PENDING" : chance(0.04) ? "FAILED" : "DELIVERED"
        const vehicle = pick(deliveryVehicles)
        const driver = pick(drivers)
        if (deliveryStatus === "IN_TRANSIT") {
          await prisma.vehicle.update({ where: { id: vehicle.id }, data: { status: "IN_USE" } })
        }

        await prisma.delivery.create({
          data: {
            saleId: sale.id,
            customerId: customer?.id,
            deliveryCustomerId,
            deliveryAddress: address,
            recipientName,
            recipientPhone,
            recipientPhone2: profile?.phone2,
            subdistrictName: profile?.subdistrictName,
            moo: profile?.moo,
            villageName: profile?.villageName,
            scheduledDate: addDays(saleDate, randInt(0, 2)),
            status: deliveryStatus,
            driverName: driver.nickname || driver.name,
            driverId: driver.id,
            vehicle: vehicle.plateNumber,
            vehicleId: vehicle.id,
            deliveredAt: deliveryStatus === "DELIVERED" ? addDays(saleDate, randInt(0, 3)) : null,
            isCOD: paymentType === "CASH" && chance(0.22),
            cashExpectedAmount: paymentType === "CASH" ? grandTotal : null,
            cashActualAmount: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? grandTotal : null,
            cashSettledAt: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? addDays(saleDate, randInt(1, 4)) : null,
            cashSettledById: paymentType === "CASH" && deliveryStatus === "DELIVERED" ? cashierUser.id : null,
            createdById: sale.createdById,
            createdAt: saleDate,
          },
        })
      }

      if (saleItems[0] && chance(0.04)) {
        returnableSales.push({
          saleId: sale.id,
          customerId: customer?.id ?? null,
          item: {
            productId: saleItems[0].row.product.id,
            productUnitId: saleItems[0].row.defaultUnit.id,
            unitPrice: saleItems[0].unitPrice,
            quantity: Math.max(1, Math.floor(saleItems[0].quantity * 0.15)),
            quantityBase: Math.max(1, Math.floor(saleItems[0].quantityBase * 0.15)),
          },
        })
      }
    }
  }

  }

  if (stockMovementRows.length > 0) {
    await prisma.stockMovement.createMany({ data: stockMovementRows })
  }

  await Promise.all([
    ...Array.from(stockDeltas, ([productId, quantityBase]) =>
      prisma.stockBalance.update({
        where: { productId },
        data: { quantityOnHand: { decrement: quantityBase } },
      }),
    ),
    ...Array.from(soldCounts, ([productId, soldCount]) =>
      prisma.product.update({
        where: { id: productId },
        data: { soldCount: { increment: soldCount } },
      }),
    ),
    ...Array.from(deliveryCustomerTotals, ([id, totals]) =>
      prisma.deliveryCustomer.update({
        where: { id },
        data: {
          totalPurchased: totals.totalPurchased,
          purchaseCount: totals.purchaseCount,
          lastPurchasedAt: totals.lastPurchasedAt,
          customerId: totals.customerId ?? undefined,
        },
      }),
    ),
  ])

  for (const [customerId, balance] of customerBalance) {
    await prisma.customer.update({ where: { id: customerId }, data: { balance } })
  }

  for (const item of returnableSales.slice(0, 8)) {
    const returnDate = addDays(dateDaysAgo(randInt(2, 45), 14), randInt(0, 1))
    const totalRefund = roundMoney(item.item.quantity * item.item.unitPrice)
    const returnRow = await prisma.return.create({
      data: {
        returnNo: nextDoc("RTN", returnDate, returnCounters),
        originalSaleId: item.saleId,
        customerId: item.customerId,
        returnDate,
        reason: pick(["DAMAGED", "WRONG_ITEM", "CUSTOMER_RETURN"] as const),
        totalRefund,
        refundMethod: "CASH",
        createdById: staffUser.id,
        createdAt: returnDate,
      },
    })
    await prisma.returnItem.create({
      data: {
        returnId: returnRow.id,
        productId: item.item.productId,
        productUnitId: item.item.productUnitId,
        quantity: item.item.quantity,
        quantityBase: item.item.quantityBase,
        restock: true,
        unitPrice: item.item.unitPrice,
        lineTotal: totalRefund,
      },
    })
    await prisma.stockBalance.upsert({
      where: { productId: item.item.productId },
      update: { quantityOnHand: { increment: item.item.quantityBase } },
      create: { productId: item.item.productId, quantityOnHand: item.item.quantityBase },
    })
    await prisma.stockMovement.create({
      data: {
        productId: item.item.productId,
        movementType: "RETURN_IN",
        quantityBase: item.item.quantityBase,
        refType: "RETURN",
        refId: returnRow.id,
        createdById: staffUser.id,
        createdAt: returnDate,
      },
    })
  }

  let dieselBalance = new Prisma.Decimal(1000)
  await prisma.dieselStockLedger.create({
    data: {
      type: "OPENING",
      liters: dieselBalance,
      balanceAfter: dieselBalance,
      recordedAt: dateDaysAgo(60, 8),
      note: "ยอดตั้งต้นน้ำมันดีเซล",
      createdById: ownerUser.id,
    },
  })

  const dieselCompanies = ["เชียงรายดีเซล", "พีทีบริการน้ำมัน", "สหชัยพลังงาน", "ล้านนาน้ำมัน"]
  for (let day = 55; day >= 0; day--) {
    const fuelDate = dateDaysAgo(day, 8)
    if (day % 14 === 0) {
      const liters = new Prisma.Decimal(randInt(650, 900))
      dieselBalance = dieselBalance.add(liters)
      await prisma.dieselStockLedger.create({
        data: {
          type: "IN",
          liters,
          balanceAfter: dieselBalance,
          companyName: pick(dieselCompanies),
          employeeId: pick(employees).id,
          recordedAt: fuelDate,
          createdById: staffUser.id,
        },
      })
    }

    if (day % 3 === 0 || chance(0.18)) {
      const vehicle = pick(vehicles)
      const employee = vehicle.vehicleType === "LOADER" ? employees.find((item) => item.nickname === "บอล")! : vehicle.vehicleType === "FORKLIFT" ? employees.find((item) => item.nickname === "เอก")! : pick(drivers)
      const liters = new Prisma.Decimal(vehicle.vehicleType === "TRUCK" ? randInt(55, 110) : vehicle.vehicleType === "LOADER" ? randInt(45, 95) : randInt(10, 45))
      if (dieselBalance.sub(liters).lt(0)) {
        const refill = new Prisma.Decimal(800)
        dieselBalance = dieselBalance.add(refill)
        await prisma.dieselStockLedger.create({
          data: {
            type: "IN",
            liters: refill,
            balanceAfter: dieselBalance,
            companyName: pick(dieselCompanies),
            employeeId: staffUser.id,
            recordedAt: fuelDate,
            createdById: staffUser.id,
            note: "เติมเพิ่มระหว่างรอบจำลอง",
          },
        })
      }

      const fuelLog = await prisma.fuelLog.create({
        data: {
          vehicleId: vehicle.id,
          driverId: employee.id,
          liters,
          fuelDate,
          note: "เติมจากสต็อกดีเซลกลาง",
          createdById: staffUser.id,
          createdAt: fuelDate,
        },
      })
      dieselBalance = dieselBalance.sub(liters)
      await prisma.dieselStockLedger.create({
        data: {
          type: "OUT",
          liters,
          balanceAfter: dieselBalance,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          fuelLogId: fuelLog.id,
          recordedAt: fuelDate,
          createdById: staffUser.id,
        },
      })
    }
  }

  await prisma.maintenanceLog.createMany({
    data: [
      { vehicleId: vehicles[0].id, type: "SERVICE", description: "ถ่ายน้ำมันเครื่องและตรวจเบรก", cost: new Prisma.Decimal(4200), date: dateDaysAgo(42, 11), createdById: staffUser.id },
      { vehicleId: vehicles[3].id, type: "REPAIR", description: "เปลี่ยนสายไฮดรอลิกโฟคลิฟท์", cost: new Prisma.Decimal(6800), date: dateDaysAgo(20, 15), completedAt: dateDaysAgo(18, 16), createdById: staffUser.id },
      { vehicleId: vehicles[4].id, type: "SERVICE", description: "เช็คระบบตักและจาระบี", cost: new Prisma.Decimal(3500), date: dateDaysAgo(12, 10), createdById: staffUser.id },
    ],
  })

  const counts = await Promise.all([
    prisma.sale.count(),
    prisma.delivery.count(),
    prisma.employee.count(),
    prisma.vehicle.count(),
    prisma.customer.count(),
    prisma.deliveryCustomer.count(),
  ])

  console.log("Seed completed successfully!")
  console.log(`Sales: ${counts[0]}, Deliveries: ${counts[1]}, Employees: ${counts[2]}, Vehicles: ${counts[3]}, Customers: ${counts[4]}, Delivery customers: ${counts[5]}`)
  console.log("Login PIN for seeded users: 1234")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
