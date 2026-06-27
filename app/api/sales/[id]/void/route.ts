import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parseJsonBody, parsePositiveId, requireApiSession } from "@/lib/api"

const voidSchema = z.object({
  reason: z.string().trim().optional(),
}).default({})

function nextInvoiceStatus(totalAmount: number, paidAmount: number) {
  if (paidAmount >= totalAmount) return "PAID"
  if (paidAmount > 0) return "PARTIAL"
  return "OPEN"
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireApiSession(["OWNER", "STAFF"])
    const { id } = await params
    const saleId = parsePositiveId(id, "sale ID")
    const body = await parseJsonBody(req, voidSchema)

    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          items: { include: { product: true } },
          invoiceSales: { include: { invoice: true } },
        },
      })

      if (!sale) throw new ApiError("Sale not found", 404)
      if (sale.status === "VOID") throw new ApiError("Already voided", 400)
      if (sale.paymentType !== "CASH" && sale.paidAmount > 0) {
        throw new ApiError("บิลนี้มีการรับชำระแล้ว กรุณาทำรายการคืนสินค้า/ลดหนี้แทน", 400)
      }
      if (sale.invoiceSales.some((link) => link.invoice.paidAmount > 0)) {
        throw new ApiError("ใบวางบิลนี้มีการรับชำระแล้ว ไม่สามารถยกเลิกบิลขายโดยตรงได้", 400)
      }

      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "VOID",
          voidReason: body.reason || "Void sale",
          voidedById: userId,
          voidedAt: new Date(),
        },
      })

      for (const item of sale.items) {
        if (!item.product.isStockItem) continue

        await tx.stockBalance.upsert({
          where: { productId: item.productId },
          update: { quantityOnHand: { increment: item.quantityBase } },
          create: { productId: item.productId, quantityOnHand: item.quantityBase },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "ADJUST",
            quantityBase: item.quantityBase,
            refType: "ADJUSTMENT",
            refId: sale.id,
            note: `VOID-${sale.billNo}`,
            createdById: userId,
          },
        })
      }

      for (const link of sale.invoiceSales) {
        const newTotal = Math.max(0, link.invoice.totalAmount - link.amount)
        const newBalance = Math.max(0, link.invoice.balance - link.amount)
        await tx.invoiceSale.update({
          where: { invoiceId_saleId: { invoiceId: link.invoiceId, saleId: link.saleId } },
          data: { amount: 0 },
        })
        await tx.invoice.update({
          where: { id: link.invoiceId },
          data: {
            totalAmount: newTotal,
            balance: newBalance,
            status: nextInvoiceStatus(newTotal, link.invoice.paidAmount),
          },
        })
      }

      if (sale.customerId && (sale.paymentType === "CREDIT" || sale.paymentType === "PARTIAL")) {
        const creditAmount = sale.grandTotal - sale.paidAmount
        if (creditAmount > 0) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: { decrement: creditAmount } },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorResponse(error, "Failed to void sale")
  }
}

