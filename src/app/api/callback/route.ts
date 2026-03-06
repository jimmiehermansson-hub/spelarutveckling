import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/oidc";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getExternalOrigin, externalUrl } from "@/lib/request-url";

export async function GET(req: NextRequest) {
  try {
    const config = await getOidcConfig();
    const session = await getSession();

    const codeVerifier = session.codeVerifier;
    const expectedState = session.state;
    const returnTo = session.returnTo ?? "/";

    if (!codeVerifier || !expectedState) {
      return NextResponse.redirect(externalUrl(req, "/api/login"));
    }

    // openid-client needs the full callback URL including the auth server's
    // query params (code=, state=).  req.url is the internal 0.0.0.0 address
    // so we rebuild it using the public origin + the original path+query.
    const origin = getExternalOrigin(req);
    const internalUrl = new URL(req.url);
    const publicCallbackUrl = new URL(
      `${internalUrl.pathname}${internalUrl.search}`,
      origin
    );

    const tokens = await client.authorizationCodeGrant(
      config,
      publicCallbackUrl,
      { pkceCodeVerifier: codeVerifier, expectedState }
    );

    const claims = tokens.claims();
    if (!claims) {
      return NextResponse.redirect(externalUrl(req, "/api/login"));
    }

    const userId = claims.sub;
    const userEmail = (claims.email as string) ?? null;

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: userEmail,
        firstName: (claims.first_name as string) ?? null,
        lastName: (claims.last_name as string) ?? null,
        profileImageUrl: (claims.profile_image_url as string) ?? null,
      },
      create: {
        id: userId,
        email: userEmail,
        firstName: (claims.first_name as string) ?? null,
        lastName: (claims.last_name as string) ?? null,
        profileImageUrl: (claims.profile_image_url as string) ?? null,
      },
    });

    session.userId = userId;
    session.userEmail = userEmail ?? undefined;
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.expiresAt = claims.exp;
    session.codeVerifier = undefined;
    session.state = undefined;
    session.returnTo = undefined;
    await session.save();

    // returnTo is always a path (e.g. "/") — anchor it to the public origin.
    return NextResponse.redirect(externalUrl(req, returnTo));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(externalUrl(req, "/api/login"));
  }
}
