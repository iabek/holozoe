"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
};

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createClient();

  async function loadProfiles() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminProfile?.is_admin) {
      setMessage("You do not have permission to access this page.");
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, display_name, status, created_at, approved_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setProfiles(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function updateStatus(
    profileId: string,
    newStatus: "approved" | "rejected"
  ) {
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        status: newStatus,
        approved_at:
          newStatus === "approved"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", profileId);

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    setMessage(
      newStatus === "approved"
        ? "Account approved."
        : "Account rejected."
    );

    await loadProfiles();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] text-[#3f382f]">
        <p className="text-sm text-[#746a5e]">
          Loading admin panel...
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] px-6 text-[#3f382f]">
        <div className="w-full max-w-md rounded-2xl bg-[#f7f2ea] p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <h1 className="mt-3 text-2xl font-bold">
            Access denied.
          </h1>

          <p className="mt-3 text-sm text-[#746a5e]">
            You do not have permission to access the admin panel.
          </p>
        </div>
      </main>
    );
  }

  const pendingProfiles = profiles.filter(
    (profile) => profile.status === "pending"
  );

  return (
    <main className="min-h-screen bg-[#e8dfd2] px-6 py-10 text-[#3f382f]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Admin
          </h1>

          <p className="mt-2 text-sm text-[#746a5e]">
            Manage who can enter Life Game.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-[#d8cec0] bg-[#f7f2ea] p-4">
            <p className="text-sm text-[#746a5e]">
              {message}
            </p>
          </div>
        )}

        <div className="mb-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#746a5e]">
                Pending accounts
              </p>

              <p className="mt-1 text-3xl font-bold">
                {pendingProfiles.length}
              </p>
            </div>

            <div className="text-3xl">
              ⏳
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {profile.email}
                  </p>

                  {profile.display_name && (
                    <p className="mt-1 text-sm text-[#746a5e]">
                      {profile.display_name}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-[#8a7e70]">
                    Registered{" "}
                    {new Date(
                      profile.created_at
                    ).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      profile.status === "approved"
                        ? "bg-[#dfe7d8] text-[#536047]"
                        : profile.status === "rejected"
                        ? "bg-[#eadbd5] text-[#795c52]"
                        : "bg-[#ebe3d8] text-[#746a5e]"
                    }`}
                  >
                    {profile.status}
                  </span>

                  {profile.status === "pending" && (
                    <>
                      <button
                        onClick={() =>
                          updateStatus(
                            profile.id,
                            "approved"
                          )
                        }
                        className="rounded-xl bg-[#8b6f5a] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#765a46]"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(
                            profile.id,
                            "rejected"
                          )
                        }
                        className="rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-2 text-xs font-medium text-[#746a5e] transition hover:bg-[#e3d9cd]"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {profile.status === "rejected" && (
                    <button
                      onClick={() =>
                        updateStatus(
                          profile.id,
                          "approved"
                        )
                      }
                      className="rounded-xl bg-[#8b6f5a] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#765a46]"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {profiles.length === 0 && (
            <div className="rounded-2xl bg-[#f7f2ea] p-8 text-center shadow-sm">
              <p className="text-sm text-[#746a5e]">
                No accounts found.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}