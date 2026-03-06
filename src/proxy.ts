import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";
import { getExternalOrigin } from "@/lib/request-url";

const PUBLIC_PATHS = [
  "/api/login",
  "/api/callback",
  "/api/logout",
  "/api/health",
  "/login",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const session = await getIronSession<SessionData>(req, res, {
    password: process.env.SESSION_SECRET!,
    cookieName: "spelarutveckling_session",
    cookieOptions: {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  });

  if (!session.userId) {
    // Build the redirect using the public origin, not req.url (which is
    // the internal 0.0.0.0:3000 address).
    const origin = getExternalOrigin(req);
    const loginUrl = new URL("/api/login", origin);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
