import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const FATSECRET_BASE_URL =
  "https://platform.fatsecret.com/rest";

const FATSECRET_SIGNATURE_URL =
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
  signatureUrl: string,
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
    percentEncode(signatureUrl),
    percentEncode(normalizedParams),
  ].join("&");

  const signingKey =
    `${percentEncode(consumerSecret)}&`;

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
  parameters: Record<string, string> = {}
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

  const requestUrl =
    `${FATSECRET_BASE_URL}/${cleanEndpoint}`;

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

  const allParams: Record<string, string> = {
    ...parameters,
    ...oauthParams,
  };

  const signature =
    createSignature(
      method,
      FATSECRET_SIGNATURE_URL,
      allParams,
      consumerSecret
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
      `${requestUrl}?${requestParams.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );
  } else {
    response = await fetch(
      requestUrl,
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

  console.log(
    "FatSecret response:",
    response.status,
    responseText
  );

  if (!response.ok) {
    throw new Error(
      `FatSecret API request failed (${response.status}).`
    );
  }

  try {
    return JSON.parse(
      responseText
    ) as T;
  } catch {
    throw new Error(
      "FatSecret API mengembalikan response yang bukan JSON."
    );
  }
}