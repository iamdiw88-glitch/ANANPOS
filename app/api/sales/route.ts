import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiPermission } from "@/lib/api"
import { lockDocumentSeries, nextSequenceFrom, yymmdd } from "@/lib/document-number"
import { hasPermission, maxDiscountPctForRole } from "@/lib/permissions"

const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  productUnitId: z.coerce.number().int().positive(),
  customName: z.string().trim().max(120).nullable().optional(),
  customUnitName: z.string().trim().max(40).nullable().optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
})

const deliverySchema = z.object({
  deliveryAddress: z.string().trim().min(1),
  deliveryCustomerId: z.coerce.number().int().positive().nullable().optional(),
  recipientName: z.string().trim().nullable().optional(),
  recipientPhone: z.string().trim().min(1, "กรุณาระบุเบอร์ผู้รับของ"),
  recipientPhone2: z.string().trim().nullable().optional(),
  subdistrictId: z.string().trim().nullable().optional(),
  subdistrictName: z.string().trim().nullable().optional(),
  moo: z.coerce.number().int().positive().nullable().optional(),
  villageName: z.string().trim().nullable().optional(),
  landmark: z.string().trim().nullable().optional(),
  scheduledDate: z.coerce.date().nullable().optional(),
  driverName: z.string().trim().nullable().optional(),
  vehicle: z.string().trim().nullable().optional(),
  isCOD: z.coerce.boolean().default(false),
  note: z.string().trim().nullable().optional(),
})

const saleSchema = z.object({
  customerId: z.coerce.number().int().positive().nullable().optional(),
  discountAmount: z.coerce.number().min(0).default(0),
  roundingDiscount: z.coerce.boolean().default(false),
  vatAmount: z.coerce.number().min(0).default(0),
  paymentType: z.enum(["CASH", "CREDIT", "PARTIAL"]),
  paidAmount: z.coerce.number().min(0).default(0),
  docType: z.enum(["RECEIPT", "TAX_INVOICE"]).default("RECEIPT"),
  delivery: deliverySchema.nullable().optional(),
  items: z.array(saleItemSchema).min(1, "No items in cart"),
})

const roundMoney = (value: number) => Math.round(value * 100) / 100

const roundDownToNearestFive = (value: number) => {
  if (value <= 0) return 0
  const wholeBaht = Math.floor(roundMoney(value))
  return Math.floor(wholeBaht / 5) * 5
}

const getRoundingDiscount = (value: number) => roundMoney(Math.max(0, value - roundDownToNearestFive(value)))

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireApiPermission("sale:create")
    const body = await parseJsonBody(req, saleSchema)
    if (body.delivery) {
      if (!/^\d{10}$/.test(body.delivery.recipientPhone)) {
        throw new ApiError("เบอร์ผู้รับต้องเป็นตัวเลข 10 หลัก", 400)
      }
      if (body.delivery.recipientPhone2 && !/^\d{10}$/.test(body.delivery.recipientPhone2)) {
        throw new ApiError("เบอร์สำรองต้องเป็นตัวเลข 10 หลัก", 400)
      }
    }

    const newSale = await prisma.$transaction(async (tx) => {
      const customer = body.customerId
        ? await tx.customer.findFirst({ where: { id: body.customerId, isActive: true } })
        : null

      if (body.customerId && !customer) {
        throw new ApiError("ไม่พบข้อมูลลูกค้า", 400)
      }
      const isDeliveryWithTypedCustomer = !!body.delivery?.recipientName?.trim()
      const isCodDelivery = body.delivery?.isCOD === true
      const canSkipCustomerForDelivery = !!body.delivery && isDeliveryWithTypedCustomer && isCodDelivery

      if (body.paymentType === "CREDIT" && !customer) {
        throw new ApiError("ต้องเลือกลูกค้าสำหรับการขายเชื่อ", 400)
      }
      if (isCodDelivery && body.paymentType === "CREDIT") {
        throw new ApiError("บิลเก็บเงินปลายทางไม่สามารถใช้ประเภทขายเชื่อได้", 400)
      }
      if (body.paymentType === "PARTIAL" && !customer && !canSkipCustomerForDelivery) {
        throw new ApiError("ต้องเลือกลูกค้าหรือกรอกชื่อผู้รับสำหรับบิลจัดส่งจ่ายบางส่วน", 400)
      }

      const productUnitIds = [...new Set(body.items.map((item) => item.productUnitId))]
      const productUnits = await tx.productUnit.findMany({
        where: { id: { in: productUnitIds }, isActive: true },
        include: {
          product: {
            include: { stockBalance: true },
          },
          unit: true,
        },
      })
      const productUnitMap = new Map(productUnits.map((unit) => [unit.id, unit]))

      if (productUnits.length !== productUnitIds.length) {
        throw new ApiError("พบหน่วยขายที่ไม่ถูกต้องหรือถูกปิดใช้งาน", 400)
      }

      const saleItems = body.items.map((item) => {
        const productUnit = productUnitMap.get(item.productUnitId)
        if (!productUnit || productUnit.productId !== item.productId || !productUnit.product.isActive) {
          throw new ApiError("พบรายการสินค้าที่ไม่ถูกต้อง", 400)
        }

        const isMiscSaleProduct = productUnit.product.code === "MISC-001"
        const customName = !productUnit.product.isStockItem ? item.customName?.trim() || null : null
        const customUnitName = !productUnit.product.isStockItem ? item.customUnitName?.trim() || null : null

        if (isMiscSaleProduct && !customName) {
          throw new ApiError("กรุณาระบุชื่อสินค้านอกระบบ", 400)
        }

        const unitPrice = productUnit.product.isStockItem
          ? customer?.priceTier === "CONTRACTOR" && productUnit.contractorPrice != null
            ? productUnit.contractorPrice
            : productUnit.price
          : Number(item.unitPrice ?? productUnit.price)

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new ApiError("ราคาสินค้าไม่ถูกต้อง", 400)
        }

        const quantityBase = item.quantity * productUnit.conversionRate
        const lineTotal = roundMoney(item.quantity * unitPrice)

        return {
          productId: item.productId,
          productUnitId: item.productUnitId,
          customName,
          customUnitName,
          quantity: item.quantity,
          quantityBase,
          unitPrice,
          lineTotal,
          isStockItem: productUnit.product.isStockItem,
        }
      })

      const stockRequired = new Map<number, number>()
      for (const item of saleItems) {
        if (!item.isStockItem) continue
        stockRequired.set(item.productId, (stockRequired.get(item.productId) || 0) + item.quantityBase)
      }

      const stockProductIds = [...stockRequired.keys()]
      if (stockProductIds.length > 0) {
        await tx.$queryRaw`
          SELECT "productId" FROM "StockBalance"
          WHERE "productId" IN (${Prisma.join(stockProductIds)})
          FOR UPDATE
        `

        const allowNegativeStock = (await tx.setting.findUnique({ where: { key: "allowNegativeStock" } }))?.value === "true"
        if (!allowNegativeStock) {
          const balances = await tx.stockBalance.findMany({
            where: { productId: { in: stockProductIds } },
          })
          const balanceMap = new Map(balances.map((balance) => [balance.productId, balance.quantityOnHand]))

          for (const [productId, required] of stockRequired) {
            const available = balanceMap.get(productId) || 0
            if (available < required) {
              const product = productUnits.find((unit) => unit.productId === productId)?.product
              throw new ApiError(`สต็อกไม่พอ: ${product?.name || productId}`, 400)
            }
          }
        }
      }

      const subtotal = roundMoney(saleItems.reduce((sum, item) => sum + item.lineTotal, 0))
      if (body.discountAmount > subtotal) {
        throw new ApiError("ส่วนลดมากกว่ายอดสินค้า", 400)
      }
      const expectedRoundingDiscount = body.roundingDiscount ? getRoundingDiscount(subtotal) : 0
      const discountAmount = body.roundingDiscount ? expectedRoundingDiscount : roundMoney(body.discountAmount)

      if (body.roundingDiscount && Math.abs(roundMoney(body.discountAmount) - expectedRoundingDiscount) > 0.01) {
        throw new ApiError("ส่วนลดปัดเศษไม่ถูกต้อง", 400)
      }

      if (discountAmount > 0 && !body.roundingDiscount) {
        if (!hasPermission(role, "sale:discount")) {
          throw new ApiError("ไม่มีสิทธิ์ให้ส่วนลด", 403)
        }

        const discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0
        const maxDiscountPct = maxDiscountPctForRole(role)
        if (discountPct > maxDiscountPct + 0.000001) {
          throw new ApiError(`ส่วนลดสูงสุดสำหรับสิทธิ์นี้คือ ${maxDiscountPct}%`, 422)
        }
      }

      const afterDiscount = roundMoney(subtotal - discountAmount)
      const systemSettings = await tx.setting.findMany({
        where: { key: { in: ["isVatEnabled", "vatRate", "billPrefix", "billCalendarSystem", "billDateFormat"] } },
        select: { key: true, value: true },
      })
      const settingMap = new Map(systemSettings.map((setting) => [setting.key, setting.value]))
      const configuredVatRate = Number(settingMap.get("vatRate") || 0)
      const vatRate = settingMap.get("isVatEnabled") === "true" && Number.isFinite(configuredVatRate)
        ? Math.max(0, Math.min(configuredVatRate, 100)) / 100
        : 0
      const vatAmount = roundMoney(afterDiscount * vatRate)
      const grandTotal = roundMoney(afterDiscount + vatAmount)
      let paidAmount = 0
      if (isCodDelivery && body.paymentType === "CASH") {
        paidAmount = 0
      } else if (body.paymentType === "CASH") {
        paidAmount = grandTotal
      } else if (body.paymentType === "PARTIAL") {
        paidAmount = roundMoney(Math.min(body.paidAmount, grandTotal))
        if (paidAmount <= 0) {
          throw new ApiError("ยอดชำระบางส่วนต้องมากกว่า 0", 400)
        }
      }

      const status = paidAmount >= grandTotal ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"
      const creditAmount = roundMoney(grandTotal - paidAmount)
      const receivableAmount = isCodDelivery ? 0 : creditAmount

      if (customer && receivableAmount > 0 && customer.creditLimit > 0) {
        const projectedBalance = roundMoney(customer.balance + receivableAmount)
        if (projectedBalance > customer.creditLimit) {
          throw new ApiError("ยอดขายเชื่อนี้เกินวงเงินเครดิตของลูกค้า", 400)
        }
      }

      const calendar = settingMap.get("billCalendarSystem") || "AD"
      const format = settingMap.get("billDateFormat") || "YYMMDD"
      const prefixSetting = settingMap.get("billPrefix") || "INV"

      const now = new Date()
      let year = now.getFullYear()
      if (calendar === "BE") {
        year += 543
      }
      const monthStr = String(now.getMonth() + 1).padStart(2, "0")
      const dateStr = String(now.getDate()).padStart(2, "0")
      
      let datePart = ""
      if (format === "YYYYMMDD") {
        datePart = `${year}${monthStr}${dateStr}`
      } else if (format === "YYMM") {
        datePart = `${String(year).slice(-2)}${monthStr}`
      } else {
        datePart = `${String(year).slice(-2)}${monthStr}${dateStr}`
      }

      const billPrefix = `${prefixSetting}-${datePart}-`
      await lockDocumentSeries(tx, `sale:${datePart}`)
      const lastSale = await tx.sale.findFirst({
        where: { billNo: { startsWith: billPrefix } },
        orderBy: { billNo: "desc" },
        select: { billNo: true },
      })
      const billNo = `${billPrefix}${String(nextSequenceFrom(lastSale?.billNo, billPrefix)).padStart(4, "0")}`

      const sale = await tx.sale.create({
        data: {
          billNo,
          createdById: userId,
          customerId: customer?.id ?? null,
          subtotal,
          discountAmount,
          vatRate,
          vatAmount,
          grandTotal,
          paymentType: body.paymentType,
          paidAmount,
          status,
          docType: body.docType,
          items: {
            create: saleItems.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              customName: item.customName,
              customUnitName: item.customUnitName,
              quantity: item.quantity,
              quantityBase: item.quantityBase,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      })

      if (body.delivery) {
        const deliveryName = body.delivery.recipientName || customer?.name || null
        const existingDeliveryCustomer = body.delivery.deliveryCustomerId
          ? await tx.deliveryCustomer.findFirst({
              where: { id: body.delivery.deliveryCustomerId, isActive: true },
              select: { id: true },
            })
          : null

        if (body.delivery.deliveryCustomerId && !existingDeliveryCustomer) {
          throw new ApiError("ไม่พบข้อมูลลูกค้าจัดส่ง", 400)
        }

        const deliveryCustomer = deliveryName
          ? await tx.deliveryCustomer.upsert({
              where: { phone: body.delivery.recipientPhone },
              create: {
                name: deliveryName,
                phone: body.delivery.recipientPhone,
                phone2: body.delivery.recipientPhone2 || null,
                deliveryAddress: body.delivery.deliveryAddress,
                subdistrictId: body.delivery.subdistrictId || null,
                subdistrictName: body.delivery.subdistrictName || null,
                moo: body.delivery.moo ?? null,
                villageName: body.delivery.villageName || null,
                landmark: body.delivery.landmark || null,
                totalPurchased: grandTotal,
                purchaseCount: 1,
                lastPurchasedAt: sale.saleDate,
                customerId: customer?.id ?? null,
              },
              update: {
                name: deliveryName,
                phone2: body.delivery.recipientPhone2 || null,
                deliveryAddress: body.delivery.deliveryAddress,
                subdistrictId: body.delivery.subdistrictId || null,
                subdistrictName: body.delivery.subdistrictName || null,
                moo: body.delivery.moo ?? null,
                villageName: body.delivery.villageName || null,
                landmark: body.delivery.landmark || null,
                totalPurchased: { increment: grandTotal },
                purchaseCount: { increment: 1 },
                lastPurchasedAt: sale.saleDate,
                customerId: customer?.id ?? undefined,
                isActive: true,
              },
              select: { id: true },
            })
          : null

        await tx.delivery.create({
          data: {
            saleId: sale.id,
            customerId: customer?.id ?? null,
            deliveryCustomerId: deliveryCustomer?.id ?? existingDeliveryCustomer?.id ?? null,
            deliveryAddress: body.delivery.deliveryAddress,
            recipientName: deliveryName,
            recipientPhone: body.delivery.recipientPhone,
            recipientPhone2: body.delivery.recipientPhone2 || null,
            subdistrictId: body.delivery.subdistrictId || null,
            subdistrictName: body.delivery.subdistrictName || null,
            moo: body.delivery.moo ?? null,
            villageName: body.delivery.villageName || null,
            landmark: body.delivery.landmark || null,
            scheduledDate: body.delivery.scheduledDate ?? null,
            driverName: body.delivery.driverName || null,
            vehicle: body.delivery.vehicle || null,
            isCOD: body.delivery.isCOD,
            note: body.delivery.note || null,
            createdById: userId,
          },
        })
      }

      for (const item of saleItems) {
        if (!item.isStockItem) continue

        await tx.stockBalance.upsert({
          where: { productId: item.productId },
          update: { quantityOnHand: { decrement: item.quantityBase } },
          create: { productId: item.productId, quantityOnHand: -item.quantityBase },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "SALE_OUT",
            quantityBase: -Math.abs(item.quantityBase),
            refType: "SALE",
            refId: sale.id,
            createdById: userId,
          },
        })
      }

      const soldCountByProduct = new Map<number, number>()
      for (const item of saleItems) {
        soldCountByProduct.set(
          item.productId,
          (soldCountByProduct.get(item.productId) || 0) + Math.max(1, Math.round(item.quantity))
        )
      }

      for (const [productId, soldCount] of soldCountByProduct) {
        await tx.product.update({
          where: { id: productId },
          data: { soldCount: { increment: soldCount } },
        })
      }

      if (customer && receivableAmount > 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: { increment: receivableAmount } },
        })
      }

      return sale
    }, { maxWait: 10000, timeout: 20000 })

    return NextResponse.json({ success: true, saleId: newSale.id, billNo: newSale.billNo })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create sale")
  }
}
