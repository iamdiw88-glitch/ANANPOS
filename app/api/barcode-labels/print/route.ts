import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, requireApiPermission } from "@/lib/api"
import { resolveBarcodeValue } from "@/lib/barcode-utils"

const printBatchSchema = z.object({
  productIds: z.array(z.coerce.number().int().positive()).min(1, "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ"),
  template: z.enum(["a4_sheet_24", "a4_sheet_12", "thermal_roll"]).default("a4_sheet_24"),
  copiesPerItem: z.number().int().min(1).default(1),
})

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("product:manage")
    const data = await parseJsonBody(request, printBatchSchema)

    const products = await prisma.product.findMany({
      where: { id: { in: data.productIds } },
      include: {
        productUnits: {
          where: { isDefaultSale: true },
          take: 1,
        },
      },
    })

    // Auto-generate barcode for products missing barcode
    const preparedProducts = await Promise.all(
      products.map(async (product) => {
        if (!product.barcode) {
          return await prisma.product.update({
            where: { id: product.id },
            data: {
              barcode: product.code,
              barcodeGenerated: true,
            },
            include: {
              productUnits: {
                where: { isDefaultSale: true },
                take: 1,
              },
            },
          })
        }
        return product
      })
    )

    const batch = await prisma.barcodeLabelBatch.create({
      data: {
        productIds: data.productIds.map(String),
        template: data.template,
        copiesPerItem: data.copiesPerItem,
        printedById: session.userId ? String(session.userId) : null,
      },
    })

    const labels = preparedProducts.map((p) => {
      const defaultUnit = p.productUnits[0]
      return {
        productId: p.id,
        name: p.name,
        code: p.code,
        barcodeValue: resolveBarcodeValue(p),
        price: defaultUnit ? defaultUnit.price.toLocaleString("th-TH") : "0.00",
      }
    })

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      labels,
      template: data.template,
      copiesPerItem: data.copiesPerItem,
    })
  } catch (error) {
    return apiErrorResponse(error, "Failed to prepare barcode labels print batch")
  }
}
