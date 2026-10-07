"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Stats from "@/components/Stats";
import Today from "@/components/Today";
import Habits from "@/components/Habits";
import Prayer from "@/components/Prayer";
import Records from "@/components/Records";
import Journal from "@/components/Journal";
import Notes from "@/components/Notes";
import Finance from "@/components/Finance";
import Projects from "@/components/Projects";

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

const BASE_LEISURE_MINUTES = 120;
const MAX_EXTENSION_MINUTES = 120;

function calculateLevel(totalXp: number) {
  return Math.floor(totalXp / 100) + 1;
}

function getCurrentLevelXp(totalXp: number) {
  return totalXp % 100;
}

function getLevelProgress(totalXp: number) {
  return getCurrentLevelXp(totalXp);
}

function loadDailyActivities() {
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
      return parsed;
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
    focus + energy + growth > 0
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

export default function Home() {
  const [activePage, setActivePage] =
    useState("Dashboard");

  const [totalXp, setTotalXp] =
    useState(0);

  const [gold, setGold] =
    useState(0);

  const [goldEarnedToday, setGoldEarnedToday] =
    useState(0);

  const [leisureUsedToday, setLeisureUsedToday] =
    useState(0);

  const [leisureExtensionToday, setLeisureExtensionToday] =
    useState(0);

  const [dailyStats, setDailyStats] =
    useState<DailyStats>({
      Energy: 0,
      Focus: 0,
      Growth: 0,
    });

  const [todayActivities, setTodayActivities] =
    useState<ActivityItem[]>([]);

  const [habits, setHabits] =
    useState<ActivityItem[]>([]);

  function loadDashboardData() {
    /*
     * XP
     */

    const savedXp =
      Number(
        localStorage.getItem(
          "life-game-xp"
        ) || "0"
      );

    setTotalXp(
      Number.isFinite(savedXp)
        ? Math.max(0, savedXp)
        : 0
    );

    /*
     * GOLD
     */

    const savedGold =
      Number(
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

    const today =
      getTodayKey();

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
          JSON.parse(
            savedHistory
          );

        if (
          Array.isArray(parsed)
        ) {
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
                  new Date(
                    record.date
                  );

                const recordDateKey =
                  `${recordDate.getFullYear()}-${String(
                    recordDate.getMonth() + 1
                  ).padStart(
                    2,
                    "0"
                  )}-${String(
                    recordDate.getDate()
                  ).padStart(
                    2,
                    "0"
                  )}`;

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
     * LEISURE
     *
     * Source:
     * life-game-leisure
     *
     * usedMinutes:
     * Gaming + Entertainment
     * dari Screen Time
     *
     * extensionMinutes:
     * Gold
     */

    const savedLeisure =
      localStorage.getItem(
        "life-game-leisure"
      );

    if (savedLeisure) {
      try {
        const parsed =
          JSON.parse(
            savedLeisure
          );

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
              Math.floor(
                Number(
                  todayData.usedMinutes ||
                    0
                )
              )
            )
          );

          setLeisureExtensionToday(
            Math.min(
              MAX_EXTENSION_MINUTES,
              Math.max(
                0,
                Math.floor(
                  Number(
                    todayData.extensionMinutes ||
                      0
                  )
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
          JSON.parse(
            savedStats
          );

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
     * TODAY ACTIVITIES
     */

    const activities =
      loadDailyActivities();

    const todayIds =
      Array.isArray(
        activities[today]
      )
        ? activities[today]
        : [];

    const todayItems =
      todayIds.map(
        (id: string) => ({
          id,
          name:
            id === "thesis"
              ? "Thesis"
              : id === "movement"
                ? "Movement"
                : id === "learning"
                  ? "Learning"
                  : id === "social"
                    ? "Social"
                    : id === "leisure"
                      ? "Leisure"
                      : id,
        })
      );

    setTodayActivities(
      todayItems
    );

    /*
     * HABITS
     */

    const savedHabits =
      localStorage.getItem(
        "life-game-habits"
      );

    if (savedHabits) {
      try {
        const parsed =
          JSON.parse(
            savedHabits
          );

        if (
          Array.isArray(parsed)
        ) {
          setHabits(
            parsed.map(
              (
                habit: {
                  id: string;
                  name: string;
                }
              ) => ({
                id: habit.id,
                name: habit.name,
              })
            )
          );
        } else {
          setHabits([]);
        }
      } catch {
        setHabits([]);
      }
    } else {
      setHabits([]);
    }
  }

  useEffect(() => {
    loadDashboardData();

    window.addEventListener(
      "storage",
      loadDashboardData
    );

    window.addEventListener(
      "life-game-updated",
      loadDashboardData
    );

    return () => {
      window.removeEventListener(
        "storage",
        loadDashboardData
      );

      window.removeEventListener(
        "life-game-updated",
        loadDashboardData
      );
    };
  }, []);

  function resetXp() {
    const confirmed =
      window.confirm(
        "Reset Level & XP ke awal?\n\nXP akan kembali ke 0 dan Level menjadi 1.\n\nStats, Records, Habits, Prayer, dan Gold tidak akan dihapus."
      );

    if (!confirmed) {
      return;
    }

    localStorage.setItem(
      "life-game-xp",
      "0"
    );

    setTotalXp(0);

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  function resetGold() {
    const confirmed =
      window.confirm(
        "Reset Gold ke 0?\n\nSaldo Gold saat ini akan dihapus dan dimulai kembali dari 0.\n\nXP, Stats, Records, Habits, Prayer, dan Leisure tidak akan dihapus."
      );

    if (!confirmed) {
      return;
    }

    localStorage.setItem(
      "life-game-gold",
      "0"
    );

    setGold(0);

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  const level =
    calculateLevel(
      totalXp
    );

  const currentLevelXp =
    getCurrentLevelXp(
      totalXp
    );

  const progress =
    getLevelProgress(
      totalXp
    );

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

  const leisureProgress =
    totalLeisureToday > 0
      ? Math.min(
          100,
          (leisureUsedToday /
            totalLeisureToday) *
            100
        )
      : 0;

  function renderPage() {
    if (
      activePage === "Today"
    ) {
      return <Today />;
    }

    if (
      activePage === "Habits"
    ) {
      return <Habits />;
    }

    if (
      activePage === "Prayer"
    ) {
      return <Prayer />;
    }

    if (
      activePage === "Records"
    ) {
      return <Records />;
    }

    if (
      activePage === "Journal"
    ) {
      return <Journal />;
    }

    if (
      activePage === "Notes"
    ) {
      return <Notes />;
    }

    if (
      activePage === "Finance"
    ) {
      return <Finance />;
    }

    if (
      activePage === "Projects"
    ) {
      return <Projects />;
    }

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
              onClick={
                resetXp
              }
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

        {/* GOLD + LEISURE */}

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
                from Screen Time
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

          <div className="mt-5">

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
                  width: `${leisureProgress}%`,
                }}
              />

            </div>

          </div>

          <div className="mt-5 rounded-2xl border border-[#cfc3b4] bg-[#f5f0e8] p-4">

            <div className="flex items-start gap-3">

              <span className="text-lg">
                📱
              </span>

              <div>

                <p className="font-semibold">
                  Screen Time connected
                </p>

                <p className="mt-1 text-xs leading-5 opacity-60">
                  Gaming + Entertainment
                  dari Screen Time otomatis
                  menjadi Leisure used.
                </p>

              </div>

            </div>

          </div>

          <div className="mt-5 border-t border-[#d8cec0] pt-4">

            <button
              type="button"
              onClick={
                resetGold
              }
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
                      className="rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm"
                    >
                      {activity.name}
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

              {habits.length ===
              0 ? (

                <p className="text-sm opacity-50">
                  No custom habits yet.
                </p>

              ) : (

                <div className="space-y-2">

                  {habits
                    .slice(0, 5)
                    .map(
                      (habit) => (

                        <div
                          key={
                            habit.id
                          }
                          className="rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm"
                        >
                          {habit.name}
                        </div>

                      )
                    )}

                  {habits.length >
                    5 && (

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
                setActivePage(
                  "Prayer"
                )
              }
              className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium"
            >
              Open Prayer
            </button>

          </div>

          <p className="mt-3 text-sm opacity-50">
            Track your five daily prayers
            and personal worship.
          </p>

        </section>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-[#e8dfd2] text-[#3f382f]">

      <div className="flex min-h-screen">

        <Sidebar
          activePage={
            activePage
          }
          onNavigate={
            setActivePage
          }
        />

        <div className="min-w-0 flex-1 p-5 sm:p-8">

          <div className="mx-auto max-w-6xl">

            <header className="mb-7">

              <p className="text-xs uppercase tracking-widest opacity-50">
                Life dashboard
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                {activePage}
              </h1>

            </header>

            {renderPage()}

          </div>

        </div>

      </div>

    </main>
  );
}