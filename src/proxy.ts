import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";
import { getExternalOrigin } from "@/lib/request-url";
import { isEmailAllowed } from "@/lib/allowlist";

// Paths that are fully public — no auth or allowlist check.
const PUBLIC_PATHS = [
  "/api/login",
  "/api/callback",
  "/api/logout",
  "/api/health",
  "/login",
];

// Paths that require authentication but bypass the allowlist check.
// The /unauthorized page is shown to logged-in users who are not on the list.
const ALLOWLIST_EXEMPT_PATHS = ["/unauthorized"];

// User-agent substrings used by Replit's deployment healthcheck probes.
const HEALTHCHECK_USER_AGENTS = ["Go-http-client", "GoogleHC", "kube-probe"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always pass through public auth routes and static assets.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // 2. Let Replit deployment healthcheck probes through without auth.
  //    These hit "/" during the Promote step to verify the server is up.
  const ua = req.headers.get("user-agent") ?? "";
  if (HEALTHCHECK_USER_AGENTS.some((s) => ua.includes(s))) {
    return new NextResponse("ok", { status: 200 });
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

  // 2. Authentication check — must be logged in via Replit Auth.
  if (!session.userId) {
    const origin = getExternalOrigin(req);
    const loginUrl = new URL("/api/login", origin);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Allowlist exemption — authenticated user visiting /unauthorized.
  if (ALLOWLIST_EXEMPT_PATHS.some((p) => pathname.startsWith(p))) {
    return res;
  }

  // 4. Authorization check — email must be in ALLOWED_EMAILS.
  //    To manage the allowlist, set the ALLOWED_EMAILS environment variable
  //    (comma-separated) in Replit Secrets or your deployment environment.
  if (!isEmailAllowed(session.userEmail)) {
    const isApiRoute = pathname.startsWith("/api/");
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Forbidden", message: "Your account is not authorized to access this application." },
        { status: 403 }
      );
    }
    const origin = getExternalOrigin(req);
    return NextResponse.redirect(new URL("/unauthorized", origin));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
