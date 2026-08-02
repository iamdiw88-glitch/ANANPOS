import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, requireApiPermission } from "@/lib/api"

const configSchema = z.object({
  defaultDeviceId: z.string().min(1, "กรุณาระบุเครื่องพิมพ์เริ่มต้น"),
  usbVendorId: z.string().optional(),
  usbProductId: z.string().optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ documentType: string }> }) {
  try {
    await requireApiPermission("settings:manage")
    const { documentType } = await params
    const data = await parseJsonBody(request, configSchema)

    // Ensure device exists or create a placeholder device if needed
    let device = await prisma.device.findUnique({
      where: { id: data.defaultDeviceId },
    })

    if (!device) {
      device = await prisma.device.create({
        data: {
          id: data.defaultDeviceId,
          name: `Printer (${documentType})`,
          type: documentType === "receipt" ? "receipt_printer" : documentType === "delivery_note" ? "delivery_printer" : "barcode_printer",
          status: "online",
        },
      })
    }

    const config = await prisma.printerConfig.upsert({
      where: { documentType },
      create: {
        documentType,
        defaultDeviceId: device.id,
        usbVendorId: data.usbVendorId || null,
        usbProductId: data.usbProductId || null,
      },
      update: {
        defaultDeviceId: device.id,
        usbVendorId: data.usbVendorId || null,
        usbProductId: data.usbProductId || null,
      },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    return apiErrorResponse(error, "Failed to update printer config")
  }
}
