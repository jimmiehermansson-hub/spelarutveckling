import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/oidc";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  session.destroy();

  const host = req.headers.get("host") ?? req.nextUrl.host;
  const postLogoutUri = `https://${host}`;

  try {
    const config = await getOidcConfig();
    const endSessionUrl = client.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: postLogoutUri,
    });
    return NextResponse.redirect(endSessionUrl.href);
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
