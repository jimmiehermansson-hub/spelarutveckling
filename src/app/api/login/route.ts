import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/oidc";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const config = await getOidcConfig();
  const session = await getSession();

  const host = req.headers.get("host") ?? req.nextUrl.host;
  const callbackUrl = `https://${host}/api/callback`;

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/";

  const codeVerifier = client.randomPKCECodeVerifier();
  const state = client.randomState();

  session.userId = undefined;
  session.codeVerifier = codeVerifier;
  session.state = state;
  session.returnTo = returnTo;
  await session.save();

  const redirectUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge_method: "S256",
    code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
    state,
    prompt: "login consent",
  });

  return NextResponse.redirect(redirectUrl.href);
}
