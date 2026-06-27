import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { lockDocumentSeries, nextSequenceFrom, yymmdd } from "@/lib/document-number"

const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  productUnitId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
})

const saleSchema = z.object({
  customerId: z.coerce.number().int().positive().nullable().optional(),
  discountAmount: z.coerce.number().min(0).default(0),
  vatAmount: z.coerce.number().min(0).default(0),
  paymentType: z.enum(["CASH", "CREDIT", "PARTIAL"]),
  paidAmount: z.coerce.number().min(0).default(0),
  docType: z.enum(["RECEIPT", "TAX_INVOICE"]).default("RECEIPT"),
  items: z.array(saleItemSchema).min(1, "No items in cart"),
})

const roundMoney = (value: number) => Math.round(value * 100) / 100

export async function POST(req: Request) {
  try {
    const { userId } = await requireApiSession()
    const body = await parseJsonBody(req, saleSchema)

    const newSale = await prisma.$transaction(async (tx) => {
      const customer = body.customerId
        ? await tx.customer.findFirst({ where: { id: body.customerId, isActive: true } })
        : null

      if (body.customerId && !customer) {
        throw new ApiError("ไม่พบข้อมูลลูกค้า", 400)
      }
      if ((body.paymentType === "CREDIT" || body.paymentType === "PARTIAL") && !customer) {
        throw new ApiError("ต้องเลือกลูกค้าสำหรับการขายเชื่อ", 400)
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

      const afterDiscount = roundMoney(subtotal - body.discountAmount)
      const requestedVat = body.vatAmount > 0
      const vatRateSetting = await tx.setting.findUnique({ where: { key: "vatRate" } })
      const vatRate = requestedVat ? Number(vatRateSetting?.value || 7) / 100 : 0
      const vatAmount = roundMoney(afterDiscount * vatRate)
      const grandTotal = roundMoney(afterDiscount + vatAmount)

      let paidAmount = 0
      if (body.paymentType === "CASH") {
        paidAmount = grandTotal
      } else if (body.paymentType === "PARTIAL") {
        paidAmount = roundMoney(Math.min(body.paidAmount, grandTotal))
        if (paidAmount <= 0) {
          throw new ApiError("ยอดชำระบางส่วนต้องมากกว่า 0", 400)
        }
      }

      const status = paidAmount >= grandTotal ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"

      const todayStr = yymmdd()
      const billPrefix = `INV-${todayStr}-`
      await lockDocumentSeries(tx, `sale:${todayStr}`)
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
          discountAmount: body.discountAmount,
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
              quantity: item.quantity,
              quantityBase: item.quantityBase,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      })

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

      const creditAmount = grandTotal - paidAmount
      if (customer && creditAmount > 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: { increment: creditAmount } },
        })
      }

      return sale
    })

    return NextResponse.json({ success: true, saleId: newSale.id, billNo: newSale.billNo })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create sale")
  }
}

