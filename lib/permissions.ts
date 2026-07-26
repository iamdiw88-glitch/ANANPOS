export type AppRole = "OWNER" | "STAFF" | "CASHIER" | "MANAGER"

export type Permission =
  | "sale:create"
  | "sale:void"
  | "sale:discount"
  | "sale:price_override"
  | "stock:view"
  | "stock:adjust"
  | "catalog:create"
  | "product:manage"
  | "customer:view"
  | "credit:settle"
  | "return:create"
  | "return:view"
  | "report:sales"
  | "settings:manage"

const ROLE_PERMISSIONS: Record<Exclude<AppRole, "MANAGER">, Permission[]> = {
  OWNER: [
    "sale:create",
    "sale:void",
    "sale:discount",
    "sale:price_override",
    "stock:view",
    "stock:adjust",
    "catalog:create",
    "product:manage",
    "customer:view",
    "credit:settle",
    "return:create",
    "return:view",
    "report:sales",
    "settings:manage",
  ],
  STAFF: [
    "sale:create",
    "sale:discount",
    "sale:price_override",
    "stock:view",
    "stock:adjust",
    "catalog:create",
    "product:manage",
    "customer:view",
    "credit:settle",
    "return:create",
    "return:view",
    "report:sales",
  ],
  CASHIER: [
    "sale:create",
    "stock:view",
    "customer:view",
    "return:create",
    "return:view",
    "report:sales",
  ],
}

export const MAX_DISCOUNT_PCT: Record<Exclude<AppRole, "MANAGER">, number> = {
  OWNER: 100,
  STAFF: 20,
  CASHIER: 0,
}

export function normalizeRole(role: string): Exclude<AppRole, "MANAGER"> {
  if (role === "MANAGER") return "STAFF"
  if (role === "OWNER" || role === "STAFF" || role === "CASHIER") return role
  return "CASHIER"
}

export function hasPermission(role: string, permission: Permission) {
  const normalizedRole = normalizeRole(role)
  return ROLE_PERMISSIONS[normalizedRole].includes(permission)
}

export function maxDiscountPctForRole(role: string) {
  return MAX_DISCOUNT_PCT[normalizeRole(role)]
}
