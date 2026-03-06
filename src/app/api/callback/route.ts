import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/oidc";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const config = await getOidcConfig();
    const session = await getSession();

    const codeVerifier = session.codeVerifier;
    const expectedState = session.state;
    const returnTo = session.returnTo ?? "/";

    if (!codeVerifier || !expectedState) {
      return NextResponse.redirect(new URL("/api/login", req.url));
    }

    const tokens = await client.authorizationCodeGrant(
      config,
      new URL(req.url),
      { pkceCodeVerifier: codeVerifier, expectedState }
    );

    const claims = tokens.claims();
    if (!claims) {
      return NextResponse.redirect(new URL("/api/login", req.url));
    }

    const userId = claims.sub;

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: (claims.email as string) ?? null,
        firstName: (claims.first_name as string) ?? null,
        lastName: (claims.last_name as string) ?? null,
        profileImageUrl: (claims.profile_image_url as string) ?? null,
      },
      create: {
        id: userId,
        email: (claims.email as string) ?? null,
        firstName: (claims.first_name as string) ?? null,
        lastName: (claims.last_name as string) ?? null,
        profileImageUrl: (claims.profile_image_url as string) ?? null,
      },
    });

    session.userId = userId;
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.expiresAt = claims.exp;
    session.codeVerifier = undefined;
    session.state = undefined;
    session.returnTo = undefined;
    await session.save();

    return NextResponse.redirect(new URL(returnTo, req.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/api/login", req.url));
  }
}
