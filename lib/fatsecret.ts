import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const FATSECRET_SERVER_URL =
  "https://platform.fatsecret.com/rest/server.api";

type FatSecretConnection = {
  user_id: string;
  fatsecret_access_token: string;
  fatsecret_access_secret: string;
};

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) =>
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
  accessTokenSecret = ""
) {
  const encodedParams = Object.entries(params)
    .map(([key, value]) => [
      percentEncode(key),
      percentEncode(value),
    ])
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey < bKey) {
        return -1;
      }

      if (aKey > bKey) {
        return 1;
      }

      if (aValue < bValue) {
        return -1;
      }

      if (aValue > bValue) {
        return 1;
      }

      return 0;
    })
    .map(
      ([key, value]) =>
        `${key}=${value}`
    )
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(encodedParams),
  ].join("&");

  const signingKey =
    `${percentEncode(consumerSecret)}&${percentEncode(
      accessTokenSecret
    )}`;

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

async function getAuthenticatedSupabase() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            // Ignore cookie write errors
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Supabase user session tidak ditemukan."
    );
  }

  return {
    supabase,
    user,
  };
}

async function getFatSecretConnection(): Promise<FatSecretConnection> {
  const {
    supabase,
    user,
  } = await getAuthenticatedSupabase();

  const {
    data,
    error,
  } = await supabase
    .from("fatsecret_connections")
    .select(
      "user_id, fatsecret_access_token, fatsecret_access_secret"
    )
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    console.error(
      "FatSecret connection lookup error:",
      error
    );

    throw new Error(
      "Akun FatSecret belum terhubung."
    );
  }

  return data;
}

export async function fatSecretRequest<T>(
  method: "GET" | "POST",
  endpoint: string,
  parameters: Record<string, string> = {},
  options: {
    delegated?: boolean;
  } = {}
): Promise<T> {
  const consumerKey =
    process.env.FATSECRET_CONSUMER_KEY;

  const consumerSecret =
    process.env.FATSECRET_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error(
      "FatSecret OAuth credentials belum dikonfigurasi."
    );
  }

  const cleanEndpoint =
    endpoint
      .trim()
      .replace(/^\/+/, "");

  const connection =
    options.delegated
      ? await getFatSecretConnection()
      : null;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key:
      consumerKey,

    oauth_nonce:
      createNonce(),

    oauth_signature_method:
      "HMAC-SHA1",

    oauth_timestamp:
      Math.floor(
        Date.now() / 1000
      ).toString(),

    oauth_version:
      "1.0",
  };

  if (connection) {
    oauthParams.oauth_token =
      connection.fatsecret_access_token;
  }

  const apiParameters: Record<string, string> = {
    ...parameters,
    method: cleanEndpoint,
  };

  const allParams: Record<string, string> = {
    ...apiParameters,
    ...oauthParams,
  };

  const signature =
    createSignature(
      method,
      FATSECRET_SERVER_URL,
      allParams,
      consumerSecret,
      connection?.fatsecret_access_secret ?? ""
    );

  const requestParams =
    new URLSearchParams();

  for (
    const [key, value]
    of Object.entries(allParams)
  ) {
    requestParams.set(
      key,
      value
    );
  }

  requestParams.set(
    "oauth_signature",
    signature
  );

  const response =
    await fetch(
      FATSECRET_SERVER_URL,
      {
        method,
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          requestParams.toString(),
        cache: "no-store",
      }
    );

  const responseText =
    await response.text();

  console.log(
    "FatSecret response:",
    response.status,
    responseText
  );

  if (!response.ok) {
    console.error(
      "FatSecret API HTTP error:",
      response.status,
      responseText
    );

    throw new Error(
      `FatSecret API request failed (${response.status}).`
    );
  }

  try {
    return JSON.parse(
      responseText
    ) as T;
  } catch {
    console.error(
      "FatSecret API non-JSON response:",
      responseText
    );

    throw new Error(
      "FatSecret API mengembalikan response yang bukan JSON."
    );
  }
}