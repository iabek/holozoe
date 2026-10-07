import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const REQUEST_TOKEN_URL =
  "https://authentication.fatsecret.com/oauth/request_token";

const AUTHORIZE_URL =
  "https://authentication.fatsecret.com/oauth/authorize";

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`
    );
}

function createNonce() {
  return crypto.randomBytes(16).toString("hex");
}

function createSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string
) {
  const normalizedParams = Object.entries(params)
    .sort(([aKey, aValue], [bKey, bValue]) => {
      const keyCompare = aKey.localeCompare(bKey);

      if (keyCompare !== 0) {
        return keyCompare;
      }

      return aValue.localeCompare(bValue);
    })
    .map(
      ([key, value]) =>
        `${percentEncode(key)}=${percentEncode(value)}`
    )
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(normalizedParams),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&`;

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

export async function GET(request: Request) {
  const consumerKey = process.env.FATSECRET_CONSUMER_KEY;
  const consumerSecret = process.env.FATSECRET_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return NextResponse.json(
      {
        error: "FatSecret OAuth credentials are missing.",
      },
      { status: 500 }
    );
  }

  const requestUrl = new URL(request.url);

  const callbackUrl =
    process.env.FATSECRET_CALLBACK_URL ||
    `${requestUrl.origin}/api/fatsecret/callback`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: createNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    oauth_callback: callbackUrl,
  };

  const oauthSignature = createSignature(
    "POST",
    REQUEST_TOKEN_URL,
    oauthParams,
    consumerSecret
  );

  oauthParams.oauth_signature = oauthSignature;

  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(oauthParams)) {
    body.set(key, value);
  }

  try {
    const response = await fetch(REQUEST_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "FatSecret request token error:",
        responseText
      );

      return NextResponse.json(
        {
          error: "Failed to obtain FatSecret request token.",
          details: responseText,
        },
        { status: 500 }
      );
    }

    const params = new URLSearchParams(responseText);

    const oauthToken = params.get("oauth_token");
    const oauthTokenSecret =
      params.get("oauth_token_secret");

    const callbackConfirmed =
      params.get("oauth_callback_confirmed");

    // Aman untuk dilihat di terminal:
    // TIDAK mencetak token atau secret.
    console.log(
      "FatSecret request token status:",
      {
        oauthTokenReceived: Boolean(oauthToken),
        oauthTokenSecretReceived: Boolean(
          oauthTokenSecret
        ),
        callbackConfirmed,
      }
    );

    if (!oauthToken || !oauthTokenSecret) {
      return NextResponse.json(
        {
          error:
            "FatSecret did not return a request token.",
          details: responseText,
        },
        { status: 500 }
      );
    }

    if (callbackConfirmed !== "true") {
      return NextResponse.json(
        {
          error:
            "FatSecret did not confirm the OAuth callback URL.",
          callbackConfirmed,
        },
        { status: 500 }
      );
    }

    const redirectResponse = NextResponse.redirect(
      `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(
        oauthToken
      )}`
    );

    redirectResponse.cookies.set(
      "fatsecret_request_token",
      oauthToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      }
    );

    redirectResponse.cookies.set(
      "fatsecret_request_token_secret",
      oauthTokenSecret,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      }
    );

    return redirectResponse;
  } catch (error) {
    console.error("FatSecret OAuth error:", error);

    return NextResponse.json(
      {
        error: "FatSecret OAuth connection failed.",
      },
      { status: 500 }
    );
  }
}