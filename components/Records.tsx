"use client";

import { useEffect, useMemo, useState } from "react";

import {
  syncLifeGameStorageFromSupabase,
} from "@/lib/life-game-storage";

import { createClient } from "@/lib/supabase";

type RecordItem = {
  id: string;
  activity: string;
  xp: number;
  stat: string;
  date: string;
  activityId?: string;
  durationMinutes?: number;
  goldEarned?: number;
};

type GoldLedgerItem = {
  id: string;
  type: "EARN" | "SPEND";
  amount: number;
  reason: string;
  date: string;
};

type DailyStats = {
  Energy: number;
  Focus: number;
  Growth: number;
};

type ScreenTimeData = {
  gaming_minutes: number;
  social_media_minutes: number;
  entertainment_minutes: number;
  productivity_minutes: number;
  other_minutes: number;
};

const emptyScreenTime: ScreenTimeData = {
  gaming_minutes: 0,
  social_media_minutes: 0,
  entertainment_minutes: 0,
  productivity_minutes: 0,
  other_minutes: 0,
};

const screenTimeCategories = [
  {
    key: "gaming_minutes" as const,
    icon: "🎮",
    label: "Gaming",
  },
  {
    key: "social_media_minutes" as const,
    icon: "📱",
    label: "Social Media",
  },
  {
    key: "entertainment_minutes" as const,
    icon: "🎬",
    label: "Entertainment",
  },
  {
    key: "productivity_minutes" as const,
    icon: "📚",
    label: "Productivity",
  },
  {
    key: "other_minutes" as const,
    icon: "🌐",
    label: "Other",
  },
];

function getTodayKey() {
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

function getDateKey(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] =
    dateKey.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function changeDateKey(
  dateKey: string,
  amount: number
) {
  const date = parseDateKey(dateKey);

  date.setDate(
    date.getDate() + amount
  );

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatFullDate(
  dateKey: string
) {
  return parseDateKey(
    dateKey
  ).toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatShortDate(
  dateKey: string
) {
  return parseDateKey(
    dateKey
  ).toLocaleDateString(
    "id-ID",
    {
      weekday: "short",
      day: "numeric",
    }
  );
}

function formatMinutes(
  minutes: number
) {
  const safeMinutes = Math.max(
    0,
    Math.round(minutes)
  );

  const hours = Math.floor(
    safeMinutes / 60
  );

  const remainingMinutes =
    safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function loadRecords() {
  const saved =
    localStorage.getItem(
      "life-game-history"
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed as RecordItem[];
    }

    return [];
  } catch {
    return [];
  }
}

function loadGoldLedger() {
  const saved =
    localStorage.getItem(
      "life-game-gold-ledger"
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed as GoldLedgerItem[];
    }

    return [];
  } catch {
    return [];
  }
}

function loadDailyStats() {
  const saved =
    localStorage.getItem(
      "life-game-daily-stats"
    );

  if (!saved) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(saved);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<
        string,
        DailyStats
      >;
    }

    return {};
  } catch {
    return {};
  }
}

export default function Records() {
  const [selectedDate, setSelectedDate] =
    useState(getTodayKey());

  const [records, setRecords] =
    useState<RecordItem[]>([]);

  const [goldLedger, setGoldLedger] =
    useState<GoldLedgerItem[]>([]);

  const [dailyStats, setDailyStats] =
    useState<
      Record<string, DailyStats>
    >({});

  const [
    screenTimeByDate,
    setScreenTimeByDate,
  ] = useState<
    Record<string, ScreenTimeData>
  >({});

  const [loading, setLoading] =
    useState(true);

  const [
    screenTimeLoading,
    setScreenTimeLoading,
  ] = useState(true);

  const [message, setMessage] =
    useState("");

  async function loadHistory() {
    setLoading(true);
    setMessage("");

    await syncLifeGameStorageFromSupabase();

    setRecords(loadRecords());
    setGoldLedger(loadGoldLedger());
    setDailyStats(loadDailyStats());

    setLoading(false);
  }

  async function loadScreenTime() {
    setScreenTimeLoading(true);

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setScreenTimeLoading(false);
      return;
    }

    const endDate =
      parseDateKey(selectedDate);

    const startDate =
      new Date(endDate);

    startDate.setDate(
      startDate.getDate() - 6
    );

    const startYear =
      startDate.getFullYear();

    const startMonth = String(
      startDate.getMonth() + 1
    ).padStart(2, "0");

    const startDay = String(
      startDate.getDate()
    ).padStart(2, "0");

    const startDateKey =
      `${startYear}-${startMonth}-${startDay}`;

    const {
      data,
      error,
    } = await supabase
      .from("screen_time")
      .select(
        "date, gaming_minutes, social_media_minutes, entertainment_minutes, productivity_minutes, other_minutes"
      )
      .eq("user_id", user.id)
      .gte("date", startDateKey)
      .lte("date", selectedDate)
      .order("date", {
        ascending: true,
      });

    if (error) {
      console.error(
        "HISTORY SCREEN TIME ERROR:",
        error
      );

      setMessage(
        "Gagal memuat history Screen Time."
      );

      setScreenTimeLoading(false);
      return;
    }

    const mapped: Record<
      string,
      ScreenTimeData
    > = {};

    (data ?? []).forEach(
      (row) => {
        mapped[row.date] = {
          gaming_minutes: Number(
            row.gaming_minutes ?? 0
          ),
          social_media_minutes: Number(
            row.social_media_minutes ?? 0
          ),
          entertainment_minutes:
            Number(
              row.entertainment_minutes ??
                0
            ),
          productivity_minutes:
            Number(
              row.productivity_minutes ??
                0
            ),
          other_minutes: Number(
            row.other_minutes ?? 0
          ),
        };
      }
    );

    setScreenTimeByDate(mapped);
    setScreenTimeLoading(false);
  }

  useEffect(() => {
    void loadHistory();

    function refresh() {
      void loadHistory();
    }

    window.addEventListener(
      "storage",
      refresh
    );

    window.addEventListener(
      "life-game-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "storage",
        refresh
      );

      window.removeEventListener(
        "life-game-updated",
        refresh
      );
    };
  }, []);

  useEffect(() => {
    void loadScreenTime();
  }, [selectedDate]);

  const selectedRecords =
    useMemo(() => {
      return records
        .filter(
          (record) =>
            getDateKey(record.date) ===
            selectedDate
        )
        .sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        );
    }, [
      records,
      selectedDate,
    ]);

  const selectedGoldLedger =
    useMemo(() => {
      return goldLedger
        .filter(
          (transaction) =>
            getDateKey(
              transaction.date
            ) === selectedDate
        )
        .sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        );
    }, [
      goldLedger,
      selectedDate,
    ]);

  const selectedScreenTime =
    screenTimeByDate[
      selectedDate
    ] ?? emptyScreenTime;

  const selectedScreenTimeTotal =
    Object.values(
      selectedScreenTime
    ).reduce(
      (total, minutes) =>
        total +
        Number(minutes || 0),
      0
    );

  const selectedXp =
    selectedRecords.reduce(
      (total, record) =>
        total +
        Math.max(
          0,
          Number(record.xp || 0)
        ),
      0
    );

  const selectedGold =
    selectedRecords.reduce(
      (total, record) =>
        total +
        Math.max(
          0,
          Number(
            record.goldEarned || 0
          )
        ),
      0
    );

  const selectedStats =
    dailyStats[selectedDate] ?? {
      Energy: 0,
      Focus: 0,
      Growth: 0,
    };

  const lastSevenDays =
    useMemo(() => {
      const days: string[] = [];

      for (
        let index = 6;
        index >= 0;
        index--
      ) {
        days.push(
          changeDateKey(
            selectedDate,
            -index
          )
        );
      }

      return days;
    }, [selectedDate]);

  const weeklySummary =
    useMemo(() => {
      return lastSevenDays.map(
        (date) => {
          const dayRecords =
            records.filter(
              (record) =>
                getDateKey(
                  record.date
                ) === date
            );

          const screenTime =
            screenTimeByDate[date] ??
            emptyScreenTime;

          const totalScreenTime =
            Object.values(
              screenTime
            ).reduce(
              (total, minutes) =>
                total +
                Number(
                  minutes || 0
                ),
              0
            );

          return {
            date,
            xp: dayRecords.reduce(
              (total, record) =>
                total +
                Math.max(
                  0,
                  Number(
                    record.xp || 0
                  )
                ),
              0
            ),
            activities:
              dayRecords.length,
            screenTime:
              totalScreenTime,
          };
        }
      );
    }, [
      lastSevenDays,
      records,
      screenTimeByDate,
    ]);

  function goPreviousDay() {
    setSelectedDate(
      changeDateKey(
        selectedDate,
        -1
      )
    );
  }

  function goNextDay() {
    const today =
      getTodayKey();

    if (selectedDate >= today) {
      return;
    }

    setSelectedDate(
      changeDateKey(
        selectedDate,
        1
      )
    );
  }

  function goToday() {
    setSelectedDate(
      getTodayKey()
    );
  }

  function deleteRecord(
    recordIndex: number
  ) {
    const record =
      selectedRecords[
        recordIndex
      ];

    if (!record) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus record "${record.activity}"?\n\nXP dan Gold dari aktivitas ini akan dikurangi.`
      );

    if (!confirmed) {
      return;
    }

    const actualIndex =
      records.findIndex(
        (item) =>
          item.id === record.id
      );

    if (actualIndex === -1) {
      return;
    }

    const updatedRecords =
      records.filter(
        (_, index) =>
          index !== actualIndex
      );

    localStorage.setItem(
      "life-game-history",
      JSON.stringify(
        updatedRecords
      )
    );

    setRecords(
      updatedRecords
    );

    const xp =
      typeof record.xp ===
      "number"
        ? Math.max(
            0,
            Math.floor(
              record.xp
            )
          )
        : 0;

    const gold =
      typeof record.goldEarned ===
      "number"
        ? Math.max(
            0,
            Math.floor(
              record.goldEarned
            )
          )
        : 0;

    const currentXp =
      Number(
        localStorage.getItem(
          "life-game-xp"
        ) || "0"
      );

    localStorage.setItem(
      "life-game-xp",
      String(
        Math.max(
          0,
          currentXp - xp
        )
      )
    );

    if (gold > 0) {
      const currentGold =
        Number(
          localStorage.getItem(
            "life-game-gold"
          ) || "0"
        );

      localStorage.setItem(
        "life-game-gold",
        String(
          Math.max(
            0,
            currentGold - gold
          )
        )
      );
    }

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  const isToday =
    selectedDate ===
    getTodayKey();

  return (
    <section>
      {/* HEADER */}
      <div className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-50">
              History
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Your journey, day by day.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-50">
              Lihat apa yang kamu lakukan,
              apa yang kamu dapatkan, dan
              bagaimana perkembanganmu setiap
              hari.
            </p>
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={goToday}
              className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium transition hover:bg-[#d2c7b8]"
            >
              Today
            </button>
          )}
        </div>

        {/* DATE NAVIGATION */}
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[#f5f0e8] p-3">
          <button
            type="button"
            onClick={goPreviousDay}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-lg transition hover:bg-white"
          >
            ←
          </button>

          <div className="min-w-0 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">
              Selected day
            </p>

            <p className="mt-1 truncate text-sm font-semibold sm:text-base">
              {formatFullDate(
                selectedDate
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={goNextDay}
            disabled={isToday}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-lg transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      {/* 7 DAY OVERVIEW */}
      <section className="mt-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50">
            Overview
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Last 7 days
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Klik tanggal untuk melihat detail
            harian.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 overflow-x-auto pb-1">
          {weeklySummary.map(
            (day) => {
              const active =
                day.date ===
                selectedDate;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      day.date
                    )
                  }
                  className={`min-w-[72px] rounded-2xl border p-3 text-center transition ${
                    active
                      ? "border-[#8f806d] bg-[#e5dccf]"
                      : "border-[#ddd3c6] bg-[#f5f0e8] hover:bg-[#eee7dc]"
                  }`}
                >
                  <p className="text-[10px] uppercase opacity-50">
                    {formatShortDate(
                      day.date
                    )}
                  </p>

                  <p className="mt-2 text-lg font-bold">
                    {day.activities}
                  </p>

                  <p className="text-[10px] opacity-40">
                    activities
                  </p>

                  <p className="mt-2 text-xs font-semibold">
                    +{day.xp} XP
                  </p>

                  <p className="mt-1 text-[10px] opacity-40">
                    {formatMinutes(
                      day.screenTime
                    )}
                  </p>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* DAILY SUMMARY */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest opacity-50">
            XP
          </p>

          <p className="mt-2 text-3xl font-bold">
            +{selectedXp}
          </p>

          <p className="mt-1 text-xs opacity-40">
            earned this day
          </p>
        </div>

        <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Gold
          </p>

          <p className="mt-2 text-3xl font-bold">
            +{selectedGold} 🪙
          </p>

          <p className="mt-1 text-xs opacity-40">
            earned this day
          </p>
        </div>

        <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Activities
          </p>

          <p className="mt-2 text-3xl font-bold">
            {selectedRecords.length}
          </p>

          <p className="mt-1 text-xs opacity-40">
            completed
          </p>
        </div>

        <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Screen Time
          </p>

          <p className="mt-2 text-3xl font-bold">
            {screenTimeLoading
              ? "..."
              : formatMinutes(
                  selectedScreenTimeTotal
                )}
          </p>

          <p className="mt-1 text-xs opacity-40">
            total screen time
          </p>
        </div>
      </div>

      {/* ACTIVITIES */}
      <section className="mt-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Activities
          </p>

          <h3 className="mt-1 text-xl font-bold">
            What happened
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Habit, Todo, Prayer, dan aktivitas
            lain yang tercatat pada hari ini.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-5 text-center">
            <p className="text-sm opacity-50">
              Loading history...
            </p>
          </div>
        ) : selectedRecords.length ===
          0 ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-6 text-center">
            <p className="text-3xl">
              🌱
            </p>

            <p className="mt-3 font-semibold">
              Belum ada aktivitas.
            </p>

            <p className="mt-1 text-sm opacity-50">
              Hari ini belum punya cerita.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedRecords.map(
              (
                record,
                index
              ) => {
                const hasDuration =
                  typeof record.durationMinutes ===
                    "number" &&
                  record.durationMinutes >
                    0;

                const gold =
                  typeof record.goldEarned ===
                  "number"
                    ? record.goldEarned
                    : 0;

                return (
                  <div
                    key={`${record.id}-${index}`}
                    className="rounded-2xl bg-[#f5f0e8] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {record.activity}
                        </p>

                        <p className="mt-1 text-xs opacity-50">
                          {new Date(
                            record.date
                          ).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}

                          {" · "}

                          {record.stat}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">
                            +{record.xp} XP
                          </p>

                          {gold > 0 && (
                            <p className="mt-1 text-xs opacity-50">
                              +{gold} 🪙
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteRecord(
                              index
                            )
                          }
                          className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium transition hover:bg-[#cfc3b4]"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {(hasDuration ||
                      gold > 0) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {hasDuration && (
                          <span className="rounded-full bg-white/70 px-3 py-1.5">
                            ⏱️{" "}
                            {formatMinutes(
                              record.durationMinutes ??
                                0
                            )}
                          </span>
                        )}

                        {gold > 0 && (
                          <span className="rounded-full bg-white/70 px-3 py-1.5">
                            🪙 +{gold} Gold
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* SCREEN TIME */}
      <section className="mt-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Screen Time
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Where your time went
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Penggunaan layar pada hari yang
            dipilih.
          </p>
        </div>

        <div className="space-y-3">
          {screenTimeCategories.map(
            (category) => {
              const minutes =
                selectedScreenTime[
                  category.key
                ];

              const percentage =
                selectedScreenTimeTotal >
                0
                  ? (minutes /
                      selectedScreenTimeTotal) *
                    100
                  : 0;

              return (
                <div
                  key={category.key}
                  className="rounded-2xl bg-[#f5f0e8] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {category.icon}
                      </span>

                      <span className="text-sm font-medium">
                        {category.label}
                      </span>
                    </div>

                    <span className="text-sm font-semibold">
                      {screenTimeLoading
                        ? "..."
                        : formatMinutes(
                            minutes
                          )}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ddd4c7]">
                    <div
                      className="h-full rounded-full bg-[#8f806d] transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[#d8cec0] pt-4">
          <span className="text-sm opacity-50">
            Total Screen Time
          </span>

          <span className="text-lg font-bold">
            {screenTimeLoading
              ? "..."
              : formatMinutes(
                  selectedScreenTimeTotal
                )}
          </span>
        </div>
      </section>

      {/* DAILY STATS */}
      <section className="mt-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Development
          </p>

          <h3 className="mt-1 text-xl font-bold">
            How you were doing
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Daily stats pada tanggal yang
            dipilih.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Energy
            </p>

            <p className="mt-2 text-2xl font-bold">
              {selectedStats.Energy}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Focus
            </p>

            <p className="mt-2 text-2xl font-bold">
              {selectedStats.Focus}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Growth
            </p>

            <p className="mt-2 text-2xl font-bold">
              {selectedStats.Growth}
            </p>
          </div>
        </div>
      </section>

      {/* GOLD LEDGER */}
      <section className="mt-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Gold
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Gold activity
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Gold yang diperoleh atau digunakan
            pada hari ini.
          </p>
        </div>

        {selectedGoldLedger.length ===
        0 ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-5">
            <p className="text-sm opacity-50">
              Tidak ada transaksi Gold pada
              hari ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedGoldLedger.map(
              (transaction) => {
                const isEarn =
                  transaction.type ===
                  "EARN";

                return (
                  <div
                    key={
                      transaction.id
                    }
                    className="rounded-2xl bg-[#f5f0e8] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {isEarn
                            ? "Gold Earned"
                            : "Gold Spent"}
                        </p>

                        <p className="mt-1 text-sm opacity-50">
                          {
                            transaction.reason
                          }
                        </p>

                        <p className="mt-1 text-xs opacity-40">
                          {new Date(
                            transaction.date
                          ).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </p>
                      </div>

                      <p className="font-bold">
                        {isEarn
                          ? "+"
                          : "-"}
                        {
                          transaction.amount
                        }{" "}
                        🪙
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </section>
  );
}