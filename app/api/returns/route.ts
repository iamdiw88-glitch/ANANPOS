import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"
import { lockDocumentSeries, nextSequenceFrom, yymmdd } from "@/lib/document-number"

const returnItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  productUnitId: z.coerce.number().int().positive(),
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

function nextInvoiceStatus(totalAmount: number, paidAmount: number) {
  if (paidAmount >= totalAmount) return "PAID"
  if (paidAmount > 0) return "PARTIAL"
  return "OPEN"
}

function nextSaleStatus(grandTotal: number, paidAmount: number) {
  if (paidAmount >= grandTotal) return "PAID"
  if (paidAmount > 0) return "PARTIAL"
  return "UNPAID"
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireApiSession()
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
          invoiceSales: {
            include: { invoice: true },
          },
        },
      })

      if (!sale) throw new ApiError("ไม่พบบิลขายเดิม", 404)
      if (sale.status === "VOID") throw new ApiError("ไม่สามารถรับคืนจากบิลที่ยกเลิกแล้ว", 400)
      if (data.refundMethod === "CREDIT_NOTE" && !sale.customerId) {
        throw new ApiError("Credit Note ต้องใช้กับบิลที่มีข้อมูลลูกค้า", 400)
      }

      const soldByProductUnit = new Map<string, { quantity: number; unitPrice: number; conversionRate: number; product: typeof sale.items[number]["product"] }>()
      for (const item of sale.items) {
        const key = `${item.productId}:${item.productUnitId}`
        const current = soldByProductUnit.get(key)
        soldByProductUnit.set(key, {
          quantity: (current?.quantity || 0) + item.quantity,
          unitPrice: item.unitPrice,
          conversionRate: item.productUnit.conversionRate,
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
          const key = `${item.productId}:${item.productUnitId}`
          returnedByProductUnit.set(key, (returnedByProductUnit.get(key) || 0) + item.quantity)
        }
      }

      const items = data.items.map((item) => {
        const key = `${item.productId}:${item.productUnitId}`
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

      if (data.refundMethod === "CREDIT_NOTE" && sale.customerId) {
        const remainingSaleBalance = Math.max(0, sale.grandTotal - sale.paidAmount)
        const creditAmount = Math.min(totalRefund, remainingSaleBalance)

        if (creditAmount > 0) {
          const newPaidAmount = roundMoney(sale.paidAmount + creditAmount)
          await tx.sale.update({
            where: { id: sale.id },
            data: {
              paidAmount: newPaidAmount,
              status: nextSaleStatus(sale.grandTotal, newPaidAmount),
            },
          })

          await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: { decrement: creditAmount } },
          })

          let remainingCredit = creditAmount
          for (const link of sale.invoiceSales) {
            if (remainingCredit <= 0) break
            const allocation = Math.min(remainingCredit, link.amount)
            const newInvoiceTotal = roundMoney(link.invoice.totalAmount - allocation)
            const newInvoiceBalance = roundMoney(Math.max(0, link.invoice.balance - allocation))

            await tx.invoiceSale.update({
              where: { invoiceId_saleId: { invoiceId: link.invoiceId, saleId: link.saleId } },
              data: { amount: roundMoney(link.amount - allocation) },
            })
            await tx.invoice.update({
              where: { id: link.invoiceId },
              data: {
                totalAmount: newInvoiceTotal,
                balance: newInvoiceBalance,
                status: nextInvoiceStatus(newInvoiceTotal, link.invoice.paidAmount),
              },
            })
            remainingCredit = roundMoney(remainingCredit - allocation)
          }
        }
      }

      return r
    })

    return NextResponse.json({ success: true, data: returnRec })
  } catch (error) {
    return apiErrorResponse(error, "Failed to create return")
  }
}

