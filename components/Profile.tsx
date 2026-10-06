"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type ProfileData = {
  email: string;
  display_name: string | null;
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
  approved_at: string | null;
};

type ProfileProps = {
  onDisplayNameChange?: (name: string) => void;
};

export default function Profile({
  onDisplayNameChange,
}: ProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
      setDisplayName(data.display_name || "");

      const name = data.display_name || "Life Game Player";

      onDisplayNameChange?.(name);

      setLoading(false);
    }

    loadProfile();
  }, [onDisplayNameChange]);

  async function handleSaveDisplayName() {
    if (!profile) return;

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setMessage("Display name cannot be empty.");
      return;
    }

    if (trimmedName.length > 30) {
      setMessage("Display name must be 30 characters or less.");
      return;
    }

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
      })
      .eq("id", user.id);

    if (error) {
      console.error("DISPLAY NAME UPDATE ERROR:", error);
      setMessage("Failed to update display name.");
      setSaving(false);
      return;
    }

    setProfile({
      ...profile,
      display_name: trimmedName,
    });

    setDisplayName(trimmedName);
    setEditingName(false);

    // Update Sidebar langsung
    onDisplayNameChange?.(trimmedName);

    // Beri tahu komponen lain bahwa nama berubah
    window.dispatchEvent(
      new CustomEvent("life-game-profile-updated", {
        detail: {
          displayName: trimmedName,
        },
      })
    );

    setMessage("Display name updated.");
    setSaving(false);
  }

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
      <section className="rounded-2xl bg-[#f7f2ea] p-8 shadow-sm">
        <p className="text-sm text-[#746a5e]">
          Loading your profile...
        </p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="rounded-2xl bg-[#f7f2ea] p-8 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
          Profile
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#3f382f]">
          Profile not found.
        </h2>

        <p className="mt-2 text-sm text-[#746a5e]">
          Your Life Game profile could not be loaded.
        </p>
      </section>
    );
  }

  const currentName =
    profile.display_name || "Life Game Player";

  return (
    <div className="space-y-6">
      {/* PROFILE HEADER */}
      <section className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-5">
          {/* PROFILE PHOTO */}
          <button
            type="button"
            className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d8cec0] text-4xl transition hover:bg-[#cec2b4]"
            title="Profile picture"
          >
            <span>👤</span>

            <span className="absolute inset-0 flex items-center justify-center bg-[#3f382f]/60 px-2 text-center text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Change photo
            </span>
          </button>

          {/* IDENTITY */}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Your profile
            </p>

            {/* NAME + EDIT */}
            {!editingName ? (
              <div className="mt-1 flex items-center gap-2">
                <h2 className="truncate text-2xl font-bold text-[#3f382f]">
                  {currentName}
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setEditingName(true);
                    setMessage("");
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8b6f5a] transition hover:bg-[#ebe3d8] hover:text-[#765a46]"
                  title="Edit nickname"
                  aria-label="Edit nickname"
                >
                  ✎
                </button>
              </div>
            ) : (
              <div className="mt-2 flex max-w-md items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setMessage("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveDisplayName();
                    }

                    if (e.key === "Escape") {
                      setDisplayName(
                        profile.display_name || ""
                      );
                      setEditingName(false);
                      setMessage("");
                    }
                  }}
                  maxLength={30}
                  placeholder="Your nickname"
                  className="min-w-0 flex-1 rounded-lg border border-[#d8cec0] bg-[#ebe3d8] px-3 py-2 text-lg font-semibold text-[#3f382f] outline-none placeholder:text-[#a89c8e] focus:border-[#8b6f5a]"
                />

                <button
                  type="button"
                  onClick={handleSaveDisplayName}
                  disabled={saving}
                  className="rounded-lg bg-[#8b6f5a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#765a46] disabled:opacity-50"
                >
                  {saving ? "..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDisplayName(
                      profile.display_name || ""
                    );
                    setEditingName(false);
                    setMessage("");
                  }}
                  disabled={saving}
                  className="rounded-lg px-2 py-2 text-xs text-[#746a5e] transition hover:bg-[#ebe3d8]"
                >
                  Cancel
                </button>
              </div>
            )}

            <p className="mt-1 text-sm text-[#746a5e]">
              {profile.email}
            </p>

            <div className="mt-3 flex items-center gap-2">
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

            {message && (
              <p className="mt-2 text-xs text-[#746a5e]">
                {message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ACCOUNT INFORMATION */}
      <section className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          Account
        </p>

        <h2 className="mt-1 text-2xl font-bold text-[#3f382f]">
          Account information
        </h2>

        <p className="mt-2 text-sm text-[#746a5e]">
          Your Life Game account details.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#ebe3d8] p-5">
            <p className="text-xs text-[#8a7e70]">
              Email
            </p>

            <p className="mt-2 break-all text-base font-semibold text-[#3f382f]">
              {profile.email}
            </p>
          </div>

          <div className="rounded-xl bg-[#ebe3d8] p-5">
            <p className="text-xs text-[#8a7e70]">
              Account status
            </p>

            <p className="mt-2 text-base font-semibold capitalize text-[#3f382f]">
              {profile.status}
            </p>
          </div>

          <div className="rounded-xl bg-[#ebe3d8] p-5">
            <p className="text-xs text-[#8a7e70]">
              Role
            </p>

            <p className="mt-2 text-base font-semibold text-[#3f382f]">
              {profile.is_admin
                ? "Administrator"
                : "Member"}
            </p>
          </div>

          <div className="rounded-xl bg-[#ebe3d8] p-5">
            <p className="text-xs text-[#8a7e70]">
              Joined
            </p>

            <p className="mt-2 text-base font-semibold text-[#3f382f]">
              {formatDate(profile.created_at)}
            </p>
          </div>

          <div className="rounded-xl bg-[#ebe3d8] p-5">
            <p className="text-xs text-[#8a7e70]">
              Approved
            </p>

            <p className="mt-2 text-base font-semibold text-[#3f382f]">
              {formatDate(profile.approved_at)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}