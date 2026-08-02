import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, apiErrorResponse, parsePositiveId, requireApiSession } from "@/lib/api"
import { generateDeliveryNotePdfBuffer } from "@/components/delivery/delivery-note-pdf"

export async function POST(request: Request, { params }: { params: Promise<{ deliveryId: string }> }) {
  try {
    await requireApiSession()
    const { deliveryId: rawId } = await params
    const deliveryId = parsePositiveId(rawId, "delivery ID")

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        customer: true,
        sale: {
          include: {
            items: {
              include: {
                product: true,
                productUnit: { include: { unit: true } },
              },
            },
          },
        },
        driver: true,
        assignedVehicle: true,
      },
    })

    if (!delivery) {
      throw new ApiError("ไม่พบข้อมูลการจัดส่ง", 404)
    }

    const config = await prisma.printerConfig.findUnique({
      where: { documentType: "delivery_note" },
    })

    const deliveryNo = `DEL-${delivery.id}`

    await prisma.printJob.create({
      data: {
        type: "delivery_note",
        refId: deliveryNo,
        deviceId: config?.defaultDeviceId || null,
        method: "browser_print",
        status: "printed",
        printedAt: new Date(),
      },
    })

    const deliveryDate = new Intl.DateTimeFormat("th-TH", {
      dateStyle: "short",
    }).format(delivery.createdAt)

    const pdfBuffer = await generateDeliveryNotePdfBuffer({
      deliveryNo,
      deliveryDate,
      customerName: delivery.recipientName || delivery.customer?.name || "ลูกค้าทั่วไป",
      address: delivery.deliveryAddress || "ไม่ระบุที่อยู่",
      phone: delivery.recipientPhone || delivery.customer?.phone || undefined,
      driverName: delivery.driver?.name || delivery.driverName || undefined,
      vehiclePlate: delivery.assignedVehicle?.plateNumber || delivery.vehicle || undefined,
      saleNo: delivery.sale?.billNo || "-",
      items: (delivery.sale?.items || []).map((item: any) => ({
        name: item.customName || item.product?.name || "สินค้า",
        qty: item.quantity.toLocaleString("th-TH"),
        unit: item.customUnitName || item.productUnit?.unit?.name || "ชิ้น",
      })),
    })

    return new Response(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="delivery-note-${deliveryNo}.pdf"`,
      },
    })
  } catch (error) {
    return apiErrorResponse(error, "Failed to generate delivery note PDF")
  }
}
