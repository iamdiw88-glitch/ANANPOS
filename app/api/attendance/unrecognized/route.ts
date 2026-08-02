import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, requireApiSession } from "@/lib/api"

export async function GET(request: Request) {
  try {
    await requireApiSession(["OWNER"])
    const status = new URL(request.url).searchParams.get("status") || "pending"
    const scans = await prisma.unrecognizedScanLog.findMany({ where: { status }, include: { device: true }, orderBy: { createdAt: "desc" }, take: 100 })
    return NextResponse.json(scans)
  } catch (error) {
    return apiErrorResponse(error, "Failed to load unrecognized scans")
  }
}
