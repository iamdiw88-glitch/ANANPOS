import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { apiErrorResponse, parseJsonBody, requireApiSession } from "@/lib/api"

const settingsSchema = z.union([
  z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  z.object({
    settings: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  }),
])

function normalizeSettings(data: z.infer<typeof settingsSchema>) {
  if (
    "settings" in data &&
    typeof data.settings === "object" &&
    data.settings !== null &&
    !Array.isArray(data.settings)
  ) {
    return data.settings
  }
  return data
}

export async function GET() {
  try {
    await requireApiSession()

    const settings = await prisma.setting.findMany()
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)
    return NextResponse.json({ success: true, data: settingsMap })
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch settings")
  }
}

async function saveSettings(request: Request) {
  await requireApiSession(["OWNER"])
  const body = await parseJsonBody(request, settingsSchema)
  const data = normalizeSettings(body)

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(data)) {
      await tx.setting.upsert({
        where: { key },
        update: { value: String(value ?? "") },
        create: { key, value: String(value ?? "") },
      })
    }
  })

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  try {
    return await saveSettings(request)
  } catch (error) {
    return apiErrorResponse(error, "Failed to save settings")
  }
}

export async function POST(request: Request) {
  try {
    return await saveSettings(request)
  } catch (error) {
    return apiErrorResponse(error, "Failed to save settings")
  }
}
