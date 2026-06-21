import type { DefaultSession } from "@auth/core/types"

declare module "@auth/core/types" {
  interface User {
    role: string
  }

  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }
}
