import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Middleware runs on the Edge runtime, which can't use Prisma directly — so
// this only checks whether a session cookie is present, as a fast redirect
// for the common case. The (app) layout (a Server Component, Node runtime)
// does the real validation: looking the session up in the database, checking
// expiry, and loading the user's role. Treat this middleware as a UX
// optimization, not the security boundary.
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname === "/login";

  if (!hasSession && !isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals, and any static file in /public (paths
  // containing a dot, e.g. /logo.jpg, /fonts/*.woff2) — otherwise the
  // unauthenticated redirect would swallow the login page's own logo/fonts.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
