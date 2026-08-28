import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSession, SESSION_COOKIE } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const session = await createSession(user.id);

  const res = NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      isCustomerScoped: user.role.isCustomerScoped,
      permissions: user.role.permissions,
      showMockData: user.showMockData,
    },
  });
  // The Secure flag must match how this request actually arrived, not just
  // NODE_ENV — a self-hosted deploy behind a reverse proxy may serve plain
  // HTTP (e.g. no TLS yet), and browsers silently discard a Secure cookie
  // over HTTP, which looks like "login succeeds but never sticks". Trust the
  // proxy's X-Forwarded-Proto when present (Nginx sets this); fall back to
  // NODE_ENV for platforms that terminate TLS transparently without it
  // (Vercel does set the header too, so this only matters as a safety net).
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto ? forwardedProto === "https" : process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return res;
}
