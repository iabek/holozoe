"use client";

import { useEffect, useState } from "react";

import Stats from "@/components/Stats";

import {
  saveCurrentLifeGameStorage,
  subscribeLifeGameStorageRealtime,
  syncLifeGameStorageFromSupabase,
} from "@/lib/life-game-storage";

type DailyStats = {
  Energy: number;
  Focus: number;
  Growth: number;
};

type ActivityItem = {
  id: string;
  name: string;
};

type HistoryItem = {
  id: string;
  activity: string;
  xp: number;
  stat: string;
  date: string;
  durationMinutes?: number;
  goldEarned?: number;
};

type LeisureDay = {
  extensionMinutes: number;
  usedMinutes: number;
};

type DailyActivitiesMap = Record<
  string,
  string[]
>;

const BASE_LEISURE_MINUTES = 120;
const MAX_EXTENSION_MINUTES = 120;

const DEFAULT_ACTIVITY_NAMES: Record<
  string,
  string
> = {
  thesis: "Thesis",
  movement: "Movement",
  learning: "Learning",
  social: "Social",
  leisure: "Leisure",
};

function calculateLevel(totalXp: number) {
  return Math.floor(totalXp / 100) + 1;
}

function getCurrentLevelXp(totalXp: number) {
  return totalXp % 100;
}

function getLevelProgress(totalXp: number) {
  return getCurrentLevelXp(totalXp);
}

function loadDailyActivities(): DailyActivitiesMap {
  const saved = localStorage.getItem(
    "life-game-daily-activities"
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
      const result: DailyActivitiesMap = {};

      Object.entries(parsed).forEach(
        ([date, value]) => {
          if (Array.isArray(value)) {
            result[date] = value.filter(
              (item): item is string =>
                typeof item === "string"
            );
          }
        }
      );

      return result;
    }

    return {};
  } catch {
    return {};
  }
}

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

function getMood(activityIds: string[]) {
  const count = activityIds.length;

  if (count === 0) {
    return {
      emoji: "😐",
      label: "Neutral",
    };
  }

  const hasThesis =
    activityIds.includes("thesis");

  const hasMovement =
    activityIds.includes("movement");

  const hasLearning =
    activityIds.includes("learning");

  const hasSocial =
    activityIds.includes("social");

  const hasLeisure =
    activityIds.includes("leisure");

  const focus =
    (hasThesis ? 6 : 0) +
    (hasLearning ? 4 : 0);

  const energy =
    hasMovement ? 5 : 0;

  const growth =
    hasLearning ? 5 : 0;

  const social =
    hasSocial ? 1 : 0;

  const leisure =
    hasLeisure ? 1 : 0;

  if (
    count === 1 &&
    !hasThesis &&
    !hasMovement &&
    !hasLearning
  ) {
    return {
      emoji: "😞",
      label: "Down",
    };
  }

  if (
    count >= 9 ||
    (focus >= 7 &&
      !hasMovement &&
      !hasLeisure)
  ) {
    return {
      emoji: "😭",
      label: "Overwhelmed",
    };
  }

  if (
    focus >= 6 &&
    energy === 0 &&
    social === 0
  ) {
    return {
      emoji: "😡",
      label: "Frustrated",
    };
  }

  if (
    social > 0 &&
    leisure > 0 &&
    focus === 0
  ) {
    return {
      emoji: "😏",
      label: "Mischievous",
    };
  }

  if (
    focus >= 4 &&
    energy >= 2
  ) {
    return {
      emoji: "😎",
      label: "Confident",
    };
  }

  if (
    growth >= 4 &&
    count >= 3
  ) {
    return {
      emoji: "🤩",
      label: "Excited",
    };
  }

  if (
    focus + energy + growth >
    0
  ) {
    return {
      emoji: "🥰",
      label: "Content",
    };
  }

  if (social > 0) {
    return {
      emoji: "😊",
      label: "Happy",
    };
  }

  if (leisure > 0) {
    return {
      emoji: "😌",
      label: "Calm",
    };
  }

  return {
    emoji: "😌",
    label: "Calm",
  };
}

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [totalXp, setTotalXp] =
    useState(0);

  const [gold, setGold] =
    useState(0);

  const [
    goldEarnedToday,
    setGoldEarnedToday,
  ] = useState(0);

  const [
    leisureUsedToday,
    setLeisureUsedToday,
  ] = useState(0);

  const [
    leisureExtensionToday,
    setLeisureExtensionToday,
  ] = useState(0);

  const [
    dailyStats,
    setDailyStats,
  ] = useState<DailyStats>({
    Energy: 0,
    Focus: 0,
    Growth: 0,
  });

  const [
    todayActivities,
    setTodayActivities,
  ] = useState<ActivityItem[]>([]);

  const [
    habits,
    setHabits,
  ] = useState<ActivityItem[]>([]);

  function loadDashboardData() {
    const savedXp = Number(
      localStorage.getItem(
        "life-game-xp"
      ) || "0"
    );

    setTotalXp(
      Number.isFinite(savedXp)
        ? Math.max(0, savedXp)
        : 0
    );

    const savedGold = Number(
      localStorage.getItem(
        "life-game-gold"
      ) || "0"
    );

    setGold(
      Number.isFinite(savedGold)
        ? Math.max(
            0,
            Math.floor(savedGold)
          )
        : 0
    );

    const today = getTodayKey();

    /*
     * GOLD EARNED TODAY
     */

    const savedHistory =
      localStorage.getItem(
        "life-game-history"
      );

    if (savedHistory) {
      try {
        const parsed =
          JSON.parse(savedHistory);

        if (Array.isArray(parsed)) {
          const todayGold =
            parsed.reduce(
              (
                total: number,
                record: HistoryItem
              ) => {
                if (
                  !record ||
                  typeof record !==
                    "object"
                ) {
                  return total;
                }

                if (
                  typeof record.date !==
                  "string"
                ) {
                  return total;
                }

                const recordDate =
                  new Date(record.date);

                const recordDateKey =
                  `${recordDate.getFullYear()}-${String(
                    recordDate.getMonth() + 1
                  ).padStart(2, "0")}-${String(
                    recordDate.getDate()
                  ).padStart(2, "0")}`;

                if (
                  recordDateKey !==
                  today
                ) {
                  return total;
                }

                const earned =
                  typeof record.goldEarned ===
                  "number"
                    ? record.goldEarned
                    : 0;

                return (
                  total +
                  Math.max(
                    0,
                    earned
                  )
                );
              },
              0
            );

          setGoldEarnedToday(
            todayGold
          );
        } else {
          setGoldEarnedToday(0);
        }
      } catch {
        setGoldEarnedToday(0);
      }
    } else {
      setGoldEarnedToday(0);
    }

    /*
     * LEISURE TODAY
     */

    const savedLeisure =
      localStorage.getItem(
        "life-game-leisure"
      );

    if (savedLeisure) {
      try {
        const parsed =
          JSON.parse(savedLeisure);

        const todayData =
          parsed?.[today] as
            | LeisureDay
            | undefined;

        if (
          todayData &&
          typeof todayData ===
            "object"
        ) {
          setLeisureUsedToday(
            Math.max(
              0,
              Number(
                todayData.usedMinutes ||
                  0
              )
            )
          );

          setLeisureExtensionToday(
            Math.min(
              MAX_EXTENSION_MINUTES,
              Math.max(
                0,
                Number(
                  todayData.extensionMinutes ||
                    0
                )
              )
            )
          );
        } else {
          setLeisureUsedToday(0);
          setLeisureExtensionToday(0);
        }
      } catch {
        setLeisureUsedToday(0);
        setLeisureExtensionToday(0);
      }
    } else {
      setLeisureUsedToday(0);
      setLeisureExtensionToday(0);
    }

    /*
     * DAILY STATS
     */

    const savedStats =
      localStorage.getItem(
        "life-game-daily-stats"
      );

    if (savedStats) {
      try {
        const parsed =
          JSON.parse(savedStats);

        if (
          parsed &&
          parsed[today]
        ) {
          setDailyStats(
            parsed[today]
          );
        } else {
          setDailyStats({
            Energy: 0,
            Focus: 0,
            Growth: 0,
          });
        }
      } catch {
        setDailyStats({
          Energy: 0,
          Focus: 0,
          Growth: 0,
        });
      }
    } else {
      setDailyStats({
        Energy: 0,
        Focus: 0,
        Growth: 0,
      });
    }

    /*
     * HABITS
     */

    const savedHabits =
      localStorage.getItem(
        "life-game-habits"
      );

    let loadedHabits: ActivityItem[] =
      [];

    if (savedHabits) {
      try {
        const parsed =
          JSON.parse(savedHabits);

        if (Array.isArray(parsed)) {
          loadedHabits =
            parsed
              .filter(
                (habit) =>
                  habit &&
                  typeof habit ===
                    "object" &&
                  typeof habit.id ===
                    "string" &&
                  typeof habit.name ===
                    "string"
              )
              .map(
                (habit: {
                  id: string;
                  name: string;
                }) => ({
                  id: habit.id,
                  name: habit.name,
                })
              );
        }
      } catch {
        loadedHabits = [];
      }
    }

    setHabits(loadedHabits);

    /*
     * TODAY ACTIVITIES
     */

    const dailyActivities =
      loadDailyActivities();

    const todayIds =
      dailyActivities[today] || [];

    const builtActivities =
      todayIds.map((id) => ({
        id,
        name:
          DEFAULT_ACTIVITY_NAMES[
            id
          ] || id,
      }));

    setTodayActivities(
      builtActivities
    );
  }

  /*
   * INITIAL LOAD + SUPABASE REALTIME
   */
  useEffect(() => {
    let cancelled = false;

    let unsubscribeRealtime:
      | (() => void)
      | null = null;

    async function initializeDashboard() {
      /*
       * Supabase menjadi source of truth
       * saat Dashboard pertama dibuka.
       */
      await syncLifeGameStorageFromSupabase();

      if (cancelled) {
        return;
      }

      loadDashboardData();

      /*
       * Setelah initial sync selesai,
       * dengarkan perubahan dari device lain.
       */
      const cleanup =
        await subscribeLifeGameStorageRealtime();

      if (cancelled) {
        cleanup?.();
        return;
      }

      unsubscribeRealtime =
        cleanup;
    }

    initializeDashboard();

    /*
     * Perubahan local browser.
     */
    const handleStorage = () => {
      loadDashboardData();
    };

    const handleUpdated = () => {
      loadDashboardData();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "life-game-updated",
      handleUpdated
    );

    return () => {
      cancelled = true;

      /*
       * Tutup realtime channel.
       */
      unsubscribeRealtime?.();

      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "life-game-updated",
        handleUpdated
      );
    };
  }, []);

  async function removeActivity(
    activityId: string,
    occurrenceIndex: number
  ) {
    const today = getTodayKey();

    const allActivities =
      loadDailyActivities();

    const todayIds =
      allActivities[today] || [];

    let removed = false;

    const nextIds =
      todayIds.filter((id) => {
        if (
          id === activityId &&
          !removed
        ) {
          removed = true;
          return false;
        }

        return true;
      });

    allActivities[today] =
      nextIds;

    localStorage.setItem(
      "life-game-daily-activities",
      JSON.stringify(
        allActivities
      )
    );

    setTodayActivities(
      nextIds.map((id) => ({
        id,
        name:
          DEFAULT_ACTIVITY_NAMES[
            id
          ] || id,
      }))
    );

    const result =
      await saveCurrentLifeGameStorage(
        "life-game-daily-activities"
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan daily activities ke Supabase:",
        result
      );
    }

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  async function resetXp() {
    const confirmed =
      window.confirm(
        "Reset semua XP dan kembali ke Level 1?"
      );

    if (!confirmed) {
      return;
    }

    localStorage.setItem(
      "life-game-xp",
      "0"
    );

    setTotalXp(0);

    /*
     * Simpan reset XP ke Supabase.
     */
    const result =
      await saveCurrentLifeGameStorage(
        "life-game-xp"
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan reset XP ke Supabase:",
        result
      );
    }

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  async function resetGold() {
    const confirmed =
      window.confirm(
        "Reset semua Gold?"
      );

    if (!confirmed) {
      return;
    }

    localStorage.setItem(
      "life-game-gold",
      "0"
    );

    setGold(0);

    /*
     * Simpan reset Gold ke Supabase.
     */
    const result =
      await saveCurrentLifeGameStorage(
        "life-game-gold"
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan reset Gold ke Supabase:",
        result
      );
    }

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  const level =
    calculateLevel(totalXp);

  const currentLevelXp =
    getCurrentLevelXp(totalXp);

  const progress =
    getLevelProgress(totalXp);

  const mood =
    getMood(
      todayActivities.map(
        (activity) =>
          activity.id
      )
    );

  const activityCount =
    todayActivities.length;

  const totalLeisureToday =
    Math.min(
      BASE_LEISURE_MINUTES +
        leisureExtensionToday,
      BASE_LEISURE_MINUTES +
        MAX_EXTENSION_MINUTES
    );

  const leisureRemainingToday =
    Math.max(
      0,
      totalLeisureToday -
        leisureUsedToday
    );

  return (
    <>
      {/* LEVEL */}

      <section className="mb-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Current level
            </p>

            <div className="mt-1 flex items-baseline gap-3">
              <h2 className="text-4xl font-bold">
                Level {level}
              </h2>

              <span className="text-sm opacity-50">
                {currentLevelXp} / 100 XP
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={resetXp}
            className="rounded-xl border border-[#cfc3b4] bg-[#f5f0e8] px-4 py-2 text-sm font-medium transition hover:bg-[#e9e0d5]"
          >
            Reset Level & XP
          </button>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#ddd4c7]">
          <div
            className="h-full rounded-full bg-[#8f806d] transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs opacity-50">
          <span>
            Total XP: {totalXp}
          </span>

          <span>
            {100 - currentLevelXp} XP to next level
          </span>
        </div>
      </section>

      {/* GOLD */}

      <section className="mb-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Time cashback
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Gold
            </h2>

            <p className="mt-1 text-sm opacity-50">
              Earned from qualifying activities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-3xl">
              🪙
            </span>

            <span className="text-3xl font-bold">
              {gold}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Earned today
            </p>

            <p className="mt-1 text-2xl font-bold">
              +{goldEarnedToday}
            </p>

            <p className="mt-1 text-xs opacity-50">
              Gold
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Leisure used
            </p>

            <p className="mt-1 text-2xl font-bold">
              {leisureUsedToday}m
            </p>

            <p className="mt-1 text-xs opacity-50">
              of {totalLeisureToday}m
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Leisure remaining
            </p>

            <p className="mt-1 text-2xl font-bold">
              {leisureRemainingToday}m
            </p>

            <p className="mt-1 text-xs opacity-50">
              +{leisureExtensionToday}m extension
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs opacity-50">
            <span>
              Leisure usage
            </span>

            <span>
              {leisureUsedToday} /{" "}
              {totalLeisureToday}m
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#ddd4c7]">
            <div
              className="h-full rounded-full bg-[#8f806d] transition-all"
              style={{
                width: `${
                  Math.min(
                    100,
                    totalLeisureToday > 0
                      ? (leisureUsedToday /
                          totalLeisureToday) *
                        100
                      : 0
                  )
                }%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 border-t border-[#d8cec0] pt-4">
          <button
            type="button"
            onClick={resetGold}
            className="rounded-xl border border-[#cfc3b4] bg-[#f5f0e8] px-4 py-2 text-sm font-medium transition hover:bg-[#e9e0d5]"
          >
            Reset Gold
          </button>
        </div>
      </section>

      {/* STATS */}

      <Stats
        stats={dailyStats}
        mood={mood}
      />

      {/* TODAY OVERVIEW */}

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Today
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Activity Overview
          </h3>

          <div className="mt-4 flex items-end gap-2">
            <span className="text-4xl font-bold">
              {activityCount}
            </span>

            <span className="pb-1 text-sm opacity-50">
              activities completed
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {todayActivities.length ===
            0 ? (
              <p className="text-sm opacity-50">
                No activities completed yet.
              </p>
            ) : (
              todayActivities.map(
                (
                  activity,
                  index
                ) => (
                  <div
                    key={`${activity.id}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1">
                      {activity.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeActivity(
                          activity.id,
                          index
                        )
                      }
                      aria-label={`Hapus ${activity.name}`}
                      className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium transition hover:bg-[#cfc3b4]"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Habits
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Your Habits
          </h3>

          <div className="mt-4">
            {habits.length === 0 ? (
              <p className="text-sm opacity-50">
                No custom habits yet.
              </p>
            ) : (
              <div className="space-y-2">
                {habits
                  .slice(0, 5)
                  .map((habit) => (
                    <div
                      key={habit.id}
                      className="rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm"
                    >
                      {habit.name}
                    </div>
                  ))}

                {habits.length > 5 && (
                  <p className="pt-1 text-xs opacity-50">
                    +
                    {habits.length - 5}{" "}
                    more habits
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DAILY PRAYERS */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Prayer
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Daily Prayers
            </h3>
          </div>

          <button
            type="button"
            onClick={() =>
              onNavigate("Prayer")
            }
            className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium"
          >
            Open Prayer
          </button>
        </div>

        <p className="mt-3 text-sm opacity-50">
          Track your five daily prayers and personal worship.
        </p>
      </section>
    </>
  );
}