import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("strava_oauth_state")?.value;

  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const appUrl = "https://holozoe.vercel.app";

  function finish(path: string) {
    const response = NextResponse.redirect(new URL(path, appUrl));
    response.cookies.delete("strava_oauth_state");
    return response;
  }

  if (oauthError) {
    return finish("/?strava=cancelled");
  }

  if (
    !code ||
    !returnedState ||
    !savedState ||
    returnedState !== savedState
  ) {
    return finish("/?strava=invalid_state");
  }

  if (!redirectUri || !clientId || !clientSecret) {
    console.error("Strava configuration is incomplete.");
    return finish("/?strava=config_error");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !supabaseUrl ||
  !supabasePublishableKey ||
  !serviceRoleKey
) {
  console.error("Supabase configuration check:", {
    hasUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabasePublishableKey),
    hasServiceRoleKey: Boolean(serviceRoleKey),
  });

  return finish("/?strava=config_error");
}

  // Client sesi pengguna: hanya untuk memverifikasi login.
  const sessionSupabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookie updates may be unavailable in some contexts.
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await sessionSupabase.auth.getUser();

  if (userError || !user) {
    return finish("/?strava=login_required");
  }

  try {
    // Tukar authorization code dengan token Strava.
    const tokenResponse = await fetch(
      "https://www.strava.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
        }),
        cache: "no-store",
      }
    );

    const tokenData = await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token ||
      !tokenData.refresh_token ||
      !tokenData.athlete?.id
    ) {
      console.error(
        "Strava token exchange failed:",
        tokenData.message ?? tokenData.errors ?? "Invalid response"
      );
      return finish("/?strava=token_error");
    }

    // Client administratif hanya digunakan di server.
    // Client ini melewati RLS, jadi akses dibatasi pada operasi
    // backend yang memang diperlukan.
    const adminSupabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = new Date().toISOString();

    const { error: saveError } = await adminSupabase
      .from("strava_connections")
      .upsert(
        {
          user_id: user.id,
          strava_athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          scope: "read,activity:read",
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (saveError) {
      // Jangan mencatat token atau secret ke log.
      console.error(
        "Strava connection save failed:",
        saveError.message,
        saveError.code
      );
      return finish("/?strava=save_error");
    }

    return finish("/?strava=connected");
  } catch (error) {
    console.error(
      "Strava callback failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return finish("/?strava=connection_error");
  }
}