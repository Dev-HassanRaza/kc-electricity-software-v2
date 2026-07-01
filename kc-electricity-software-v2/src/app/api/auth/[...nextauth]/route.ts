// ============================================================
// API: /api/auth/[...nextauth]
// NextAuth handler — delegates all auth to src/auth.ts
// ============================================================

import { handlers } from "@/auth"

export const { GET, POST } = handlers
