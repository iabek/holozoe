import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const ACCESS_TOKEN_URL =
  "https://authentication.fatsecret.com/oauth/access_token";

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
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
  consumerSecret: string,
  tokenSecret = ""
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

  const signingKey =
    `${percentEncode(consumerSecret)}&${percentEncode(
      tokenSecret
    )}`;

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

function getCookie(
  cookieHeader: string,
  name: string
) {
  const cookiesMap = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");

        if (index === -1) {
          return [item, ""];
        }

        return [
          item.slice(0, index),
          decodeURIComponent(
            item.slice(index + 1)
          ),
        ];
      })
  );

  return cookiesMap[name] ?? null;
}

export async function GET(request: Request) {
  const consumerKey =
    process.env.FATSECRET_CONSUMER_KEY;

  const consumerSecret =
    process.env.FATSECRET_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return NextResponse.json(
      {
        error:
          "FatSecret OAuth credentials are missing.",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);

  const oauthProblem =
    url.searchParams.get("oauth_problem");

  if (oauthProblem) {
    console.error(
      "FatSecret OAuth problem:",
      oauthProblem
    );

    return NextResponse.json(
      {
        error:
          "FatSecret OAuth authorization failed.",
        problem: oauthProblem,
      },
      { status: 400 }
    );
  }

  const oauthToken =
    url.searchParams.get("oauth_token");

  const oauthVerifier =
    url.searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    console.error(
      "FatSecret callback missing OAuth parameters:",
      {
        oauthTokenReceived: Boolean(
          oauthToken
        ),
        oauthVerifierReceived: Boolean(
          oauthVerifier
        ),
        pathname: url.pathname,
        searchParams: Array.from(
          url.searchParams.keys()
        ),
      }
    );

    return NextResponse.json(
      {
        error:
          "Missing oauth_token or oauth_verifier.",
        received: {
          oauth_token: Boolean(
            oauthToken
          ),
          oauth_verifier: Boolean(
            oauthVerifier
          ),
        },
      },
      { status: 400 }
    );
  }

  const cookieHeader =
    request.headers.get("cookie") ?? "";

  const requestToken = getCookie(
    cookieHeader,
    "fatsecret_request_token"
  );

  const requestTokenSecret = getCookie(
    cookieHeader,
    "fatsecret_request_token_secret"
  );

  if (
    !requestToken ||
    !requestTokenSecret
  ) {
    return NextResponse.json(
      {
        error:
          "FatSecret request token session expired. Please start the connection again.",
      },
      { status: 400 }
    );
  }

  if (requestToken !== oauthToken) {
    return NextResponse.json(
      {
        error:
          "FatSecret OAuth token mismatch. Please start the connection again.",
      },
      { status: 400 }
    );
  }

  const oauthParams: Record<
    string,
    string
  > = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: createNonce(),
    oauth_signature_method:
      "HMAC-SHA1",
    oauth_timestamp: Math.floor(
      Date.now() / 1000
    ).toString(),
    oauth_version: "1.0",
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier,
  };

  const oauthSignature =
    createSignature(
      "GET",
      ACCESS_TOKEN_URL,
      oauthParams,
      consumerSecret,
      requestTokenSecret
    );

  oauthParams.oauth_signature =
    oauthSignature;

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(
    oauthParams
  )) {
    query.set(key, value);
  }

  try {
    const response = await fetch(
      `${ACCESS_TOKEN_URL}?${query.toString()}`,
      {
        method: "GET",
      }
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "FatSecret access token error:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Failed to obtain FatSecret access token.",
          details: responseText,
        },
        { status: 500 }
      );
    }

    const params =
      new URLSearchParams(
        responseText
      );

    const accessToken =
      params.get("oauth_token");

    const accessTokenSecret =
      params.get("oauth_token_secret");

    if (
      !accessToken ||
      !accessTokenSecret
    ) {
      return NextResponse.json(
        {
          error:
            "FatSecret did not return an access token.",
          details: responseText,
        },
        { status: 500 }
      );
    }

    // =====================================================
    // SUPABASE AUTH SESSION
    // =====================================================

    const cookieStore =
      await cookies();

    const supabase =
      createServerClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },

            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(
                  ({
                    name,
                    value,
                    options,
                  }) => {
                    cookieStore.set(
                      name,
                      value,
                      options
                    );
                  }
                );
              } catch {
                // Cookie update can fail in some
                // server contexts. The current
                // session can still be read.
              }
            },
          },
        }
      );

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "FatSecret callback user error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Supabase user session tidak ditemukan. Pastikan kamu sedang login ke HOLOZOE.",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // SAVE FATSECRET CONNECTION
    // =====================================================

    const {
      error: saveError,
    } = await supabase
      .from("fatsecret_connections")
      .upsert(
        {
          user_id: user.id,
          access_token: accessToken,
          access_token_secret:
            accessTokenSecret,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (saveError) {
      console.error(
        "FatSecret connection save error:",
        saveError
      );

      return NextResponse.json(
        {
          error:
            "Access token berhasil diperoleh, tetapi gagal disimpan ke Supabase.",
          details: saveError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "================================="
    );
    console.log(
      "FATSECRET CONNECTION SAVED"
    );
    console.log(
      "User ID:",
      user.id
    );
    console.log(
      "Access token received:",
      Boolean(accessToken)
    );
    console.log(
      "Access token secret received:",
      Boolean(accessTokenSecret)
    );
    console.log(
      "================================="
    );

    // =====================================================
    // CLEANUP TEMPORARY OAUTH COOKIES
    // =====================================================

    const result =
      NextResponse.json({
        success: true,
        message:
          "FatSecret berhasil terhubung dan koneksinya sudah disimpan ke Supabase.",
      });

    result.cookies.delete(
      "fatsecret_request_token"
    );

    result.cookies.delete(
      "fatsecret_request_token_secret"
    );

    return result;
  } catch (error) {
    console.error(
      "FatSecret callback error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "FatSecret callback failed.",
      },
      { status: 500 }
    );
  }
}