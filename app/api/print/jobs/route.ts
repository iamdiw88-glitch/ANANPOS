import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiPermission } from "@/lib/api"

export async function GET(request: Request) {
  try {
    await requireApiPermission("stock:view")
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100)

    const jobs = await prisma.printJob.findMany({
      where: type ? { type } : undefined,
      include: {
        device: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ success: true, data: jobs })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch print jobs history")
  }
}
