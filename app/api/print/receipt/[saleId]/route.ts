import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parsePositiveId, requireApiSession } from "@/lib/api"

export async function POST(request: Request, { params }: { params: Promise<{ saleId: string }> }) {
  try {
    await requireApiSession()
    const { saleId: rawId } = await params
    const saleId = parsePositiveId(rawId, "sale ID")

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        createdBy: true,
        items: {
          include: {
            product: true,
            productUnit: { include: { unit: true } },
          },
        },
      },
    })

    if (!sale) {
      throw new ApiError("ไม่พบข้อมูลการขาย", 404)
    }

    const config = await prisma.printerConfig.findUnique({
      where: { documentType: "receipt" },
    })

    const printJob = await prisma.printJob.create({
      data: {
        type: "receipt",
        refId: sale.billNo,
        deviceId: config?.defaultDeviceId || null,
        method: "webusb",
        status: "queued",
      },
    })

    const receiptData = {
      shopName: "ร้านอนันตกิจการค้า",
      saleNo: sale.billNo,
      createdAt: sale.createdAt,
      cashierName: sale.createdBy?.name || "พนักงาน",
      customerName: sale.customer?.name || undefined,
      items: sale.items.map((item) => ({
        name: item.customName || item.product?.name || "สินค้า",
        qty: item.quantity.toLocaleString("th-TH"),
        unit: item.customUnitName || item.productUnit?.unit?.name || "ชิ้น",
        price: item.unitPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
        lineTotal: item.lineTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
      })),
      subtotal: sale.subtotal.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
      discount: sale.discountAmount > 0 ? sale.discountAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : undefined,
      total: sale.grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
      paymentMethod: sale.paymentType === "CASH" ? "เงินสด" : sale.paymentType === "CREDIT" ? "เงินเชื่อ" : "ชำระบางส่วน",
      fulfillment: "pickup" as const,
      openCashDrawer: sale.paymentType === "CASH",
    }

    return NextResponse.json({
      success: true,
      printJobId: printJob.id,
      receiptData,
      deviceId: config?.defaultDeviceId,
      usbVendorId: config?.usbVendorId,
      usbProductId: config?.usbProductId,
    })
  } catch (error) {
    return apiErrorResponse(error, "Failed to prepare receipt print job")
  }
}
