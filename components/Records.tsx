"use client";

import { useEffect, useState } from "react";
import {
  saveCurrentLifeGameStorage,
  syncLifeGameStorageFromSupabase,
} from "@/lib/life-game-storage";

type RecordItem = {
  id: string;
  activityId?: string;
  activity: string;
  xp: number;
  stat: string;
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

type DailyStats = {
  Energy: number;
  Focus: number;
  Growth: number;
};

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKey(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);

  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export default function Records() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [goldLedger, setGoldLedger] = useState<GoldLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRecords() {
    try {
      /*
       * IMPORTANT:
       * Selalu ambil data terbaru dari Supabase terlebih dahulu.
       * Jadi History tidak membaca data lokal yang sudah stale.
       */
      await syncLifeGameStorageFromSupabase();

      const savedRecords = loadJson<RecordItem[]>(
        "life-game-history",
        []
      );

      const savedLedger = loadJson<GoldLedgerItem[]>(
        "life-game-gold-ledger",
        []
      );

      setRecords(
        Array.isArray(savedRecords)
          ? savedRecords
          : []
      );

      setGoldLedger(
        Array.isArray(savedLedger)
          ? savedLedger
          : []
      );
    } catch (error) {
      console.error(
        "Gagal memuat History:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();

    function handleUpdate() {
      const savedRecords = loadJson<RecordItem[]>(
        "life-game-history",
        []
      );

      const savedLedger = loadJson<GoldLedgerItem[]>(
        "life-game-gold-ledger",
        []
      );

      setRecords(
        Array.isArray(savedRecords)
          ? savedRecords
          : []
      );

      setGoldLedger(
        Array.isArray(savedLedger)
          ? savedLedger
          : []
      );
    }

    window.addEventListener(
      "storage",
      handleUpdate
    );

    window.addEventListener(
      "life-game-updated",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleUpdate
      );

      window.removeEventListener(
        "life-game-updated",
        handleUpdate
      );
    };
  }, []);

  async function persistHistory(
    updatedRecords: RecordItem[]
  ) {
    localStorage.setItem(
      "life-game-history",
      JSON.stringify(updatedRecords)
    );

    setRecords(updatedRecords);

    const result =
      await saveCurrentLifeGameStorage(
        "life-game-history"
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan History ke Supabase:",
        result
      );
    }
  }

  async function persistGoldLedger(
    updatedLedger: GoldLedgerItem[]
  ) {
    localStorage.setItem(
      "life-game-gold-ledger",
      JSON.stringify(updatedLedger)
    );

    setGoldLedger(updatedLedger);

    const result =
      await saveCurrentLifeGameStorage(
        "life-game-gold-ledger"
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan Gold Ledger ke Supabase:",
        result
      );
    }
  }

  async function deleteGoldTransaction(
    transactionId: string
  ) {
    const transaction =
      goldLedger.find(
        (item) =>
          item.id === transactionId
      );

    if (!transaction) {
      return;
    }

    const isEarn =
      transaction.type === "EARN";

    const confirmed =
      window.confirm(
        `Hapus transaksi "${
          isEarn
            ? "Gold Earned"
            : "Gold Spent"
        } ${
          isEarn ? "+" : "-"
        }${transaction.amount} Gold"?\n\nSaldo Gold akan disesuaikan kembali.`
      );

    if (!confirmed) {
      return;
    }

    const currentGold = Number(
      localStorage.getItem(
        "life-game-gold"
      ) || "0"
    );

    const safeCurrentGold =
      Number.isFinite(currentGold)
        ? Math.max(
            0,
            Math.floor(currentGold)
          )
        : 0;

    const amount = Math.max(
      0,
      Math.floor(
        Number(transaction.amount) || 0
      )
    );

    const updatedGold = isEarn
      ? Math.max(
          0,
          safeCurrentGold - amount
        )
      : safeCurrentGold + amount;

    localStorage.setItem(
      "life-game-gold",
      String(updatedGold)
    );

    const updatedLedger =
      goldLedger.filter(
        (item) =>
          item.id !== transactionId
      );

    await persistGoldLedger(
      updatedLedger
    );

    await saveCurrentLifeGameStorage(
      "life-game-gold"
    );

    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  async function deleteRecord(
    recordIndex: number
  ) {
    const record =
      records[recordIndex];

    if (!record) {
      return;
    }

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

    const xp =
      typeof record.xp ===
      "number"
        ? Math.max(
            0,
            Math.floor(record.xp)
          )
        : 0;

    const confirmed =
      window.confirm(
        `Hapus activity "${record.activity}"?\n\nActivity ini akan dihapus dari History dan perubahan XP/Gold akan dibalik.`
      );

    if (!confirmed) {
      return;
    }

    /*
     * ==========================================
     * 1. REMOVE HISTORY
     * ==========================================
     */

    const updatedRecords =
      records.filter(
        (_, index) =>
          index !== recordIndex
      );

    await persistHistory(
      updatedRecords
    );

    /*
     * ==========================================
     * 2. REVERSE XP
     * ==========================================
     */

    const currentXp = Number(
      localStorage.getItem(
        "life-game-xp"
      ) || "0"
    );

    const safeCurrentXp =
      Number.isFinite(currentXp)
        ? Math.max(
            0,
            Math.floor(currentXp)
          )
        : 0;

    const updatedXp =
      Math.max(
        0,
        safeCurrentXp - xp
      );

    localStorage.setItem(
      "life-game-xp",
      String(updatedXp)
    );

    /*
     * ==========================================
     * 3. REVERSE GOLD
     * ==========================================
     */

    if (gold > 0) {
      const currentGold =
        Number(
          localStorage.getItem(
            "life-game-gold"
          ) || "0"
        );

      const safeCurrentGold =
        Number.isFinite(
          currentGold
        )
          ? Math.max(
              0,
              Math.floor(
                currentGold
              )
            )
          : 0;

      const updatedGold =
        Math.max(
          0,
          safeCurrentGold - gold
        );

      localStorage.setItem(
        "life-game-gold",
        String(updatedGold)
      );

      /*
       * Hapus SATU transaksi Gold Earn
       * yang cocok dengan activity ini.
       */
      const savedLedger =
        loadJson<
          GoldLedgerItem[]
        >(
          "life-game-gold-ledger",
          []
        );

      const recordDateKey =
        getDateKey(record.date);

      let removedLedger =
        false;

      const updatedLedger =
        savedLedger.filter(
          (transaction) => {
            if (
              removedLedger ||
              transaction.type !==
                "EARN" ||
              transaction.amount !==
                gold
            ) {
              return true;
            }

            const transactionDateKey =
              getDateKey(
                transaction.date
              );

            if (
              recordDateKey &&
              transactionDateKey !==
                recordDateKey
            ) {
              return true;
            }

            removedLedger = true;

            return false;
          }
        );

      await persistGoldLedger(
        updatedLedger
      );
    }

    /*
     * ==========================================
     * 4. REVERSE DAILY ACTIVITY
     * ==========================================
     *
     * daily-activities menyimpan activityId,
     * BUKAN history record id.
     */
    const savedActivities =
      loadJson<
        Record<string, string[]>
      >(
        "life-game-daily-activities",
        {}
      );

    const recordDate =
      getDateKey(record.date);

    const activityId =
      record.activityId;

    if (
      recordDate &&
      activityId &&
      Array.isArray(
        savedActivities[recordDate]
      )
    ) {
      const activityList =
        savedActivities[
          recordDate
        ];

      const activityIndex =
        activityList.lastIndexOf(
          activityId
        );

      if (
        activityIndex !== -1
      ) {
        activityList.splice(
          activityIndex,
          1
        );

        savedActivities[
          recordDate
        ] = activityList;

        localStorage.setItem(
          "life-game-daily-activities",
          JSON.stringify(
            savedActivities
          )
        );

        await saveCurrentLifeGameStorage(
          "life-game-daily-activities"
        );
      }
    }

    /*
     * ==========================================
     * 5. REVERSE DAILY STATS
     * ==========================================
     *
     * Hanya untuk hari ini.
     *
     * Prayer sendiri biasanya memberi
     * Growth +1, sedangkan activity lain
     * mempunyai perubahan masing-masing.
     *
     * Untuk History delete kita tidak
     * menebak perubahan stat activity.
     * Prayer akan menjaga stat-nya sendiri
     * saat di-uncheck.
     */
    const today =
      getTodayKey();

    if (
      recordDate === today &&
      !record.activityId?.startsWith(
        "prayer-"
      ) &&
      !record.activityId?.startsWith(
        "custom-prayer-"
      )
    ) {
      const savedStats =
        loadJson<
          Record<string, DailyStats>
        >(
          "life-game-daily-stats",
          {}
        );

      const currentStats =
        savedStats[today];

      if (currentStats) {
        const updatedStats = {
          ...currentStats,
        };

        if (
          record.stat ===
          "Energy"
        ) {
          updatedStats.Energy =
            Math.max(
              0,
              Number(
                updatedStats.Energy || 0
              ) - 5
            );
        }

        if (
          record.stat ===
          "Focus"
        ) {
          updatedStats.Focus =
            Math.max(
              0,
              Number(
                updatedStats.Focus || 0
              ) - 5
            );
        }

        if (
          record.stat ===
          "Growth"
        ) {
          updatedStats.Growth =
            Math.max(
              0,
              Number(
                updatedStats.Growth || 0
              ) - 5
            );
        }

        savedStats[today] =
          updatedStats;

        localStorage.setItem(
          "life-game-daily-stats",
          JSON.stringify(
            savedStats
          )
        );

        await saveCurrentLifeGameStorage(
          "life-game-daily-stats"
        );
      }
    }

    /*
     * ==========================================
     * 6. SAVE XP
     * ==========================================
     */

    await saveCurrentLifeGameStorage(
      "life-game-xp"
    );

    /*
     * ==========================================
     * 7. REFRESH ALL COMPONENTS
     * ==========================================
     */

    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white/60 p-6 shadow-sm">
        <p className="text-sm opacity-50">
          Loading History...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            History
          </p>

          <h3 className="mt-1 text-xl font-bold">
            What Happened
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Semua activity yang benar-benar tercatat di perjalananmu.
          </p>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-sm opacity-50">
              Belum ada activity.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records
              .slice()
              .reverse()
              .map(
                (
                  record,
                  reversedIndex
                ) => {
                  const recordIndex =
                    records.length -
                    1 -
                    reversedIndex;

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
                      key={`${record.id}-${recordIndex}`}
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
                            ).toLocaleString(
                              "id-ID"
                            )}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-start gap-3">
                          <div className="text-right">
                            <p className="font-semibold">
                              +{record.xp} XP
                            </p>

                            <p className="mt-1 text-xs opacity-50">
                              {record.stat}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deleteRecord(
                                recordIndex
                              )
                            }
                            className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium transition hover:bg-[#cfc3b4]"
                            title="Hapus activity"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {hasDuration && (
                          <span className="rounded-full bg-white/70 px-3 py-1.5">
                            ⏱️{" "}
                            {
                              record.durationMinutes
                            }
                            m
                          </span>
                        )}

                        {gold > 0 && (
                          <span className="rounded-full bg-white/70 px-3 py-1.5">
                            🪙 +
                            {gold} Gold
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            Gold
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Gold Ledger
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Every Gold earned and spent.
          </p>
        </div>

        {goldLedger.length === 0 ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-sm opacity-50">
              No Gold transactions yet.
            </p>

            <p className="mt-1 text-xs opacity-40">
              Earn Gold from qualifying activities or spend it on Leisure.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {goldLedger
              .slice()
              .reverse()
              .map(
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {isEarn
                                ? "↗️"
                                : "↘️"}
                            </span>

                            <p className="font-semibold">
                              {isEarn
                                ? "Gold Earned"
                                : "Gold Spent"}
                            </p>
                          </div>

                          <p className="mt-1 text-sm opacity-60">
                            {
                              transaction.reason
                            }
                          </p>

                          <p className="mt-1 text-xs opacity-40">
                            {new Date(
                              transaction.date
                            ).toLocaleString(
                              "id-ID"
                            )}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-start gap-3">
                          <div className="text-right">
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

                          <button
                            type="button"
                            onClick={() =>
                              deleteGoldTransaction(
                                transaction.id
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ddd4c7] text-sm font-medium transition hover:bg-[#cfc3b4]"
                            title="Hapus transaksi"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
          </div>
        )}
      </section>
    </div>
  );
}