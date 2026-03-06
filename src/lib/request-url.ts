/**
 * Derives the correct public-facing origin from an incoming request.
 *
 * In Replit (and many reverse-proxy setups) the Node process binds to
 * 0.0.0.0:3000, so `req.url` / `req.nextUrl` will contain
 * "http://0.0.0.0:3000/..." which is the *internal* address.
 *
 * The real public origin is available in:
 *   x-forwarded-proto  →  "https"
 *   x-forwarded-host   →  "<repl-slug>.riker.replit.dev"  (or the custom domain)
 *   host               →  fallback when x-forwarded-host is absent
 *
 * Never use `req.url` directly when building redirect URIs or callback URLs.
 */
export function getExternalOrigin(req: Request): string {
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? "https";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
    req.headers.get("host") ??
    "localhost";
  return `${proto}://${host}`;
}

/** Convenience: build an absolute URL using the public origin. */
export function externalUrl(req: Request, pathname: string): URL {
  return new URL(pathname, getExternalOrigin(req));
}
