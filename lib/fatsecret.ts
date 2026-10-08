import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const FATSECRET_BASE_URL =
  "https://platform.fatsecret.com/rest/server.api";

type FatSecretConnection = {
  user_id: string;
  fatsecret_access_token: string;
  fatsecret_access_secret: string;
};

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
  accessTokenSecret: string
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
      accessTokenSecret
    )}`;

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

function normalizeFatSecretMethod(endpoint: string) {
  const cleanEndpoint = endpoint
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (!cleanEndpoint) {
    throw new Error(
      "FatSecret endpoint tidak boleh kosong."
    );
  }

  if (cleanEndpoint.includes(".")) {
    return cleanEndpoint;
  }

  return cleanEndpoint.replace(/\//g, ".");
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
            // Ignore cookie write errors
            // in server-only contexts.
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
  parameters: Record<string, string> = {}
): Promise<T> {
  const consumerKey =
    process.env.FATSECRET_CONSUMER_KEY;

  const consumerSecret =
    process.env.FATSECRET_CONSUMER_SECRET;

  if (
    !consumerKey ||
    !consumerSecret
  ) {
    throw new Error(
      "FatSecret OAuth credentials belum dikonfigurasi."
    );
  }

  const connection =
    await getFatSecretConnection();

  const fatSecretMethod =
    normalizeFatSecretMethod(endpoint);

  const url =
    FATSECRET_BASE_URL;

  const oauthParams: Record<
    string,
    string
  > = {
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

    oauth_token:
      connection.fatsecret_access_token,

    oauth_version:
      "1.0",
  };

  const allParams: Record<
    string,
    string
  > = {
    method:
      fatSecretMethod,

    ...parameters,

    ...oauthParams,
  };

  const signature =
    createSignature(
      method,
      url,
      allParams,
      consumerSecret,
      connection.fatsecret_access_secret
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

  let response: Response;

  if (method === "GET") {
    response = await fetch(
      `${url}?${requestParams.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );
  } else {
    response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          requestParams.toString(),
        cache: "no-store",
      }
    );
  }

  const responseText =
    await response.text();

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

  let parsedResponse: T;

  try {
    parsedResponse =
      JSON.parse(
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

  return parsedResponse;
}