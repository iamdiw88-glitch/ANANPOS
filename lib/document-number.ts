import type { Prisma } from "@prisma/client"

export function yymmdd(date = new Date()) {
  return date.toISOString().slice(2, 10).replace(/-/g, "")
}

export async function lockDocumentSeries(tx: Prisma.TransactionClient, key: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
}

export function nextSequenceFrom(value: string | null | undefined, prefix: string) {
  if (!value?.startsWith(prefix)) return 1
  const lastDigits = value.slice(prefix.length).replace(/\D/g, "")
  const next = Number(lastDigits) + 1
  return Number.isFinite(next) && next > 0 ? next : 1
}

