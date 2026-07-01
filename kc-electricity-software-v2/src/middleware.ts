// ============================================================
// KC Electricity Software v2 — Route Protection Middleware
// Redirects unauthenticated users to /login
// ============================================================

export { auth as middleware } from "@/auth"

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (the sign-in page)
     * - /api/auth/* (NextAuth routes)
     * - _next/static, _next/image, favicon.ico
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
