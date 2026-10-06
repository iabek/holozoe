"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Profile = {
  email: string;
  display_name: string | null;
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
  approved_at: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "email, display_name, status, is_admin, created_at, approved_at"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("PROFILE ERROR:", error);
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, []);

  function formatDate(date: string | null) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#f7f2ea] p-8 shadow-sm">
        <p className="text-sm text-[#746a5e]">
          Loading your profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl bg-[#f7f2ea] p-8 shadow-sm">
        <h2 className="text-xl font-bold text-[#3f382f]">
          Profile not found.
        </h2>

        <p className="mt-2 text-sm text-[#746a5e]">
          Your Life Game profile could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* PROFILE */}
      <section className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">

          {/* Avatar */}
          <button
            type="button"
            className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d8cec0] text-4xl transition hover:bg-[#cec2b4]"
          >
            <span>👤</span>

            <span className="absolute inset-0 flex items-center justify-center bg-[#3f382f]/60 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Change photo
            </span>
          </button>

          <div className="mt-4 sm:ml-6 sm:mt-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Your profile
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#3f382f]">
              {profile.display_name || "Life Game Player"}
            </h2>

            <p className="mt-1 text-sm text-[#746a5e]">
              {profile.email}
            </p>

            <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
              <span
                className={`h-2 w-2 rounded-full ${
                  profile.status === "approved"
                    ? "bg-[#7c8b68]"
                    : profile.status === "pending"
                    ? "bg-[#b49a68]"
                    : "bg-[#9a6f65]"
                }`}
              />

              <span className="text-xs font-medium capitalize text-[#746a5e]">
                {profile.status}
              </span>

              <span className="text-xs text-[#b7ac9e]">
                ·
              </span>

              <span className="text-xs text-[#746a5e]">
                {profile.is_admin
                  ? "Administrator"
                  : "Member"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ACCOUNT */}
      <section className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          Account
        </p>

        <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
          Account information
        </h3>

        <div className="mt-6 space-y-4">

          {/* Email */}
          <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
            <p className="text-xs text-[#746a5e]">
              Email
            </p>

            <p className="mt-1 text-sm font-medium text-[#3f382f]">
              {profile.email}
            </p>
          </div>

          {/* Display name */}
          <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
            <p className="text-xs text-[#746a5e]">
              Display name
            </p>

            <p className="mt-1 text-sm font-medium text-[#3f382f]">
              {profile.display_name || "-"}
            </p>
          </div>

          {/* Status + Role */}
          <div className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
              <p className="text-xs text-[#746a5e]">
                Account status
              </p>

              <p className="mt-1 text-sm font-semibold capitalize text-[#3f382f]">
                {profile.status}
              </p>
            </div>

            <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
              <p className="text-xs text-[#746a5e]">
                Role
              </p>

              <p className="mt-1 text-sm font-semibold text-[#3f382f]">
                {profile.is_admin
                  ? "Administrator"
                  : "Member"}
              </p>
            </div>

          </div>

          {/* Joined + Approved */}
          <div className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
              <p className="text-xs text-[#746a5e]">
                Joined
              </p>

              <p className="mt-1 text-sm font-semibold text-[#3f382f]">
                {formatDate(profile.created_at)}
              </p>
            </div>

            <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
              <p className="text-xs text-[#746a5e]">
                Approved
              </p>

              <p className="mt-1 text-sm font-semibold text-[#3f382f]">
                {formatDate(profile.approved_at)}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* COMING NEXT */}
      <section className="rounded-2xl border border-dashed border-[#d8cec0] bg-[#eee7dc] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          Coming next
        </p>

        <h3 className="mt-2 text-lg font-bold text-[#3f382f]">
          Make this profile yours.
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#746a5e]">
          Profile picture, display name, and other
          personal settings will live here.
        </p>
      </section>

    </div>
  );
}