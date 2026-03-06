/**
 * Email allowlist authorization
 *
 * Only Replit-authenticated users whose email appears in ALLOWED_EMAILS
 * are granted access to protected pages and API routes.
 *
 * Managing the allowlist
 * ─────────────────────
 * Set the ALLOWED_EMAILS environment variable as a comma-separated list:
 *
 *   ALLOWED_EMAILS=coach@example.com,admin@example.com,assistant@example.com
 *
 * In Replit: open Secrets (the padlock icon in the sidebar) and add the key
 * ALLOWED_EMAILS with the comma-separated email addresses as the value.
 *
 * If ALLOWED_EMAILS is empty or not set, ALL authenticated users are blocked.
 */

export function isEmailAllowed(email: string | null | undefined): boolean {
  const raw = process.env.ALLOWED_EMAILS ?? "";

  // No allowlist configured — block everyone to prevent accidental open access.
  if (!raw.trim()) return false;

  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return false;

  return !!email && allowed.includes(email.trim().toLowerCase());
}
