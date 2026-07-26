import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function withConnectionLimit(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl)
    if (!url.searchParams.has("connection_limit")) {
      const configuredLimit = Number.parseInt(process.env.PRISMA_CONNECTION_LIMIT || "10", 10)
      url.searchParams.set(
        "connection_limit",
        String(Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 10)
      )
    }
    return url.toString()
  } catch {
    return databaseUrl
  }
}

function getRuntimeDatabaseUrl() {
  if (process.env.DATABASE_RUNTIME_URL) {
    return process.env.DATABASE_RUNTIME_URL
  }

  // A persistent shop server should keep prepared statements and reuse a small
  // Prisma pool. Vercel remains on the transaction pooler from DATABASE_URL.
  if (!process.env.VERCEL && process.env.DIRECT_URL) {
    return withConnectionLimit(process.env.DIRECT_URL)
  }

  return process.env.DATABASE_URL
}

const runtimeDatabaseUrl = getRuntimeDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    runtimeDatabaseUrl
      ? {
          datasources: {
            db: { url: runtimeDatabaseUrl },
          },
        }
      : undefined
  )

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
