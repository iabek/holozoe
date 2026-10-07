"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type ScreenTimeData = {
  gaming_minutes: number;
  social_media_minutes: number;
  entertainment_minutes: number;
  productivity_minutes: number;
  other_minutes: number;
};

type DurationInput = {
  hours: number;
  minutes: number;
};

type LeisureDay = {
  extensionMinutes: number;
  usedMinutes: number;
};

type LeisureData = Record<string, LeisureDay>;

const defaultData: ScreenTimeData = {
  gaming_minutes: 0,
  social_media_minutes: 0,
  entertainment_minutes: 0,
  productivity_minutes: 0,
  other_minutes: 0,
};

const categories = [
  {
    key: "gaming_minutes" as const,
    icon: "🎮",
    label: "Gaming",
    description: "Genshin, HSR, ML, ZZZ, etc.",
  },
  {
    key: "social_media_minutes" as const,
    icon: "📱",
    label: "Social Media",
    description: "TikTok, Instagram, X, WhatsApp, etc.",
  },
  {
    key: "entertainment_minutes" as const,
    icon: "🎬",
    label: "Entertainment",
    description: "Netflix, YouTube, streaming, etc.",
  },
  {
    key: "productivity_minutes" as const,
    icon: "📚",
    label: "Productivity",
    description: "Study, skripsi, work, etc.",
  },
  {
    key: "other_minutes" as const,
    icon: "🌐",
    label: "Other",
    description: "Aktivitas lain di layar.",
  },
];

function formatMinutes(minutes: number) {
  const safeMinutes = Math.max(
    0,
    Math.floor(Number(minutes) || 0)
  );

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} menit`;
  }

  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${remainingMinutes} menit`;
}

function minutesToDuration(minutes: number): DurationInput {
  const safeMinutes = Math.max(
    0,
    Math.floor(Number(minutes) || 0)
  );

  return {
    hours: Math.floor(safeMinutes / 60),
    minutes: safeMinutes % 60,
  };
}

function durationToMinutes(duration: DurationInput) {
  const hours = Math.max(
    0,
    Math.floor(Number(duration.hours) || 0)
  );

  const minutes = Math.max(
    0,
    Math.floor(Number(duration.minutes) || 0)
  );

  return hours * 60 + minutes;
}

function getToday() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadLeisureData(): LeisureData {
  const saved = localStorage.getItem(
    "life-game-leisure"
  );

  if (!saved) {
    return {};
  }

  try {
    const parsed = JSON.parse(saved);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
}

export default function ScreenTime() {
  const [data, setData] =
    useState<ScreenTimeData>(defaultData);

  const [durations, setDurations] =
    useState<
      Record<
        keyof ScreenTimeData,
        DurationInput
      >
    >({
      gaming_minutes: {
        hours: 0,
        minutes: 0,
      },

      social_media_minutes: {
        hours: 0,
        minutes: 0,
      },

      entertainment_minutes: {
        hours: 0,
        minutes: 0,
      },

      productivity_minutes: {
        hours: 0,
        minutes: 0,
      },

      other_minutes: {
        hours: 0,
        minutes: 0,
      },
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const totalMinutes = useMemo(() => {
    return Object.values(data).reduce(
      (total, minutes) =>
        total + Number(minutes || 0),
      0
    );
  }, [data]);

  /*
   * LEISURE
   *
   * Hanya Gaming + Entertainment
   * yang dihitung sebagai Leisure.
   */
  const leisureMinutes = useMemo(() => {
    return (
      Number(data.gaming_minutes || 0) +
      Number(
        data.entertainment_minutes || 0
      )
    );
  }, [data]);

  async function loadToday() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "SCREEN TIME: USER ERROR",
        userError
      );

      setLoading(false);
      return;
    }

    const today = getToday();

    const {
      data: screenTime,
      error,
    } = await supabase
      .from("screen_time")
      .select(
        "gaming_minutes, social_media_minutes, entertainment_minutes, productivity_minutes, other_minutes"
      )
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (error) {
      console.error(
        "SCREEN TIME: LOAD ERROR",
        error
      );

      setMessage(
        "Gagal memuat screen time."
      );

      setLoading(false);
      return;
    }

    if (screenTime) {
      const nextData: ScreenTimeData = {
        gaming_minutes: Number(
          screenTime.gaming_minutes ?? 0
        ),

        social_media_minutes: Number(
          screenTime.social_media_minutes ?? 0
        ),

        entertainment_minutes: Number(
          screenTime.entertainment_minutes ?? 0
        ),

        productivity_minutes: Number(
          screenTime.productivity_minutes ?? 0
        ),

        other_minutes: Number(
          screenTime.other_minutes ?? 0
        ),
      };

      setData(nextData);

      setDurations({
        gaming_minutes:
          minutesToDuration(
            nextData.gaming_minutes
          ),

        social_media_minutes:
          minutesToDuration(
            nextData.social_media_minutes
          ),

        entertainment_minutes:
          minutesToDuration(
            nextData.entertainment_minutes
          ),

        productivity_minutes:
          minutesToDuration(
            nextData.productivity_minutes
          ),

        other_minutes:
          minutesToDuration(
            nextData.other_minutes
          ),
      });
    } else {
      setData(defaultData);

      setDurations({
        gaming_minutes: {
          hours: 0,
          minutes: 0,
        },

        social_media_minutes: {
          hours: 0,
          minutes: 0,
        },

        entertainment_minutes: {
          hours: 0,
          minutes: 0,
        },

        productivity_minutes: {
          hours: 0,
          minutes: 0,
        },

        other_minutes: {
          hours: 0,
          minutes: 0,
        },
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadToday();
  }, []);

  function updateDuration(
    key: keyof ScreenTimeData,
    field: "hours" | "minutes",
    value: string
  ) {
    const parsed =
      value === ""
        ? 0
        : Number(value);

    const safeValue =
      Number.isFinite(parsed) &&
      parsed >= 0
        ? Math.floor(parsed)
        : 0;

    setDurations((current) => {
      const nextDuration = {
        ...current[key],
        [field]: safeValue,
      };

      const nextMinutes =
        durationToMinutes(
          nextDuration
        );

      setData((currentData) => ({
        ...currentData,
        [key]: nextMinutes,
      }));

      return {
        ...current,
        [key]: nextDuration,
      };
    });
  }

  /*
   * HUBUNGKAN SCREEN TIME
   * KE LIFE GAME LEISURE
   *
   * Gaming + Entertainment
   * = Leisure usedMinutes.
   *
   * Extension yang sudah ada
   * tetap dipertahankan.
   */
  function syncLeisureFromScreenTime(
    usedMinutes: number
  ) {
    const today = getToday();

    const allLeisure =
      loadLeisureData();

    const previousLeisure =
      allLeisure[today];

    allLeisure[today] = {
      extensionMinutes: Math.max(
        0,
        Number(
          previousLeisure?.extensionMinutes ||
            0
        )
      ),

      usedMinutes: Math.max(
        0,
        Math.floor(
          Number(usedMinutes) || 0
        )
      ),
    };

    localStorage.setItem(
      "life-game-leisure",
      JSON.stringify(allLeisure)
    );
  }

  async function saveScreenTime() {
    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "SCREEN TIME: USER ERROR",
        userError
      );

      setMessage(
        "User belum login."
      );

      setSaving(false);
      return;
    }

    const today = getToday();

    const payload = {
      user_id: user.id,

      date: today,

      gaming_minutes: Number(
        data.gaming_minutes || 0
      ),

      social_media_minutes: Number(
        data.social_media_minutes || 0
      ),

      entertainment_minutes: Number(
        data.entertainment_minutes || 0
      ),

      productivity_minutes: Number(
        data.productivity_minutes || 0
      ),

      other_minutes: Number(
        data.other_minutes || 0
      ),

      updated_at:
        new Date().toISOString(),
    };

    const { error } =
      await supabase
        .from("screen_time")
        .upsert(payload, {
          onConflict:
            "user_id,date",
        });

    if (error) {
      console.error(
        "SCREEN TIME: SAVE ERROR",
        error
      );

      setMessage(
        "Gagal menyimpan screen time."
      );

      setSaving(false);
      return;
    }

    /*
     * Setelah Screen Time berhasil
     * disimpan ke Supabase,
     * Leisure Life Game ikut diperbarui.
     */
    syncLeisureFromScreenTime(
      leisureMinutes
    );

    /*
     * Kasih tahu Dashboard dan Today
     * bahwa data Life Game berubah.
     */
    window.dispatchEvent(
      new Event("life-game-updated")
    );

    setMessage(
      "Screen time & Leisure tersimpan ✓"
    );

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-zinc-500">
          Loading screen time...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <p className="text-sm font-medium text-zinc-500">
          Life Game
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
          📱 Screen Time
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Catat penggunaan layar harianmu
          dan lihat ke mana waktumu pergi.
        </p>
      </div>

      {/* TOTAL */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">
          Today&apos;s Screen Time
        </p>

        <div className="mt-2 flex items-end gap-3">
          <h2 className="text-5xl font-bold tracking-tight text-zinc-900">
            {formatMinutes(totalMinutes)}
          </h2>

          <span className="mb-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            total
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all"
            style={{
              width: `${Math.min(
                (totalMinutes / 600) *
                  100,
                100
              )}%`,
            }}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* LEISURE */}
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">
              Leisure
            </p>

            <p className="mt-1 text-xl font-bold text-zinc-900">
              {formatMinutes(
                leisureMinutes
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Gaming + Entertainment
            </p>
          </div>

          {/* NON LEISURE */}
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">
              Non-leisure
            </p>

            <p className="mt-1 text-xl font-bold text-zinc-900">
              {formatMinutes(
                Math.max(
                  totalMinutes -
                    leisureMinutes,
                  0
                )
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Everything else
            </p>
          </div>

          {/* BASE */}
          <div className="col-span-2 rounded-2xl bg-zinc-50 p-4 sm:col-span-1">
            <p className="text-xs text-zinc-500">
              Leisure Base
            </p>

            <p className="mt-1 text-xl font-bold text-zinc-900">
              2 jam
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Life Game
            </p>
          </div>
        </div>
      </div>

      {/* BREAKDOWN */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-zinc-900">
            Today&apos;s Breakdown
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Masukkan berapa jam dan menit
            yang kamu gunakan untuk setiap
            kategori.
          </p>
        </div>

        <div className="space-y-3">
          {categories.map(
            (category) => {
              const duration =
                durations[
                  category.key
                ];

              return (
                <div
                  key={category.key}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                      {category.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900">
                        {category.label}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {
                          category.description
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end gap-3">
                    {/* JAM */}
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-zinc-400">
                        Jam
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          duration.hours
                        }
                        onChange={(
                          event
                        ) =>
                          updateDuration(
                            category.key,
                            "hours",
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-right text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                      />
                    </div>

                    <div className="pb-3 text-sm font-medium text-zinc-400">
                      :
                    </div>

                    {/* MENIT */}
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-zinc-400">
                        Menit
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={
                          duration.minutes
                        }
                        onChange={(
                          event
                        ) =>
                          updateDuration(
                            category.key,
                            "minutes",
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-right text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                      />
                    </div>

                    {/* PREVIEW */}
                    <div className="pb-2.5 text-xs text-zinc-400">
                      {formatMinutes(
                        data[
                          category.key
                        ]
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* SAVE */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-5">
          <div>
            <p className="text-xs text-zinc-500">
              Total
            </p>

            <p className="text-xl font-bold text-zinc-900">
              {formatMinutes(
                totalMinutes
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={
              saveScreenTime
            }
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Screen Time"}
          </button>
        </div>

        {message && (
          <p className="mt-4 text-center text-sm text-zinc-500">
            {message}
          </p>
        )}
      </div>

      {/* INFO */}
      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
        <h2 className="font-bold text-zinc-900">
          How Life Game reads this
        </h2>

        <div className="mt-4 space-y-3 text-sm text-zinc-600">
          <div className="flex items-start gap-3">
            <span>🎮</span>

            <p>
              <strong className="text-zinc-900">
                Gaming
              </strong>{" "}
              masuk ke Leisure.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span>🎬</span>

            <p>
              <strong className="text-zinc-900">
                Entertainment
              </strong>{" "}
              masuk ke Leisure.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span>📱</span>

            <p>
              <strong className="text-zinc-900">
                Social Media
              </strong>{" "}
              seperti TikTok tidak dihitung
              sebagai Leisure.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span>📚</span>

            <p>
              <strong className="text-zinc-900">
                Productivity
              </strong>{" "}
              tidak dihitung sebagai Leisure.
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Automatic connection
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Setelah Screen Time disimpan,
              Gaming + Entertainment otomatis
              menjadi pemakaian Leisure hari
              ini di Life Game.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}