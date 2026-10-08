import crypto from "crypto";

const FATSECRET_BASE_URL =
  "https://platform.fatsecret.com/rest";

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
  requestUrl: string,
  params: Record<string, string>,
  consumerSecret: string
) {
  const normalizedParams = Object.entries(params)
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
    percentEncode(requestUrl),
    percentEncode(normalizedParams),
  ].join("&");

  const signingKey =
    `${percentEncode(consumerSecret)}&`;

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
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
      requestUrl,
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
    console.error(
      "FatSecret API non-JSON response:",
      responseText
    );

    throw new Error(
      "FatSecret API mengembalikan response yang bukan JSON."
    );
  }
}