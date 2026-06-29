// ============================================================
// KC Electricity Software v2 — NextAuth v5 Configuration
// Single admin login via environment variables
// ============================================================

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { username, password } = parsed.data

        const adminUsername = process.env.ADMIN_USERNAME ?? "admin"
        const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123"

        if (username !== adminUsername || password !== adminPassword) {
          return null
        }

        return {
          id: "1",
          name: "Administrator",
          email: "admin@kc-electricity.local",
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
