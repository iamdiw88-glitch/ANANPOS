import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET(req: Request) {
  try {
    const { role } = await requireApiSession()
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("mode") || "dropdown"

    if (mode === "owner" && role !== "OWNER") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const customers = await prisma.deliveryCustomer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        phone2: true,
        deliveryAddress: true,
        subdistrictId: true,
        subdistrictName: true,
        moo: true,
        villageName: true,
        landmark: true,
        totalPurchased: mode === "owner",
        purchaseCount: mode === "owner",
        lastPurchasedAt: mode === "owner",
        customerId: true,
      },
      orderBy: mode === "owner" ? [{ totalPurchased: "desc" }, { name: "asc" }] : [{ name: "asc" }],
    })

    return NextResponse.json(customers)
  } catch (error) {
    return apiErrorResponse(error, "Error loading delivery customers")
  }
}
