import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export default NextAuth(authConfig).auth((req) => {
  const isLoggedIn = !!req.auth;
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isLoginRoute = req.nextUrl.pathname === '/login';

  if (isApiAuthRoute) return;

  if (isLoginRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', req.nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
