import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"

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

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new ApiError("Forbidden", 403)
  }

  return {
    session,
    userId: Number(session.user.id),
    role: session.user.role,
  }
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

