"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleRegister(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const nickname =
      displayName.trim();

    if (!nickname) {
      setError(
        "Please enter a nickname."
      );
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error } =
      await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: nickname,
          },
        },
      });

    console.log(
      "REGISTER RESULT:",
      data
    );

    console.log(
      "REGISTER ERROR:",
      error
    );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Account berhasil dibuat.
    // Trigger Supabase akan membuat
    // profiles dengan nickname + status pending.
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] px-6 text-[#3f382f]">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Create your account.
          </h1>

          <p className="mt-2 text-sm text-[#746a5e]">
            Begin your own journey.
          </p>
        </div>

        <div className="rounded-2xl bg-[#f7f2ea] p-8">
          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >

            {/* Nickname */}
            <div>
              <label className="mb-2 block text-sm">
                Nickname
              </label>

              <input
                type="text"
                value={displayName}
                onChange={(e) =>
                  setDisplayName(
                    e.target.value
                  )
                }
                placeholder="Your nickname"
                required
                maxLength={30}
                className="w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm outline-none transition focus:border-[#8a7e70]"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm">
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
                className="w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm outline-none transition focus:border-[#8a7e70]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm outline-none transition focus:border-[#8a7e70]"
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-2 block text-sm">
                Confirm password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm outline-none transition focus:border-[#8a7e70]"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-[#d8cec0] bg-[#ebe3d8] p-4">
                <p className="text-sm text-[#746a5e]">
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
                ? "Creating account..."
                : "Create Account"}
            </button>

          </form>

          <p className="mt-6 text-center text-sm text-[#746a5e]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() =>
                router.push("/login")
              }
              className="text-[#3f382f] underline-offset-2 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#8a7e70]">
          Your life. Your character. Your journey.
        </p>

      </div>
    </main>
  );
}