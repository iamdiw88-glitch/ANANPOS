import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { supplierId, items, note, createdById, purchaseDate } = body

    if (!supplierId || !items || items.length === 0 || !createdById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate Purchase No (PO-YYMMDD-XXXX)
    const today = new Date()
    const yy = String(today.getFullYear()).slice(2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const prefix = `PO${yy}${mm}${dd}`

    const result = await prisma.$transaction(async (tx) => {
      const lastPO = await tx.purchase.findFirst({
        where: { purchaseNo: { startsWith: prefix } },
        orderBy: { purchaseNo: 'desc' }
      })
      
      let nextNum = 1
      if (lastPO) {
        nextNum = parseInt(lastPO.purchaseNo.slice(-4)) + 1
      }
      const purchaseNo = `${prefix}${String(nextNum).padStart(4, '0')}`

      let subtotal = 0
      for (const item of items) {
        subtotal += item.quantity * item.unitCost
      }

      // 1. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          purchaseNo,
          supplierId,
          purchaseDate: new Date(purchaseDate),
          subtotal,
          total: subtotal,
          status: "RECEIVED", // Assume received immediately for MVP
          note,
          createdById,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.quantity * item.unitCost
            }))
          }
        },
        include: { items: true }
      })

      // 2. Update Stock and create Stock Movements
      for (const item of purchase.items) {
        // Find product unit to get conversion rate
        const productUnit = await tx.productUnit.findUnique({
          where: { id: item.productUnitId }
        })
        
        if (!productUnit) throw new Error(`Product Unit ${item.productUnitId} not found`)
        
        const quantityBase = item.quantity * productUnit.conversionRate

        // Create StockMovement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "PURCHASE_IN",
            quantityBase,
            unitCost: item.unitCost / productUnit.conversionRate, // Cost per base unit
            refType: "PURCHASE",
            refId: purchase.id,
            createdById
          }
        })

        // Update StockBalance
        await tx.stockBalance.upsert({
          where: { productId: item.productId },
          create: {
            productId: item.productId,
            quantityOnHand: quantityBase
          },
          update: {
            quantityOnHand: { increment: quantityBase }
          }
        })
      }

      return purchase
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating purchase:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
