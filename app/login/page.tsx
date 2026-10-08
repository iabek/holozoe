"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type ProfileStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "banned";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    console.log("LOGIN BUTTON WORKS");

    setLoading(true);
    setError("");

    const supabase = createClient();

    console.log(
      "TRYING SUPABASE LOGIN..."
    );

    const {
      data: loginData,
      error: loginError,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    console.log(
      "SUPABASE LOGIN RESULT:",
      loginError
    );

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    console.log(
      "LOGIN USER:",
      loginData.user
    );

    console.log(
      "LOGIN SESSION:",
      loginData.session
    );

    if (!loginData.user || !loginData.session) {
      setError(
        "Login failed. Supabase session was not created."
      );
      setLoading(false);
      return;
    }

    const user = loginData.user;

    console.log(
      "LOGIN SUCCESS:",
      user.email
    );

    // Pastikan session benar-benar bisa dibaca
    // oleh Supabase client setelah login.
    const {
      data: {
        user: verifiedUser,
      },
      error: verifyError,
    } = await supabase.auth.getUser();

    console.log(
      "VERIFIED USER:",
      verifiedUser
    );

    console.log(
      "VERIFY SESSION ERROR:",
      verifyError
    );

    if (verifyError || !verifiedUser) {
      setError(
        "Login succeeded, but the Supabase session could not be verified."
      );
      setLoading(false);
      return;
    }

    // Ambil status akun dari profiles
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", verifiedUser.id)
      .single();

    console.log(
      "LOGIN PROFILE:",
      profile
    );

    console.log(
      "LOGIN PROFILE ERROR:",
      profileError
    );

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setError(
        "Your HOLOZOE profile could not be found."
      );

      setLoading(false);
      return;
    }

    const status =
      profile.status as ProfileStatus;

    console.log(
      "LOGIN PROFILE STATUS:",
      status
    );

    // BANNED
    if (status === "banned") {
      await supabase.auth.signOut();

      setError(
        "Your access to HOLOZOE has been suspended. Please contact the administrator."
      );

      setLoading(false);
      return;
    }

    // REJECTED
    if (status === "rejected") {
      await supabase.auth.signOut();

      setError(
        "Your account has not been approved to enter HOLOZOE."
      );

      setLoading(false);
      return;
    }

    // PENDING
    if (status === "pending") {
      await supabase.auth.signOut();

      setError(
        "Your account is still waiting for administrator approval."
      );

      setLoading(false);
      return;
    }

    // Hanya APPROVED yang boleh lanjut
    if (status !== "approved") {
      await supabase.auth.signOut();

      setError(
        "Unable to verify your account status."
      );

      setLoading(false);
      return;
    }

    console.log(
      "LOGIN APPROVED — ENTERING HOLOZOE"
    );

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#8b6f5a] px-6 py-10 text-[#3f382f]">
      <div className="w-full max-w-md">
        {/* BRAND / ZOE */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-1 flex h-40 w-56 items-center justify-center">
            <img
              src="/login-zoe.png"
              alt="Zoe"
              className="h-full w-full object-contain"
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7f2ea]">
            HOLOZOE
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#fffaf2]">
            Welcome back.
          </h1>

          <p className="mt-2 text-sm text-[#f0e5d8]">
            Life, fully lived.
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="rounded-2xl bg-[#f7f2ea] p-8 shadow-xl">
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm text-[#3f382f]">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none transition focus:border-[#8a7e70]"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm text-[#3f382f]">
                  Password
                </label>

                <a
                  href="/forgot-password"
                  className="text-xs text-[#746a5e] transition hover:text-[#3f382f] hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none transition focus:border-[#8a7e70]"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-[#d8cec0] bg-[#ebe3d8] p-4">
                <p className="text-sm leading-6 text-[#746a5e]">
                  {error}
                </p>
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#8b6f5a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:opacity-50"
            >
              {loading
                ? "Entering..."
                : "Enter HOLOZOE"}
            </button>
          </form>

          {/* Register */}
          <p className="mt-6 text-center text-sm text-[#746a5e]">
            Don't have an account yet?{" "}
            <a
              href="/register"
              className="text-[#3f382f] underline-offset-2 hover:underline"
            >
              Create one
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#f0e5d8]">
          Life, fully lived.
        </p>
      </div>
    </main>
  );
}