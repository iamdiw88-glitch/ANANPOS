import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { hasPermission, type Permission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function requireApiSession(allowedRoles?: string[]) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new ApiError("Unauthorized", 401)
  }

  const sessionRole = session.user.role as UserRole

  if (allowedRoles && !allowedRoles.includes(sessionRole)) {
    throw new ApiError("Forbidden", 403)
  }

  const sessionUserId = Number(session.user.id)
  const activeUser = Number.isInteger(sessionUserId)
    ? await prisma.user.findFirst({
        where: { id: sessionUserId, isActive: true },
        select: { id: true, role: true },
      })
    : null

  const fallbackUser = activeUser
    ? null
    : await prisma.user.findFirst({
        where: { role: sessionRole, isActive: true },
        select: { id: true, role: true },
        orderBy: { id: "asc" },
      })

  const user = activeUser || fallbackUser
  if (!user) {
    throw new ApiError("Unauthorized", 401)
  }

  return {
    session,
    userId: user.id,
    role: user.role,
  }
}

export async function requireApiPermission(permission: Permission) {
  const sessionData = await requireApiSession()
  if (!hasPermission(sessionData.role, permission)) {
    throw new ApiError("Forbidden", 403)
  }
  return sessionData
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("Invalid JSON body", 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    throw new ApiError(firstIssue?.message || "Invalid request body", 400)
  }

  return parsed.data
}

export function parsePositiveId(value: string | number, label = "ID") {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(`Invalid ${label}`, 400)
  }
  return id
}

export function apiErrorResponse(error: unknown, fallback = "Internal server error") {
  if (error instanceof ApiError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status })
  }

  console.error(error)
  return NextResponse.json({ success: false, error: fallback }, { status: 500 })
}
