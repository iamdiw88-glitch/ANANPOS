import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiPermission, parsePositiveId } from "@/lib/api"
import { lockDocumentSeries, nextSequenceFrom, yymmdd } from "@/lib/document-number"

const returnItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  productUnitId: z.coerce.number().int().positive(),
  customName: z.string().trim().max(120).nullable().optional(),
  customUnitName: z.string().trim().max(40).nullable().optional(),
  quantity: z.coerce.number().positive(),
  restock: z.coerce.boolean(),
})

const returnSchema = z.object({
  originalSaleId: z.coerce.number().int().positive(),
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "CUSTOMER_RETURN"]),
  refundMethod: z.enum(["CASH", "CREDIT_NOTE"]),
  note: z.string().trim().optional(),
  items: z.array(returnItemSchema).min(1, "กรุณาเพิ่มรายการรับคืน"),
})

const roundMoney = (value: number) => Math.round(value * 100) / 100

export async function GET(request: Request) {
  try {
    await requireApiPermission("return:view")

    const { searchParams } = new URL(request.url)
    const saleId = searchParams.get("saleId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where: Prisma.ReturnWhereInput = {}
    if (saleId) where.originalSaleId = parsePositiveId(saleId, "sale ID")
    if (dateFrom || dateTo) {
      const parsedDateFrom = dateFrom ? new Date(dateFrom) : null
      const parsedDateTo = dateTo ? new Date(dateTo) : null
      if (parsedDateFrom && Number.isNaN(parsedDateFrom.getTime())) {
        throw new ApiError("Invalid dateFrom", 400)
      }
      if (parsedDateTo && Number.isNaN(parsedDateTo.getTime())) {
        throw new ApiError("Invalid dateTo", 400)
      }
      where.returnDate = {
        ...(parsedDateFrom ? { gte: parsedDateFrom } : {}),
        ...(parsedDateTo ? { lte: parsedDateTo } : {}),
      }
    }

    const returns = await prisma.return.findMany({
      where,
      orderBy: { returnDate: "desc" },
      include: {
        customer: true,
        originalSale: true,
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        items: {
          include: {
            product: true,
            productUnit: {
              include: { unit: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: returns })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch returns")
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiPermission("return:create")
    const data = await parseJsonBody(request, returnSchema)

    const returnRec = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: data.originalSaleId },
        include: {
          items: {
            include: {
              product: true,
              productUnit: true,
            },
          },
        },
      })

      if (!sale) throw new ApiError("ไม่พบบิลขายเดิม", 404)
      if (sale.status === "VOID") throw new ApiError("ไม่สามารถรับคืนจากบิลที่ยกเลิกแล้ว", 400)
      if (data.refundMethod === "CREDIT_NOTE" && !sale.customerId) {
        throw new ApiError("Credit Note ต้องใช้กับบิลที่มีข้อมูลลูกค้า", 400)
      }

      const getReturnItemKey = (item: {
        productId: number
        productUnitId: number
        customName?: string | null
        customUnitName?: string | null
      }) => `${item.productId}:${item.productUnitId}:${item.customName || ""}:${item.customUnitName || ""}`

      const soldByProductUnit = new Map<string, {
        quantity: number
        unitPrice: number
        conversionRate: number
        customName: string | null
        customUnitName: string | null
        product: typeof sale.items[number]["product"]
      }>()
      for (const item of sale.items) {
        const key = getReturnItemKey(item)
        const current = soldByProductUnit.get(key)
        soldByProductUnit.set(key, {
          quantity: (current?.quantity || 0) + item.quantity,
          unitPrice: item.unitPrice,
          conversionRate: item.productUnit.conversionRate,
          customName: item.customName,
          customUnitName: item.customUnitName,
          product: item.product,
        })
      }

      const previousReturns = await tx.return.findMany({
        where: { originalSaleId: sale.id },
        include: { items: true },
      })
      const returnedByProductUnit = new Map<string, number>()
      for (const previousReturn of previousReturns) {
        for (const item of previousReturn.items) {
          const key = getReturnItemKey(item)
          returnedByProductUnit.set(key, (returnedByProductUnit.get(key) || 0) + item.quantity)
        }
      }

      const items = data.items.map((item) => {
        const key = getReturnItemKey(item)
        const sold = soldByProductUnit.get(key)
        if (!sold) throw new ApiError("พบรายการรับคืนที่ไม่อยู่ในบิลขายเดิม", 400)

        const alreadyReturned = returnedByProductUnit.get(key) || 0
        const remaining = sold.quantity - alreadyReturned
        if (item.quantity > remaining) {
          throw new ApiError("จำนวนรับคืนมากกว่าจำนวนที่เหลือจากบิลขาย", 400)
        }

        const quantityBase = item.quantity * sold.conversionRate
        const lineTotal = roundMoney(item.quantity * sold.unitPrice)

        return {
          productId: item.productId,
          productUnitId: item.productUnitId,
          customName: sold.customName,
          customUnitName: sold.customUnitName,
          quantity: item.quantity,
          quantityBase,
          restock: item.restock,
          unitPrice: sold.unitPrice,
          lineTotal,
          isStockItem: sold.product.isStockItem,
        }
      })

      const totalRefund = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0))
      if (totalRefund <= 0) throw new ApiError("ยอดรับคืนไม่ถูกต้อง", 400)
      if (data.refundMethod === "CASH" && totalRefund > sale.paidAmount + 0.01) {
        throw new ApiError("ยอดคืนเงินสดมากกว่ายอดที่รับชำระแล้ว", 400)
      }
      if (data.refundMethod === "CREDIT_NOTE") {
        const remainingSaleBalance = roundMoney(Math.max(0, sale.grandTotal - sale.paidAmount))
        if (totalRefund > remainingSaleBalance + 0.01) {
          throw new ApiError("ยอดลดหนี้มากกว่ายอดค้างชำระของบิลนี้", 400)
        }
      }

      const todayStr = yymmdd()
      const prefix = `RT${todayStr}`
      await lockDocumentSeries(tx, `return:${todayStr}`)
      const lastReturn = await tx.return.findFirst({
        where: { returnNo: { startsWith: prefix } },
        orderBy: { returnNo: "desc" },
        select: { returnNo: true },
      })
      const returnNo = `${prefix}${String(nextSequenceFrom(lastReturn?.returnNo, prefix)).padStart(4, "0")}`

      const r = await tx.return.create({
        data: {
          returnNo,
          originalSaleId: sale.id,
          customerId: sale.customerId,
          reason: data.reason,
          totalRefund,
          refundMethod: data.refundMethod,
          note: data.note,
          createdById: userId,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              customName: item.customName,
              customUnitName: item.customUnitName,
              quantity: item.quantity,
              quantityBase: item.quantityBase,
              restock: item.restock,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      })

      for (const item of items) {
        if (!item.restock || !item.isStockItem) continue

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "RETURN_IN",
            quantityBase: item.quantityBase,
            refType: "RETURN",
            refId: r.id,
            createdById: userId,
          },
        })

        await tx.stockBalance.upsert({
          where: { productId: item.productId },
          update: { quantityOnHand: { increment: item.quantityBase } },
          create: { productId: item.productId, quantityOnHand: item.quantityBase },
        })
      }

      return r
    })

    return NextResponse.json({ success: true, data: returnRec })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create return")
  }
}
