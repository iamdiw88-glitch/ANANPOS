import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET(request: Request) {
  try {
    await requireApiSession()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()
    const categoryId = Number(searchParams.get("categoryId"))
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 48, 1), 100)
    let categoryIds: number[] = []
    if (Number.isInteger(categoryId) && categoryId > 0) {
      categoryIds = [categoryId]
      const allCategories = await prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, parentId: true },
      })
      const queue = [categoryId]
      while (queue.length > 0) {
        const current = queue.shift()
        const children = allCategories.filter((c) => c.parentId === current)
        for (const child of children) {
          categoryIds.push(child.id)
          queue.push(child.id)
        }
      }
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
        ...(query
          ? {
              OR: [
                { code: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { searchTags: { contains: query, mode: "insensitive" } },
                { productUnits: { some: { barcode: { contains: query, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        imageUrl: true,
        searchTags: true,
        soldCount: true,
        categoryId: true,
        baseUnitId: true,
        reorderPoint: true,
        isStockItem: true,
        category: { select: { id: true, name: true } },
        baseUnit: { select: { id: true, name: true } },
        productUnits: {
          where: { isActive: true },
          select: {
            id: true,
            unitId: true,
            conversionRate: true,
            price: true,
            contractorPrice: true,
            isDefaultSale: true,
            barcode: true,
            unit: { select: { id: true, name: true } },
          },
        },
        stockBalance: { select: { quantityOnHand: true } },
      },
      orderBy: [{ soldCount: "desc" }, { name: "asc" }],
      take: limit,
    })

    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    return apiErrorResponse(error, "Failed to search products")
  }
}
