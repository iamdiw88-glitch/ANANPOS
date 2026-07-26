export function getRoleHomePath(role?: string | null) {
  return role === "OWNER" ? "/dashboard" : "/pos"
}
