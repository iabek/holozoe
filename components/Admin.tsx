"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type UserStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "banned";

type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  status: UserStatus;
  is_admin: boolean;
  created_at: string;
  approved_at: string | null;
};

export default function Admin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function loadUsers() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, display_name, status, is_admin, created_at, approved_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "ADMIN LOAD USERS ERROR:",
        error
      );

      setError("Failed to load users.");
      setLoading(false);
      return;
    }

    setUsers(
      (data ?? []) as UserProfile[]
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function updateStatus(
    userId: string,
    status: UserStatus
  ) {
    setSavingId(userId);
    setError(null);

    const updateData = {
      status,
      approved_at:
        status === "approved"
          ? new Date().toISOString()
          : null,
    };

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error(
        "ADMIN UPDATE USER ERROR:",
        error
      );

      setError("Failed to update user.");
      setSavingId(null);
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              status,
              approved_at:
                updateData.approved_at,
            }
          : user
      )
    );

    setSavingId(null);
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getStatusLabel(
    status: UserStatus
  ) {
    if (status === "approved") {
      return "Approved";
    }

    if (status === "rejected") {
      return "Rejected";
    }

    if (status === "banned") {
      return "Banned";
    }

    return "Pending";
  }

  function getStatusClass(
    status: UserStatus
  ) {
    if (status === "approved") {
      return "bg-[#dce5d8] text-[#53624d]";
    }

    if (status === "banned") {
      return "bg-[#ead9d4] text-[#765d55]";
    }

    if (status === "rejected") {
      return "bg-[#e8dfd2] text-[#8a7e70]";
    }

    return "bg-[#e8dfd2] text-[#746a5e]";
  }

  return (
    <section>
      {/* HEADER */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          System
        </p>

        <h2 className="mt-1 text-2xl font-bold text-[#3f382f]">
          Admin Panel
        </h2>

        <p className="mt-2 text-sm text-[#746a5e]">
          Manage Life Game accounts and access.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#765d55]">
          {error}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] p-6 text-sm text-[#746a5e]">
          Loading users...
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] shadow-sm">
          {/* TABLE HEADER */}
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-4 border-b border-[#d8cec0] px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#8a7e70] md:grid">
            <span>User</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Action</span>
          </div>

          {/* USERS */}
          <div className="divide-y divide-[#d8cec0]">
            {users.length === 0 ? (
              <div className="p-6 text-sm text-[#746a5e]">
                No users found.
              </div>
            ) : (
              users.map((user) => {
                const saving =
                  savingId === user.id;

                return (
                  <div
                    key={user.id}
                    className="grid gap-4 px-5 py-5 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] md:items-center"
                  >
                    {/* USER */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#3f382f]">
                        {user.display_name?.trim() ||
                          "No nickname"}
                      </p>

                      <p className="mt-1 truncate text-xs text-[#8a7e70]">
                        {user.email}
                      </p>

                      {user.is_admin && (
                        <span className="mt-2 inline-block rounded-full bg-[#d8cec0] px-2 py-1 text-[10px] font-semibold text-[#3f382f]">
                          ADMIN
                        </span>
                      )}
                    </div>

                    {/* STATUS */}
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          user.status
                        )}`}
                      >
                        {getStatusLabel(
                          user.status
                        )}
                      </span>
                    </div>

                    {/* JOINED */}
                    <div className="text-xs text-[#746a5e]">
                      {formatDate(
                        user.created_at
                      )}
                    </div>

                    {/* ACTION */}
                    <div className="flex flex-wrap gap-2">
                      {/* PENDING */}
                      {user.status ===
                        "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              updateStatus(
                                user.id,
                                "approved"
                              )
                            }
                            className="rounded-lg bg-[#8b6f5a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving
                              ? "Saving..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              updateStatus(
                                user.id,
                                "rejected"
                              )
                            }
                            className="rounded-lg border border-[#d8cec0] px-3 py-2 text-xs font-semibold text-[#765d55] transition hover:bg-[#e8dfd2] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* APPROVED */}
                      {user.status ===
                        "approved" && (
                        <button
                          type="button"
                          disabled={
                            saving ||
                            user.is_admin
                          }
                          onClick={() =>
                            updateStatus(
                              user.id,
                              "banned"
                            )
                          }
                          className="rounded-lg border border-[#d8cec0] px-3 py-2 text-xs font-semibold text-[#765d55] transition hover:bg-[#e8dfd2] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving
                            ? "Saving..."
                            : "Ban"}
                        </button>
                      )}

                      {/* BANNED */}
                      {user.status ===
                        "banned" && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            updateStatus(
                              user.id,
                              "approved"
                            )
                          }
                          className="rounded-lg bg-[#8b6f5a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving
                            ? "Saving..."
                            : "Unban"}
                        </button>
                      )}

                      {/* REJECTED */}
                      {user.status ===
                        "rejected" && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            updateStatus(
                              user.id,
                              "approved"
                            )
                          }
                          className="rounded-lg bg-[#8b6f5a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving
                            ? "Saving..."
                            : "Approve"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}