"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type GrowthStatus = "active" | "completed";
type GrowthResult = "yes" | "partly" | "no";

type Growth = {
  id: string;
  user_id: string;
  title: string;
  solution: string | null;
  status: GrowthStatus;
  current_attempt: number;
  created_at: string;
  updated_at: string;
};

type GrowthAttempt = {
  id: string;
  growth_id: string;
  user_id: string;
  attempt_number: number;
  result: GrowthResult | null;
  reflection: string | null;
  solution: string | null;
  checked_at: string | null;
  created_at: string;
};

const supabase = createClient();

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function getDateKey(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function resultLabel(
  result: GrowthResult | null
) {
  if (result === "yes") {
    return "Worked";
  }

  if (result === "partly") {
    return "Partly";
  }

  if (result === "no") {
    return "Didn't work";
  }

  return "Pending";
}

function resultClass(
  result: GrowthResult | null
) {
  if (result === "yes") {
    return "bg-[#dfe9df] text-[#526752]";
  }

  if (result === "partly") {
    return "bg-[#eee5d1] text-[#766445]";
  }

  if (result === "no") {
    return "bg-[#eadbd6] text-[#795c53]";
  }

  return "bg-[#e4dbcf] text-[#6e6256]";
}

function nextDayLabel() {
  const date = new Date();

  date.setDate(
    date.getDate() + 1
  );

  return date.toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "short",
    }
  );
}

export default function Grow() {
  const [growths, setGrowths] =
    useState<Growth[]>([]);

  const [attempts, setAttempts] =
    useState<GrowthAttempt[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [newTitle, setNewTitle] =
    useState("");

  const [newSolution, setNewSolution] =
    useState("");

  const [checkingGrowth, setCheckingGrowth] =
    useState<string | null>(null);

  const [selectedResult, setSelectedResult] =
    useState<GrowthResult | null>(null);

  const [reflection, setReflection] =
    useState("");

  const [nextSolution, setNextSolution] =
    useState("");

  const [expandedHistory, setExpandedHistory] =
    useState(false);

  async function loadData() {
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Kamu belum login."
      );

      setLoading(false);

      return;
    }

    const [
      growthResult,
      attemptResult,
    ] = await Promise.all([
      supabase
        .from("growths")
        .select("*")
        .eq("user_id", user.id)
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from("growth_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),
    ]);

    if (growthResult.error) {
      console.error(
        "GROWTH LOAD ERROR:",
        growthResult.error
      );

      setError(
        growthResult.error.message
      );

      setLoading(false);

      return;
    }

    if (attemptResult.error) {
      console.error(
        "GROWTH ATTEMPTS LOAD ERROR:",
        attemptResult.error
      );

      setError(
        attemptResult.error.message
      );

      setLoading(false);

      return;
    }

    setGrowths(
      (growthResult.data ??
        []) as Growth[]
    );

    setAttempts(
      (attemptResult.data ??
        []) as GrowthAttempt[]
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const activeGrowths =
    useMemo(
      () =>
        growths.filter(
          (growth) =>
            growth.status ===
            "active"
        ),
      [growths]
    );

  const completedGrowths =
    useMemo(
      () =>
        growths.filter(
          (growth) =>
            growth.status ===
            "completed"
        ),
      [growths]
    );

  function getAttemptsForGrowth(
    growthId: string
  ) {
    return attempts
      .filter(
        (attempt) =>
          attempt.growth_id ===
          growthId
      )
      .sort(
        (a, b) =>
          b.attempt_number -
          a.attempt_number
      );
  }

  function getCurrentAttempt(
    growth: Growth
  ) {
    return (
      attempts.find(
        (attempt) =>
          attempt.growth_id ===
            growth.id &&
          attempt.attempt_number ===
            growth.current_attempt
      ) ?? null
    );
  }

  function canCheck(
    growth: Growth
  ) {
    const currentAttempt =
      getCurrentAttempt(growth);

    if (!currentAttempt) {
      return false;
    }

    if (
      currentAttempt.checked_at ===
      null
    ) {
      const createdKey =
        getDateKey(
          currentAttempt.created_at
        );

      return (
        createdKey !==
        getTodayKey()
      );
    }

    return (
      getDateKey(
        currentAttempt.checked_at
      ) !== getTodayKey()
    );
  }

  function openCheck(
    growth: Growth
  ) {
    if (!canCheck(growth)) {
      return;
    }

    setCheckingGrowth(
      growth.id
    );

    setSelectedResult(null);
    setReflection("");

    setNextSolution(
      growth.solution ?? ""
    );
  }

  function closeCheck() {
    if (saving) {
      return;
    }

    setCheckingGrowth(null);
    setSelectedResult(null);
    setReflection("");
    setNextSolution("");
  }

  async function createGrowth() {
    const title =
      newTitle.trim();

    const solution =
      newSolution.trim();

    if (
      !title ||
      !solution ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Kamu belum login."
      );

      setSaving(false);

      return;
    }

    const {
      data: growth,
      error: growthError,
    } = await supabase
      .from("growths")
      .insert({
        user_id: user.id,
        title,
        solution,
        status: "active",
        current_attempt: 1,
      })
      .select()
      .single();

    if (
      growthError ||
      !growth
    ) {
      console.error(
        "GROWTH CREATE ERROR:",
        growthError
      );

      setError(
        growthError?.message ??
          "Gagal membuat Growth."
      );

      setSaving(false);

      return;
    }

    const {
      error: attemptError,
    } = await supabase
      .from("growth_attempts")
      .insert({
        growth_id: growth.id,
        user_id: user.id,
        attempt_number: 1,
        solution,
      });

    if (attemptError) {
      console.error(
        "GROWTH ATTEMPT CREATE ERROR:",
        attemptError
      );

      await supabase
        .from("growths")
        .delete()
        .eq("id", growth.id)
        .eq(
          "user_id",
          user.id
        );

      setError(
        attemptError.message
      );

      setSaving(false);

      return;
    }

    setNewTitle("");
    setNewSolution("");
    setCreating(false);

    await loadData();

    setSaving(false);
  }

  async function submitCheck() {
    if (
      !checkingGrowth ||
      !selectedResult ||
      saving
    ) {
      return;
    }

    const growth =
      growths.find(
        (item) =>
          item.id ===
          checkingGrowth
      );

    if (!growth) {
      return;
    }

    const currentAttempt =
      getCurrentAttempt(growth);

    if (!currentAttempt) {
      return;
    }

    if (
      selectedResult !==
        "yes" &&
      !nextSolution.trim()
    ) {
      setError(
        "Tentukan solusi berikutnya dulu."
      );

      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Kamu belum login."
      );

      setSaving(false);

      return;
    }

    const checkedAt =
      new Date().toISOString();

    const {
      error:
        updateAttemptError,
    } = await supabase
      .from("growth_attempts")
      .update({
        result:
          selectedResult,

        reflection:
          reflection.trim() ||
          null,

        checked_at:
          checkedAt,

        solution:
          selectedResult ===
          "yes"
            ? currentAttempt.solution
            : nextSolution.trim(),
      })
      .eq(
        "id",
        currentAttempt.id
      )
      .eq(
        "user_id",
        user.id
      );

    if (updateAttemptError) {
      console.error(
        "GROWTH CHECK ERROR:",
        updateAttemptError
      );

      setError(
        updateAttemptError.message
      );

      setSaving(false);

      return;
    }

    if (
      selectedResult ===
      "yes"
    ) {
      const {
        error:
          completeError,
      } = await supabase
        .from("growths")
        .update({
          status:
            "completed",

          updated_at:
            checkedAt,
        })
        .eq(
          "id",
          growth.id
        )
        .eq(
          "user_id",
          user.id
        );

      if (completeError) {
        console.error(
          "GROWTH COMPLETE ERROR:",
          completeError
        );

        setError(
          completeError.message
        );

        setSaving(false);

        return;
      }
    } else {
      const nextAttemptNumber =
        growth.current_attempt +
        1;

      const {
        error:
          nextAttemptError,
      } = await supabase
        .from(
          "growth_attempts"
        )
        .insert({
          growth_id:
            growth.id,

          user_id:
            user.id,

          attempt_number:
            nextAttemptNumber,

          solution:
            nextSolution.trim(),
        });

      if (nextAttemptError) {
        console.error(
          "NEXT GROWTH ATTEMPT ERROR:",
          nextAttemptError
        );

        setError(
          nextAttemptError.message
        );

        setSaving(false);

        return;
      }

      const {
        error:
          growthUpdateError,
      } = await supabase
        .from("growths")
        .update({
          solution:
            nextSolution.trim(),

          current_attempt:
            nextAttemptNumber,

          updated_at:
            checkedAt,
        })
        .eq(
          "id",
          growth.id
        )
        .eq(
          "user_id",
          user.id
        );

      if (growthUpdateError) {
        console.error(
          "GROWTH UPDATE ERROR:",
          growthUpdateError
        );

        setError(
          growthUpdateError.message
        );

        setSaving(false);

        return;
      }
    }

    closeCheck();

    await loadData();

    setSaving(false);
  }

  async function deleteGrowth(
    growth: Growth
  ) {
    if (saving) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus Growth "${growth.title}"?\n\nSemua attempt untuk Growth ini juga akan dihapus.`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    const {
      error: deleteError,
    } = await supabase
      .from("growths")
      .delete()
      .eq("id", growth.id);

    if (deleteError) {
      console.error(
        "GROWTH DELETE ERROR:",
        deleteError
      );

      setError(
        deleteError.message
      );

      setSaving(false);

      return;
    }

    await loadData();

    setSaving(false);
  }

  return (
    <div>
      {/* HEADER */}

      <section className="mb-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
              Small changes. Better days.
            </p>

            <h2 className="mt-1 text-3xl font-bold text-[#3f382f]">
              Grow
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746a5e]">
              Notice something you want to
              change, try a solution, then
              check what happened the next day.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setCreating(
                (value) => !value
              )
            }
            className="rounded-xl bg-[#3f382f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#554c42]"
          >
            {creating
              ? "Close"
              : "+ Start a Growth"}
          </button>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-2xl border border-[#d7bcb2] bg-[#f1e2dd] px-4 py-3 text-sm text-[#795c53]">
          {error}
        </div>
      )}

      {/* CREATE */}

      {creating && (
        <section className="mb-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
            New
          </p>

          <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
            What do you want to improve?
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#554c42]">
                What needs to change?
              </label>

              <input
                value={newTitle}
                onChange={(event) =>
                  setNewTitle(
                    event.target.value
                  )
                }
                placeholder="e.g. Stop opening social media after waking up"
                className="w-full rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#3f382f] outline-none transition placeholder:text-[#a79b8e] focus:border-[#a99986]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#554c42]">
                What's your solution?
              </label>

              <textarea
                value={newSolution}
                onChange={(event) =>
                  setNewSolution(
                    event.target.value
                  )
                }
                placeholder="e.g. Don't touch my phone until after breakfast"
                rows={3}
                className="w-full resize-none rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm leading-6 text-[#3f382f] outline-none transition placeholder:text-[#a79b8e] focus:border-[#a99986]"
              />
            </div>

            <button
              type="button"
              disabled={
                !newTitle.trim() ||
                !newSolution.trim() ||
                saving
              }
              onClick={() =>
                void createGrowth()
              }
              className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7d6e5d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Saving..."
                : "Start"}
            </button>
          </div>
        </section>
      )}

      {/* ACTIVE GROWTH */}

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
              In progress
            </p>

            <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
              Your Growth
            </h3>
          </div>

          <span className="rounded-full bg-[#d8cec0] px-3 py-1 text-xs font-semibold text-[#554c42]">
            {activeGrowths.length} active
          </span>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white/60 p-6 text-sm text-[#8a7e70] shadow-sm">
            Loading...
          </div>
        ) : activeGrowths.length ===
          0 ? (
          <div className="rounded-3xl bg-white/60 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee7dc] text-2xl">
              🌱
            </div>

            <h4 className="mt-4 font-semibold text-[#3f382f]">
              Nothing to work on yet.
            </h4>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#8a7e70]">
              Start with one small change.
              You can always improve the
              solution later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGrowths.map(
              (growth) => {
                const currentAttempt =
                  getCurrentAttempt(
                    growth
                  );

                const attemptsForGrowth =
                  getAttemptsForGrowth(
                    growth.id
                  );

                const checkedToday =
                  currentAttempt?.checked_at
                    ? getDateKey(
                        currentAttempt.checked_at
                      ) ===
                      getTodayKey()
                    : false;

                const ready =
                  canCheck(
                    growth
                  );

                return (
                  <article
                    key={
                      growth.id
                    }
                    className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#dfe9df] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#526752]">
                            Attempt{" "}
                            {
                              growth.current_attempt
                            }
                          </span>

                          <span className="text-xs text-[#9a8e81]">
                            Started{" "}
                            {formatDate(
                              growth.created_at
                            )}
                          </span>
                        </div>

                        <h4 className="mt-3 text-xl font-bold text-[#3f382f]">
                          {
                            growth.title
                          }
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteGrowth(
                            growth
                          )
                        }
                        className="rounded-lg px-2 py-1 text-xs text-[#9a8e81] transition hover:bg-[#eadbd6] hover:text-[#795c53]"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-[#eee7dc] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8a7e70]">
                          Current change
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#554c42]">
                          {
                            growth.title
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#eee7dc] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8a7e70]">
                          Tomorrow's plan
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#554c42]">
                          {growth.solution ||
                            "No solution yet."}
                        </p>
                      </div>
                    </div>

                    {currentAttempt?.reflection && (
                      <div className="mt-3 rounded-2xl bg-[#f5f0e8] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8a7e70]">
                          Last reflection
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#554c42]">
                          {
                            currentAttempt.reflection
                          }
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8cec0] pt-4">
                      <div className="text-xs text-[#8a7e70]">
                        {checkedToday
                          ? `Checked today · next check ${nextDayLabel()}`
                          : ready
                            ? "Ready for today's check"
                            : "Try this tomorrow, then check back here."}
                      </div>

                      <button
                        type="button"
                        disabled={
                          !ready ||
                          saving
                        }
                        onClick={() =>
                          openCheck(
                            growth
                          )
                        }
                        className="rounded-xl bg-[#ddd4c7] px-4 py-2.5 text-sm font-semibold text-[#3f382f] transition hover:bg-[#d1c6b7] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Check result
                      </button>
                    </div>

                    {attemptsForGrowth.length >
                      1 && (
                      <div className="mt-4 border-t border-[#d8cec0] pt-4">
                        <p className="text-xs text-[#8a7e70]">
                          {
                            attemptsForGrowth.length
                          }{" "}
                          attempts ·{" "}
                          {
                            attemptsForGrowth.filter(
                              (
                                attempt
                              ) =>
                                attempt.result ===
                                "yes"
                            ).length
                          }{" "}
                          worked
                        </p>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* CHECK MODAL */}

      {checkingGrowth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3f382f]/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#f7f2ea] p-5 shadow-2xl sm:p-6">
            {(() => {
              const growth =
                growths.find(
                  (item) =>
                    item.id ===
                    checkingGrowth
                );

              if (!growth) {
                return null;
              }

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
                        Daily check
                      </p>

                      <h3 className="mt-1 text-2xl font-bold text-[#3f382f]">
                        Did it work?
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={
                        closeCheck
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[#746a5e] transition hover:bg-[#e4dbcf]"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#eee7dc] p-4">
                    <p className="text-sm font-semibold text-[#3f382f]">
                      {
                        growth.title
                      }
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#746a5e]">
                      {
                        growth.solution
                      }
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {(
                      [
                        [
                          "yes",
                          "✓",
                          "Yes",
                        ],
                        [
                          "partly",
                          "~",
                          "Partly",
                        ],
                        [
                          "no",
                          "×",
                          "No",
                        ],
                      ] as [
                        GrowthResult,
                        string,
                        string
                      ][]
                    ).map(
                      ([
                        value,
                        symbol,
                        label,
                      ]) => (
                        <button
                          key={
                            value
                          }
                          type="button"
                          onClick={() =>
                            setSelectedResult(
                              value
                            )
                          }
                          className={`rounded-2xl border px-3 py-4 text-center transition ${
                            selectedResult ===
                            value
                              ? "border-[#8f806d] bg-[#e4dbcf]"
                              : "border-[#d8cec0] bg-white/50 hover:bg-[#eee7dc]"
                          }`}
                        >
                          <span className="block text-xl font-bold">
                            {
                              symbol
                            }
                          </span>

                          <span className="mt-1 block text-xs font-semibold">
                            {
                              label
                            }
                          </span>
                        </button>
                      )
                    )}
                  </div>

                  {selectedResult &&
                    selectedResult !==
                      "yes" && (
                      <div className="mt-5 space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#554c42]">
                            What got in the way?
                          </label>

                          <textarea
                            value={
                              reflection
                            }
                            onChange={(
                              event
                            ) =>
                              setReflection(
                                event.target.value
                              )
                            }
                            rows={3}
                            placeholder="Optional, but useful for understanding what happened."
                            className="w-full resize-none rounded-2xl border border-[#d8cec0] bg-white/50 px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#a79b8e] focus:border-[#a99986]"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-[#554c42]">
                            What's the next solution?
                          </label>

                          <textarea
                            value={
                              nextSolution
                            }
                            onChange={(
                              event
                            ) =>
                              setNextSolution(
                                event.target.value
                              )
                            }
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-[#d8cec0] bg-white/50 px-4 py-3 text-sm leading-6 outline-none focus:border-[#a99986]"
                          />
                        </div>
                      </div>
                    )}

                  {selectedResult ===
                    "yes" && (
                    <div className="mt-5">
                      <label className="mb-2 block text-sm font-medium text-[#554c42]">
                        Anything worth noting?
                      </label>

                      <textarea
                        value={
                          reflection
                        }
                        onChange={(
                          event
                        ) =>
                          setReflection(
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Optional."
                        className="w-full resize-none rounded-2xl border border-[#d8cec0] bg-white/50 px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#a79b8e] focus:border-[#a99986]"
                      />
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={
                        closeCheck
                      }
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#e4dbcf]"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        !selectedResult ||
                        saving ||
                        (selectedResult !==
                          "yes" &&
                          !nextSolution.trim())
                      }
                      onClick={() =>
                        void submitCheck()
                      }
                      className="rounded-xl bg-[#3f382f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#554c42] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving
                        ? "Saving..."
                        : selectedResult ===
                            "yes"
                          ? "Complete"
                          : "Try again"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* HISTORY */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={() =>
            setExpandedHistory(
              (value) => !value
            )
          }
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
              Past
            </p>

            <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
              Growth history
            </h3>
          </div>

          <span className="text-sm text-[#8a7e70]">
            {expandedHistory
              ? "Hide"
              : `${completedGrowths.length} completed`}
          </span>
        </button>

        {expandedHistory && (
          <div className="mt-5 space-y-3">
            {completedGrowths.length ===
            0 ? (
              <p className="rounded-2xl bg-[#eee7dc] p-4 text-sm text-[#8a7e70]">
                No completed Growth
                yet.
              </p>
            ) : (
              completedGrowths.map(
                (growth) => {
                  const growthAttempts =
                    getAttemptsForGrowth(
                      growth.id
                    );

                  const finalAttempt =
                    growthAttempts.find(
                      (attempt) =>
                        attempt.result ===
                        "yes"
                    ) ??
                    growthAttempts[0];

                  return (
                    <div
                      key={
                        growth.id
                      }
                      className="rounded-2xl bg-[#eee7dc] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#3f382f]">
                            {
                              growth.title
                            }
                          </p>

                          <p className="mt-1 text-xs text-[#8a7e70]">
                            {
                              growthAttempts.length
                            }{" "}
                            {growthAttempts.length ===
                            1
                              ? "attempt"
                              : "attempts"}

                            {finalAttempt?.checked_at
                              ? ` · completed ${formatDate(
                                  finalAttempt.checked_at
                                )}`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${resultClass(
                            "yes"
                          )}`}
                        >
                          {
                            resultLabel(
                              "yes"
                            )
                          }
                        </span>
                      </div>

                      {finalAttempt?.reflection && (
                        <p className="mt-3 text-sm leading-6 text-[#746a5e]">
                          {
                            finalAttempt.reflection
                          }
                        </p>
                      )}
                    </div>
                  );
                }
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}