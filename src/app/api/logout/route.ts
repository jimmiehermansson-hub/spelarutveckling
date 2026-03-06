import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { getOidcConfig } from "@/lib/oidc";
import { getSession } from "@/lib/session";
import { getExternalOrigin } from "@/lib/request-url";

export async function GET(req: NextRequest) {
  const session = await getSession();
  session.destroy();

  const origin = getExternalOrigin(req);

  try {
    const config = await getOidcConfig();
    const endSessionUrl = client.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: origin,
    });
    return NextResponse.redirect(endSessionUrl.href);
  } catch {
    return NextResponse.redirect(new URL(origin));
  }
}
