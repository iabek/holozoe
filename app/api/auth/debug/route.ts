import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();

  const allCookies = cookieStore.getAll();

  const supabaseCookies = allCookies
    .filter((cookie) =>
      cookie.name.startsWith("sb-")
    )
    .map((cookie) => cookie.name);

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
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const authCookie =
    allCookies.find((cookie) =>
      cookie.name ===
      "sb-syvzgeflscikrraqyghs-auth-token"
    );

  return NextResponse.json({
    cookies_found: supabaseCookies,

    supabase_cookie_count:
      supabaseCookies.length,

    auth_cookie_exists:
      !!authCookie,

    auth_cookie_length:
      authCookie?.value.length ?? 0,

    auth_cookie_prefix:
      authCookie?.value.slice(0, 30) ?? null,

    session_found:
      !!session,

    session_user_id:
      session?.user?.id ?? null,

    user_found:
      !!user,

    user_id:
      user?.id ?? null,

    session_error:
      sessionError?.message ?? null,

    user_error:
      userError?.message ?? null,
  });
}