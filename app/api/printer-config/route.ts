import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET() {
  try {
    await requireApiSession()
    const configs = await prisma.printerConfig.findMany({
      include: { defaultDevice: true },
    })
    return NextResponse.json({ success: true, data: configs })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch printer configs")
  }
}
