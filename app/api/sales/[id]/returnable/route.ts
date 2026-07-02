import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parsePositiveId, requireApiPermission } from "@/lib/api"

const roundQty = (value: number) => Math.round(value * 1000000) / 1000000

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("return:create")
    const { id: idParam } = await params
    const saleId = parsePositiveId(idParam, "sale ID")

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            productUnit: {
              include: { unit: true },
            },
          },
        },
        returns: {
          orderBy: { returnDate: "desc" },
          include: {
            items: true,
            createdBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    })

    if (!sale) throw new ApiError("Sale not found", 404)
    if (sale.status === "VOID") throw new ApiError("Cannot return items from a voided sale", 400)

    const returnedByProductUnit = new Map<string, number>()
    for (const returnRec of sale.returns) {
      for (const item of returnRec.items) {
        const key = `${item.productId}:${item.productUnitId}:${item.customName || ""}:${item.customUnitName || ""}`
        returnedByProductUnit.set(key, (returnedByProductUnit.get(key) || 0) + item.quantity)
      }
    }

    const saleItemsByProductUnit = new Map<string, {
      id: number
      productId: number
      productUnitId: number
      customName: string | null
      customUnitName: string | null
      product: typeof sale.items[number]["product"]
      productUnit: typeof sale.items[number]["productUnit"]
      quantity: number
      quantityBase: number
      unitPrice: number
      lineTotal: number
    }>()

    for (const item of sale.items) {
      const key = `${item.productId}:${item.productUnitId}:${item.customName || ""}:${item.customUnitName || ""}`
      const current = saleItemsByProductUnit.get(key)
      if (current) {
        current.quantity = roundQty(current.quantity + item.quantity)
        current.quantityBase = roundQty(current.quantityBase + item.quantityBase)
        current.lineTotal = current.lineTotal + item.lineTotal
      } else {
        saleItemsByProductUnit.set(key, {
          id: item.id,
          productId: item.productId,
          productUnitId: item.productUnitId,
          customName: item.customName,
          customUnitName: item.customUnitName,
          product: item.product,
          productUnit: item.productUnit,
          quantity: item.quantity,
          quantityBase: item.quantityBase,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })
      }
    }

    const items = [...saleItemsByProductUnit.entries()]
      .map(([key, item]) => {
        const qtyAlreadyReturned = roundQty(returnedByProductUnit.get(key) || 0)
        const qtyReturnable = roundQty(Math.max(0, item.quantity - qtyAlreadyReturned))

        return {
          ...item,
          qtyOriginal: item.quantity,
          qtyAlreadyReturned,
          qtyReturnable,
        }
      })
      .filter((item) => item.qtyReturnable > 0)

    return NextResponse.json({
      success: true,
      data: {
        sale: {
          id: sale.id,
          billNo: sale.billNo,
          customerId: sale.customerId,
          customer: sale.customer,
          saleDate: sale.saleDate,
          grandTotal: sale.grandTotal,
          paidAmount: sale.paidAmount,
          status: sale.status,
          paymentType: sale.paymentType,
        },
        items,
        existingReturns: sale.returns,
      },
    })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch returnable items")
  }
}
