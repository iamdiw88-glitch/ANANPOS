import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        userId: { label: "User ID" },
        pin: { label: "PIN", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.pin) return null
        
        const user = await prisma.user.findUnique({
          where: { id: Number(credentials.userId) }
        })
        
        if (!user || !user.isActive) return null
        
        const isValid = await bcrypt.compare(String(credentials.pin), user.pinHash)
        if (!isValid) return null
        
        return {
          id: String(user.id),
          name: user.name,
          role: user.role,
        }
      }
    })
  ]
})
