"use client";

import { useEffect, useState } from "react";
import {
  saveCurrentLifeGameStorage,
  syncLifeGameStorageFromSupabase,
} from "@/lib/life-game-storage";

type StatName =
  | "Energy"
  | "Focus"
  | "Growth";

type ActivityStat =
  | StatName
  | "Mood";

type QuranUnit =
  | "pages"
  | "verses";

type Activity = {
  id: string;
  name: string;
  xp: number;
  stat: ActivityStat;
  icon: string;
  earnsGold?: boolean;
  isHabit?: boolean;
  habitId?: string;
  trackQuran?: boolean;
  quranUnit?: QuranUnit;
};

type Habit = {
  id: string;
  name: string;
  xp: number;
  stat: StatName;
  earnsGold?: boolean;
  trackQuran?: boolean;
  quranUnit?: QuranUnit;
};

type HistoryItem = {
  id: string;
  activity: string;
  xp: number;
  stat: ActivityStat;
  activityId?: string;
  date: string;
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

type DailyActivities = {
  [date: string]: string[];
};

type HabitRecord = {
  completed?: boolean;
  progress?: number;
  unit?: QuranUnit;
};

type HabitRecords = {
  [date: string]: {
    [habitId: string]: HabitRecord;
  };
};

type LeisureData = {
  [date: string]: {
    extensionMinutes: number;
    usedMinutes: number;
  };
};

const BASE_LEISURE_MINUTES = 120;
const MAX_EXTENSION_MINUTES = 120;

const durationOptions = [
  10,
  20,
  30,
  40,
  50,
  60,
  90,
  120,
];

const goldExtensionOptions = [
  {
    gold: 6,
    minutes: 30,
  },
  {
    gold: 12,
    minutes: 60,
  },
  {
    gold: 18,
    minutes: 90,
  },
  {
    gold: 24,
    minutes: 120,
  },
];

const defaultActivities: Activity[] = [
  {
    id: "thesis",
    name: "Thesis",
    xp: 10,
    stat: "Focus",
    icon: "📚",
    earnsGold: true,
  },
  {
    id: "movement",
    name: "Movement",
    xp: 8,
    stat: "Energy",
    icon: "🏃",
    earnsGold: true,
  },
  {
    id: "learning",
    name: "Learning",
    xp: 10,
    stat: "Growth",
    icon: "🧠",
    earnsGold: true,
  },
  {
    id: "social",
    name: "Social",
    xp: 6,
    stat: "Mood",
    icon: "💬",
    earnsGold: false,
  },
];

function getTodayKey() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadDailyActivities(): DailyActivities {
  const saved =
    localStorage.getItem(
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

function loadHabitRecords(): HabitRecords {
  const saved =
    localStorage.getItem(
      "life-game-habit-records"
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

function loadHistory(): HistoryItem[] {
  const saved =
    localStorage.getItem(
      "life-game-history"
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

function loadGoldLedger(): GoldLedgerItem[] {
  const saved =
    localStorage.getItem(
      "life-game-gold-ledger"
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

function loadLeisureData(): LeisureData {
  const saved =
    localStorage.getItem(
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

function isGoldEligible(
  activity: Activity
) {
  return activity.earnsGold === true;
}

function isQuranHabit(
  activity: Activity
) {
  return (
    activity.isHabit === true &&
    activity.trackQuran === true
  );
}

function calculateGold(
  durationMinutes: number
) {
  return Math.floor(
    durationMinutes / 10
  );
}

function getSafeXp() {
  const saved =
    Number(
      localStorage.getItem(
        "life-game-xp"
      ) || "0"
    );

  if (!Number.isFinite(saved)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(saved)
  );
}

function getSafeGold() {
  const saved =
    Number(
      localStorage.getItem(
        "life-game-gold"
      ) || "0"
    );

  if (!Number.isFinite(saved)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(saved)
  );
}

function updateDailyStat(
  stat: StatName,
  amount: number
) {
  const today =
    getTodayKey();

  const saved =
    localStorage.getItem(
      "life-game-daily-stats"
    );

  let dailyStats: {
    [date: string]: {
      Energy: number;
      Focus: number;
      Growth: number;
    };
  } = {};

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        dailyStats = parsed;
      }
    } catch {
      dailyStats = {};
    }
  }

  const current =
    dailyStats[today] || {
      Energy: 0,
      Focus: 0,
      Growth: 0,
    };

  dailyStats[today] = {
    Energy: Math.max(
      0,
      Math.min(
        100,
        current.Energy +
          (stat === "Energy"
            ? amount
            : 0)
      )
    ),
    Focus: Math.max(
      0,
      Math.min(
        100,
        current.Focus +
          (stat === "Focus"
            ? amount
            : 0)
      )
    ),
    Growth: Math.max(
      0,
      Math.min(
        100,
        current.Growth +
          (stat === "Growth"
            ? amount
            : 0)
      )
    ),
  };

  localStorage.setItem(
    "life-game-daily-stats",
    JSON.stringify(dailyStats)
  );
}

function updateXp(
  amount: number
) {
  const currentXp =
    getSafeXp();

  const nextXp =
    Math.max(
      0,
      currentXp + amount
    );

  localStorage.setItem(
    "life-game-xp",
    String(nextXp)
  );
}

function updateGold(
  amount: number
) {
  const currentGold =
    getSafeGold();

  const nextGold =
    Math.max(
      0,
      currentGold + amount
    );

  localStorage.setItem(
    "life-game-gold",
    String(nextGold)
  );
}

function addGoldLedger(
  type: "EARN" | "SPEND",
  amount: number,
  reason: string
) {
  if (amount <= 0) {
    return;
  }

  const ledger =
    loadGoldLedger();

  ledger.push({
    id: `${Date.now()}-${Math.random()}`,
    type,
    amount,
    reason,
    date: new Date().toISOString(),
  });

  localStorage.setItem(
    "life-game-gold-ledger",
    JSON.stringify(ledger)
  );
}

export default function Today() {
  const [
    activityLog,
    setActivityLog,
  ] = useState<string[]>([]);

  const [
    habits,
    setHabits,
  ] = useState<Habit[]>([]);

  const [
    habitRecords,
    setHabitRecords,
  ] = useState<HabitRecords>({});

  const [
    gold,
    setGold,
  ] = useState(0);

  const [
    leisure,
    setLeisure,
  ] = useState({
    extensionMinutes: 0,
    usedMinutes: 0,
  });

  const [
    pendingActivity,
    setPendingActivity,
  ] = useState<Activity | null>(
    null
  );

  const [
    customMinutes,
    setCustomMinutes,
  ] = useState("");

  const [
    quranProgressInput,
    setQuranProgressInput,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      await syncLifeGameStorageFromSupabase();

      if (cancelled) {
        return;
      }

      function refresh() {
        const today =
          getTodayKey();

        const dailyActivities =
          loadDailyActivities();

        const savedHabits =
          localStorage.getItem(
            "life-game-habits"
          );

        const savedHabitRecords =
          loadHabitRecords();

        setActivityLog(
          dailyActivities[today] || []
        );

        if (savedHabits) {
          try {
            const parsed =
              JSON.parse(savedHabits);

            if (
              Array.isArray(parsed)
            ) {
              setHabits(parsed);
            } else {
              setHabits([]);
            }
          } catch {
            setHabits([]);
          }
        } else {
          setHabits([]);
        }

        setHabitRecords(
          savedHabitRecords
        );

        setGold(
          getSafeGold()
        );

        const savedLeisure =
          loadLeisureData();

        const todayLeisure =
          savedLeisure[today];

        setLeisure({
          extensionMinutes:
            Math.min(
              MAX_EXTENSION_MINUTES,
              Math.max(
                0,
                Number(
                  todayLeisure?.extensionMinutes ||
                    0
                )
              )
            ),
          usedMinutes:
            Math.max(
              0,
              Number(
                todayLeisure?.usedMinutes ||
                  0
              )
            ),
        });
      }

      refresh();

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
    }

    let cleanup:
      | (() => void)
      | undefined;

    void initialize().then(
      (result) => {
        cleanup = result;
      }
    );

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const customActivities: Activity[] =
    habits.map((habit) => ({
      id: `habit-${habit.id}`,
      name: habit.name,
      xp: habit.xp,
      stat: habit.stat,
      icon: habit.trackQuran
        ? "📖"
        : "✓",
      earnsGold:
        habit.earnsGold === true,
      isHabit: true,
      habitId: habit.id,
      trackQuran:
        habit.trackQuran === true,
      quranUnit:
        habit.quranUnit,
    }));

  const allActivities: Activity[] = [
    ...defaultActivities,
    ...customActivities,
  ];

  function saveLeisure(
    data: {
      extensionMinutes: number;
      usedMinutes: number;
    }
  ) {
    const today =
      getTodayKey();

    const allLeisure =
      loadLeisureData();

    allLeisure[today] = {
      extensionMinutes:
        Math.max(
          0,
          Math.min(
            MAX_EXTENSION_MINUTES,
            data.extensionMinutes
          )
        ),
      usedMinutes:
        Math.max(
          0,
          Math.floor(
            data.usedMinutes
          )
        ),
    };

    localStorage.setItem(
      "life-game-leisure",
      JSON.stringify(allLeisure)
    );

    setLeisure(
      allLeisure[today]
    );
  }

  async function saveStorageKeys(
    keys: string[]
  ) {
    const uniqueKeys =
      Array.from(
        new Set(keys)
      );

    const results =
      await Promise.all(
        uniqueKeys.map(
          (key) =>
            saveCurrentLifeGameStorage(
              key
            )
        )
      );

    const failed =
      results.find(
        (result) =>
          !result.success
      );

    if (failed) {
      console.error(
        "Gagal menyimpan Today ke Supabase:",
        failed
      );
    }
  }

  function saveHabitRecords(
    updated: HabitRecords
  ) {
    localStorage.setItem(
      "life-game-habit-records",
      JSON.stringify(updated)
    );

    setHabitRecords(
      updated
    );
  }

  function getHabitRecord(
    activity: Activity,
    date = getTodayKey()
  ) {
    if (
      !activity.isHabit ||
      !activity.habitId
    ) {
      return null;
    }

    return (
      habitRecords[date]?.[
        activity.habitId
      ] || null
    );
  }

  function getHabitProgress(
    activity: Activity
  ) {
    const record =
      getHabitRecord(
        activity
      );

    return Math.max(
      0,
      Number(
        record?.progress || 0
      )
    );
  }

  function isHabitCompleted(
    activity: Activity
  ) {
    if (!activity.isHabit) {
      return false;
    }

    const record =
      getHabitRecord(
        activity
      );

    return record?.completed === true;
  }

  async function completeQuranHabit(
    activity: Activity,
    progress: number
  ) {
    if (
      !activity.isHabit ||
      !activity.habitId ||
      !activity.trackQuran
    ) {
      return;
    }

    const safeProgress =
      Math.floor(progress);

    if (
      !Number.isFinite(
        safeProgress
      ) ||
      safeProgress <= 0
    ) {
      return;
    }

    if (
      isHabitCompleted(
        activity
      )
    ) {
      return;
    }

    const today =
      getTodayKey();

    const records =
      loadHabitRecords();

    const todayRecords =
      records[today] || {};

    const updatedRecords: HabitRecords = {
      ...records,
      [today]: {
        ...todayRecords,
        [activity.habitId]: {
          completed: true,
          progress:
            safeProgress,
          unit:
            activity.quranUnit ||
            "pages",
        },
      },
    };

    saveHabitRecords(
      updatedRecords
    );

    const dailyActivities =
      loadDailyActivities();

    const todayActivities =
      dailyActivities[today] || [];

    const updatedDailyActivities = {
      ...dailyActivities,
      [today]: [
        ...todayActivities,
        activity.id,
      ],
    };

    localStorage.setItem(
      "life-game-daily-activities",
      JSON.stringify(
        updatedDailyActivities
      )
    );

    setActivityLog(
      updatedDailyActivities[today]
    );

    const history =
      loadHistory();

    history.push({
      id: `${Date.now()}-${Math.random()}`,
      activity:
        activity.name,
      xp: activity.xp,
      stat:
        activity.stat,
      activityId:
        activity.id,
      date:
        new Date().toISOString(),
    });

    localStorage.setItem(
      "life-game-history",
      JSON.stringify(history)
    );

    updateXp(
      activity.xp
    );

    if (
      activity.stat !==
      "Mood"
    ) {
      updateDailyStat(
        activity.stat,
        5
      );
    }

    setPendingActivity(
      null
    );

    setQuranProgressInput("");

    await saveStorageKeys([
      "life-game-habit-records",
      "life-game-daily-activities",
      "life-game-history",
      "life-game-xp",
      "life-game-daily-stats",
    ]);

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  async function completeActivity(
    activity: Activity,
    durationMinutes: number
  ) {
    if (
      activity.isHabit &&
      activity.trackQuran
    ) {
      await completeQuranHabit(
        activity,
        durationMinutes
      );

      return;
    }

    if (
      activity.isHabit &&
      isHabitCompleted(
        activity
      )
    ) {
      return;
    }

    const safeDuration =
      Math.max(
        0,
        Math.floor(
          durationMinutes
        )
      );

    const eligible =
      isGoldEligible(
        activity
      );

    if (
      eligible &&
      safeDuration < 1
    ) {
      return;
    }

    const goldEarned =
      eligible
        ? calculateGold(
            safeDuration
          )
        : 0;

    const today =
      getTodayKey();

    const dailyActivities =
      loadDailyActivities();

    const todayActivities =
      dailyActivities[today] || [];

    const updatedTodayActivities = [
      ...todayActivities,
      activity.id,
    ];

    const updatedDailyActivities = {
      ...dailyActivities,
      [today]:
        updatedTodayActivities,
    };

    setActivityLog(
      updatedTodayActivities
    );

    localStorage.setItem(
      "life-game-daily-activities",
      JSON.stringify(
        updatedDailyActivities
      )
    );

    const history =
      loadHistory();

    history.push({
      id: `${Date.now()}-${Math.random()}`,
      activity:
        activity.name,
      xp:
        activity.xp,
      stat:
        activity.stat,
      activityId:
        activity.id,
      date:
        new Date().toISOString(),
      ...(eligible
        ? {
            durationMinutes:
              safeDuration,
            goldEarned,
          }
        : {}),
    });

    localStorage.setItem(
      "life-game-history",
      JSON.stringify(history)
    );

    updateXp(
      activity.xp
    );

    if (
      activity.stat !==
      "Mood"
    ) {
      updateDailyStat(
        activity.stat,
        5
      );
    }

    if (
      goldEarned > 0
    ) {
      updateGold(
        goldEarned
      );

      addGoldLedger(
        "EARN",
        goldEarned,
        `${activity.name} · ${safeDuration}m`
      );
    }

    if (activity.isHabit) {
      const records =
        loadHabitRecords();

      const todayRecords =
        records[today] || {};

      const updatedRecords: HabitRecords = {
        ...records,
        [today]: {
          ...todayRecords,
          ...(activity.habitId
            ? {
                [activity.habitId]: {
                  completed: true,
                },
              }
            : {}),
        },
      };

      saveHabitRecords(
        updatedRecords
      );
    }

    setGold(
      getSafeGold()
    );

    setPendingActivity(
      null
    );

    setCustomMinutes(
      ""
    );

    await saveStorageKeys([
      "life-game-daily-activities",
      "life-game-history",
      "life-game-xp",
      "life-game-daily-stats",
      ...(goldEarned > 0
        ? [
            "life-game-gold",
            "life-game-gold-ledger",
          ]
        : []),
      ...(activity.isHabit
        ? ["life-game-habit-records"]
        : []),
    ]);

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  function addActivity(
    activity: Activity
  ) {
    if (
      activity.isHabit &&
      isHabitCompleted(
        activity
      )
    ) {
      return;
    }

    if (
      isQuranHabit(
        activity
      )
    ) {
      setPendingActivity(
        activity
      );

      setQuranProgressInput(
        ""
      );

      return;
    }

    if (
      isGoldEligible(
        activity
      )
    ) {
      setPendingActivity(
        activity
      );

      setCustomMinutes(
        ""
      );

      return;
    }

    void completeActivity(
      activity,
      0
    );
  }

  async function removeActivity(
    activity: Activity
  ) {
    const today =
      getTodayKey();

    if (
      activity.isHabit &&
      activity.habitId
    ) {
      const records =
        loadHabitRecords();

      const todayRecords =
        records[today] || {};

      if (
        !todayRecords[
          activity.habitId
        ]
      ) {
        return;
      }

      const updatedTodayRecords = {
        ...todayRecords,
      };

      delete updatedTodayRecords[
        activity.habitId
      ];

      const updatedRecords: HabitRecords = {
        ...records,
        [today]:
          updatedTodayRecords,
      };

      saveHabitRecords(
        updatedRecords
      );
    }

    const dailyActivities =
      loadDailyActivities();

    const todayActivities =
      dailyActivities[today] || [];

    const index =
      todayActivities.lastIndexOf(
        activity.id
      );

    if (index === -1) {
      return;
    }

    const updatedTodayActivities = [
      ...todayActivities,
    ];

    updatedTodayActivities.splice(
      index,
      1
    );

    const updatedDailyActivities = {
      ...dailyActivities,
      [today]:
        updatedTodayActivities,
    };

    setActivityLog(
      updatedTodayActivities
    );

    localStorage.setItem(
      "life-game-daily-activities",
      JSON.stringify(
        updatedDailyActivities
      )
    );

    const history =
      loadHistory();

    let historyIndex = -1;

    for (
      let i =
        history.length - 1;
      i >= 0;
      i--
    ) {
      if (
        history[i]
          .activityId ===
        activity.id
      ) {
        historyIndex = i;
        break;
      }
    }

    if (
      historyIndex === -1
    ) {
      for (
        let i =
          history.length - 1;
        i >= 0;
        i--
      ) {
        if (
          history[i]
            .activity ===
          activity.name
        ) {
          historyIndex = i;
          break;
        }
      }
    }

    let removedGold = 0;

    if (
      historyIndex !== -1
    ) {
      const removedHistory =
        history[
          historyIndex
        ];

      removedGold =
        Number(
          removedHistory
            .goldEarned || 0
        );

      history.splice(
        historyIndex,
        1
      );

      if (
        removedGold > 0
      ) {
        updateGold(
          -removedGold
        );
      }
    }

    localStorage.setItem(
      "life-game-history",
      JSON.stringify(history)
    );

    updateXp(
      -activity.xp
    );

    if (
      activity.stat !==
      "Mood"
    ) {
      updateDailyStat(
        activity.stat,
        -5
      );
    }

    setGold(
      getSafeGold()
    );

    await saveStorageKeys([
      "life-game-daily-activities",
      "life-game-history",
      "life-game-xp",
      "life-game-daily-stats",
      ...(removedGold > 0
        ? [
            "life-game-gold",
          ]
        : []),
      ...(activity.isHabit
        ? [
            "life-game-habit-records",
          ]
        : []),
    ]);

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  function extendLeisure(
    goldCost: number,
    minutes: number
  ) {
    const remainingExtension =
      MAX_EXTENSION_MINUTES -
      leisure.extensionMinutes;

    if (
      minutes >
      remainingExtension
    ) {
      return;
    }

    if (
      gold <
      goldCost
    ) {
      return;
    }

    updateGold(
      -goldCost
    );

    addGoldLedger(
      "SPEND",
      goldCost,
      `Leisure extension · +${minutes}m`
    );

    const nextLeisure = {
      extensionMinutes:
        leisure.extensionMinutes +
        minutes,
      usedMinutes:
        leisure.usedMinutes,
    };

    saveLeisure(
      nextLeisure
    );

    setGold(
      getSafeGold()
    );

    void saveStorageKeys([
      "life-game-gold",
      "life-game-gold-ledger",
      "life-game-leisure",
    ]);

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  function confirmCustomDuration() {
    if (
      !pendingActivity
    ) {
      return;
    }

    const minutes =
      Number(
        customMinutes
      );

    if (
      !Number.isFinite(
        minutes
      ) ||
      minutes < 1
    ) {
      return;
    }

    void completeActivity(
      pendingActivity,
      minutes
    );
  }

  function confirmQuranProgress() {
    if (
      !pendingActivity ||
      !isQuranHabit(
        pendingActivity
      )
    ) {
      return;
    }

    const progress =
      Number(
        quranProgressInput
      );

    if (
      !Number.isFinite(
        progress
      ) ||
      progress <= 0
    ) {
      return;
    }

    void completeQuranHabit(
      pendingActivity,
      progress
    );
  }

  const totalLeisureMinutes =
    BASE_LEISURE_MINUTES +
    leisure.extensionMinutes;

  const remainingLeisureMinutes =
    Math.max(
      0,
      totalLeisureMinutes -
        leisure.usedMinutes
    );

  const remainingExtensionMinutes =
    Math.max(
      0,
      MAX_EXTENSION_MINUTES -
        leisure.extensionMinutes
    );

  const leisureUsagePercent =
    totalLeisureMinutes > 0
      ? Math.min(
          100,
          (leisure.usedMinutes /
            totalLeisureMinutes) *
            100
        )
      : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Time cashback
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              🪙 {gold} Gold
            </h2>

            <p className="mt-1 text-sm opacity-50">
              Earn Gold from qualifying
              activities and exchange it
              for more leisure time.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Leisure budget
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              🎮 Leisure
            </h2>

            <p className="mt-1 text-sm opacity-50">
              Screen Time menentukan
              pemakaian Leisure hari ini.
              Gold dapat menambah waktu.
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold">
              {remainingLeisureMinutes}m
            </p>

            <p className="text-xs opacity-50">
              remaining
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Base
            </p>

            <p className="mt-1 text-xl font-bold">
              120m
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Extension
            </p>

            <p className="mt-1 text-xl font-bold">
              +{leisure.extensionMinutes}m
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Used
            </p>

            <p className="mt-1 text-xl font-bold">
              {leisure.usedMinutes}m
            </p>

            <p className="mt-1 text-xs opacity-50">
              from Screen Time
            </p>
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
                dihitung sebagai Leisure used.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-semibold">
                Extend Leisure
              </p>

              <p className="mt-1 text-xs opacity-50">
                Maximum extension today: 120m
              </p>
            </div>

            <p className="text-xs opacity-50">
              {remainingExtensionMinutes}m
              extension left
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {goldExtensionOptions.map(
              (option) => {
                const disabled =
                  gold <
                    option.gold ||
                  option.minutes >
                    remainingExtensionMinutes;

                return (
                  <button
                    key={
                      option.gold
                    }
                    type="button"
                    disabled={
                      disabled
                    }
                    onClick={() =>
                      extendLeisure(
                        option.gold,
                        option.minutes
                      )
                    }
                    className="rounded-xl border border-[#cfc3b4] bg-white/70 px-3 py-3 text-sm font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="block">
                      +{option.minutes}m
                    </span>

                    <span className="mt-1 block text-xs opacity-50">
                      {option.gold} 🪙
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-[#d8cec0] pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Leisure Usage
              </p>

              <p className="mt-1 text-xs opacity-50">
                Automatically synced from
                Screen Time.
              </p>
            </div>

            <p className="text-sm font-semibold">
              {leisure.usedMinutes}m /{" "}
              {totalLeisureMinutes}m
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#ddd4c7]">
            <div
              className="h-full rounded-full bg-[#8f806d] transition-all"
              style={{
                width: `${leisureUsagePercent}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs opacity-50">
            <span>
              {leisure.usedMinutes}m
              used
            </span>

            <span>
              {remainingLeisureMinutes}m
              remaining
            </span>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {allActivities.map(
          (activity) => {
            const habitRecord =
              activity.isHabit
                ? getHabitRecord(
                    activity
                  )
                : null;

            const completed =
              activity.isHabit
                ? isHabitCompleted(
                    activity
                  )
                : false;

            const count =
              activity.isHabit
                ? completed
                  ? 1
                  : 0
                : activityLog.filter(
                    (item) =>
                      item ===
                      activity.id
                  ).length;

            const eligible =
              isGoldEligible(
                activity
              );

            const quranProgress =
              isQuranHabit(
                activity
              )
                ? getHabitProgress(
                    activity
                  )
                : 0;

            return (
              <div
                key={
                  activity.id
                }
                className="rounded-2xl bg-[#f5f0e8] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xl">
                      {activity.icon}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {activity.name}
                      </p>

                      <p className="text-xs opacity-50">
                        +{activity.xp} XP ·{" "}
                        {activity.stat ===
                        "Mood"
                          ? "affects mood"
                          : `+5 ${activity.stat}`}
                        {eligible &&
                          " · earns Gold"}
                      </p>

                      {isQuranHabit(
                        activity
                      ) && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold">
                              📖 Today:
                            </span>

                            <span>
                              {quranProgress}{" "}
                              {activity.quranUnit ===
                              "verses"
                                ? "ayat"
                                : "halaman"}
                            </span>
                          </div>

                          {quranProgress >
                            0 && (
                            <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#ddd4c7]">
                              <div
                                className="h-full rounded-full bg-[#8f806d]"
                                style={{
                                  width: "100%",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {count > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void removeActivity(
                              activity
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ddd4c7] font-bold"
                        >
                          ×
                        </button>

                        <span className="min-w-6 text-center font-semibold">
                          {count}
                        </span>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={
                        activity.isHabit &&
                        completed
                      }
                      onClick={() =>
                        addActivity(
                          activity
                        )
                      }
                      className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {activity.isHabit &&
                      completed
                        ? "Done"
                        : "+ Add"}
                    </button>
                  </div>
                </div>

                {pendingActivity?.id ===
                  activity.id &&
                  isQuranHabit(
                    activity
                  ) && (
                    <div className="mt-4 border-t border-[#d8cec0] pt-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold">
                          📖 Quran Progress
                        </p>

                        <p className="mt-1 text-xs opacity-50">
                          How much did you read
                          today?
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            quranProgressInput
                          }
                          onChange={(
                            event
                          ) =>
                            setQuranProgressInput(
                              event.target.value
                            )
                          }
                          placeholder={
                            activity.quranUnit ===
                            "verses"
                              ? "e.g. 20"
                              : "e.g. 5"
                          }
                          className="min-w-0 flex-1 rounded-xl border border-[#cfc3b4] bg-white px-3 py-2 text-sm outline-none"
                        />

                        <button
                          type="button"
                          onClick={
                            confirmQuranProgress
                          }
                          disabled={
                            !quranProgressInput
                          }
                          className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Add
                        </button>
                      </div>

                      <p className="mt-2 text-xs opacity-50">
                        Unit:{" "}
                        {activity.quranUnit ===
                        "verses"
                          ? "Ayat"
                          : "Halaman"}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setPendingActivity(
                            null
                          );

                          setQuranProgressInput(
                            ""
                          );
                        }}
                        className="mt-3 text-xs font-medium opacity-50 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                {pendingActivity?.id ===
                  activity.id &&
                  !isQuranHabit(
                    activity
                  ) &&
                  eligible && (
                    <div className="mt-4 border-t border-[#d8cec0] pt-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold">
                          How long?
                        </p>

                        <p className="mt-1 text-xs opacity-50">
                          10 minutes = 1 Gold.
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {durationOptions.map(
                          (minutes) => {
                            const earnedGold =
                              calculateGold(
                                minutes
                              );

                            return (
                              <button
                                key={
                                  minutes
                                }
                                type="button"
                                onClick={() =>
                                  void completeActivity(
                                    activity,
                                    minutes
                                  )
                                }
                                className="rounded-xl border border-[#cfc3b4] bg-white/70 px-2 py-3 text-sm font-medium transition hover:bg-white"
                              >
                                <span className="block">
                                  {minutes}m
                                </span>

                                <span className="mt-1 block text-xs opacity-50">
                                  +{earnedGold} Gold
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>

                      <div className="mt-3 rounded-xl border border-[#cfc3b4] bg-white/50 p-3">
                        <label className="text-xs font-semibold">
                          Custom minutes
                        </label>

                        <div className="mt-2 flex gap-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              customMinutes
                            }
                            onChange={(
                              event
                            ) =>
                              setCustomMinutes(
                                event.target.value
                              )
                            }
                            placeholder="e.g. 35"
                            className="min-w-0 flex-1 rounded-xl border border-[#cfc3b4] bg-white px-3 py-2 text-sm outline-none"
                          />

                          <button
                            type="button"
                            onClick={
                              confirmCustomDuration
                            }
                            disabled={
                              !customMinutes
                            }
                            className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>

                        {Number(
                          customMinutes
                        ) > 0 && (
                          <p className="mt-2 text-xs opacity-60">
                            {Math.floor(
                              Number(
                                customMinutes
                              ) / 10
                            )}{" "}
                            Gold earned
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPendingActivity(
                            null
                          );

                          setCustomMinutes(
                            ""
                          );
                        }}
                        className="mt-3 text-xs font-medium opacity-50 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}