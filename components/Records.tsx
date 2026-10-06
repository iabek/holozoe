"use client";

import { useEffect, useState } from "react";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type RecordItem = {
  id: string;
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

export default function Records() {
  const [records, setRecords] =
    useState<RecordItem[]>([]);

  const [goldLedger, setGoldLedger] =
    useState<GoldLedgerItem[]>([]);

  useEffect(() => {
    function loadRecords() {
      const saved =
        localStorage.getItem(
          "life-game-history"
        );

      if (!saved) {
        setRecords([]);
      } else {
        try {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            setRecords(parsed);
          } else {
            setRecords([]);
          }
        } catch {
          setRecords([]);
        }
      }

      const savedLedger =
        localStorage.getItem(
          "life-game-gold-ledger"
        );

      if (!savedLedger) {
        setGoldLedger([]);
      } else {
        try {
          const parsedLedger =
            JSON.parse(savedLedger);

          if (Array.isArray(parsedLedger)) {
            setGoldLedger(parsedLedger);
          } else {
            setGoldLedger([]);
          }
        } catch {
          setGoldLedger([]);
        }
      }
    }

    loadRecords();

    window.addEventListener(
      "storage",
      loadRecords
    );

    window.addEventListener(
      "life-game-updated",
      loadRecords
    );

    return () => {
      window.removeEventListener(
        "storage",
        loadRecords
      );

      window.removeEventListener(
        "life-game-updated",
        loadRecords
      );
    };
  }, []);

  async function persistStorageKeys(
    keys: string[]
  ) {
    const uniqueKeys = [
      ...new Set(keys),
    ];

    const results =
      await Promise.all(
        uniqueKeys.map((key) =>
          saveCurrentLifeGameStorage(
            key
          )
        )
      );

    const failed = results.find(
      (result) => !result.success
    );

    if (failed) {
      console.error(
        "Gagal menyimpan perubahan Records ke Supabase:",
        failed
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
        Number(
          transaction.amount
        ) || 0
      )
    );

    const updatedGold = isEarn
      ? Math.max(
          0,
          safeCurrentGold - amount
        )
      : safeCurrentGold + amount;

    const updatedLedger =
      goldLedger.filter(
        (item) =>
          item.id !== transactionId
      );

    localStorage.setItem(
      "life-game-gold",
      String(updatedGold)
    );

    localStorage.setItem(
      "life-game-gold-ledger",
      JSON.stringify(
        updatedLedger
      )
    );

    setGoldLedger(updatedLedger);

    await persistStorageKeys([
      "life-game-gold",
      "life-game-gold-ledger",
    ]);

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

    const statName =
      record.stat;

    const confirmed =
      window.confirm(
        `Hapus record "${record.activity}"?\n\nXP, Stat, Gold, dan aktivitas ini akan dikembalikan seperti sebelum aktivitas dicatat.`
      );

    if (!confirmed) {
      return;
    }

    /*
     * REMOVE RECORD
     */
    const updatedRecords =
      records.filter(
        (_, index) =>
          index !== recordIndex
      );

    localStorage.setItem(
      "life-game-history",
      JSON.stringify(
        updatedRecords
      )
    );

    setRecords(updatedRecords);

    /*
     * REVERSE XP
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
     * REVERSE GOLD
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
       * Remove ONE matching Gold EARN
       * transaction.
       */
      const savedLedger =
        localStorage.getItem(
          "life-game-gold-ledger"
        );

      if (savedLedger) {
        try {
          const parsedLedger =
            JSON.parse(
              savedLedger
            );

          if (
            Array.isArray(
              parsedLedger
            )
          ) {
            const recordDateKey =
              getDateKey(
                record.date
              );

            let removedLedger =
              false;

            const updatedLedger =
              parsedLedger.filter(
                (
                  transaction: GoldLedgerItem
                ) => {
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

            localStorage.setItem(
              "life-game-gold-ledger",
              JSON.stringify(
                updatedLedger
              )
            );

            setGoldLedger(
              updatedLedger
            );
          }
        } catch {
          // Keep Gold balance corrected
          // even if the ledger cannot be parsed.
        }
      }
    }

    /*
     * REVERSE DAILY STAT
     *
     * Stats reset by date, so only reverse
     * the stat if the record belongs to today.
     */
    const today =
      getTodayKey();

    const recordDate =
      getDateKey(
        record.date
      );

    if (
      recordDate === today
    ) {
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

          const currentStats =
            parsed?.[today] as
              | DailyStats
              | undefined;

          if (
            currentStats &&
            typeof currentStats ===
              "object"
          ) {
            const updatedStats = {
              Energy: Math.max(
                0,
                Number(
                  currentStats.Energy ||
                    0
                )
              ),
              Focus: Math.max(
                0,
                Number(
                  currentStats.Focus ||
                    0
                )
              ),
              Growth: Math.max(
                0,
                Number(
                  currentStats.Growth ||
                    0
                )
              ),
            };

            if (
              statName ===
              "Energy"
            ) {
              updatedStats.Energy =
                Math.max(
                  0,
                  updatedStats.Energy -
                    5
                );
            }

            if (
              statName ===
              "Focus"
            ) {
              updatedStats.Focus =
                Math.max(
                  0,
                  updatedStats.Focus -
                    5
                );
            }

            if (
              statName ===
              "Growth"
            ) {
              updatedStats.Growth =
                Math.max(
                  0,
                  updatedStats.Growth -
                    5
                );
            }

            parsed[today] =
              updatedStats;

            localStorage.setItem(
              "life-game-daily-stats",
              JSON.stringify(parsed)
            );
          }
        } catch {
          // Ignore malformed stats data.
        }
      }
    }

    /*
     * REMOVE ONE OCCURRENCE FROM TODAY
     */
    const savedActivities =
      localStorage.getItem(
        "life-game-daily-activities"
      );

    if (savedActivities) {
      try {
        const parsed =
          JSON.parse(
            savedActivities
          );

        if (
          parsed &&
          typeof parsed ===
            "object" &&
          !Array.isArray(parsed)
        ) {
          const activityDateKey =
            recordDate;

          if (
            activityDateKey &&
            Array.isArray(
              parsed[
                activityDateKey
              ]
            )
          ) {
            const activityList =
              parsed[
                activityDateKey
              ];

            const activityIndex =
              activityList.findIndex(
                (
                  activityId: string
                ) =>
                  activityId ===
                  record.id
              );

            if (
              activityIndex !==
              -1
            ) {
              activityList.splice(
                activityIndex,
                1
              );

              parsed[
                activityDateKey
              ] = activityList;

              localStorage.setItem(
                "life-game-daily-activities",
                JSON.stringify(
                  parsed
                )
              );
            }
          }
        }
      } catch {
        // Ignore malformed activity data.
      }
    }

    /*
     * PERSIST EVERYTHING TO SUPABASE
     *
     * This is the important part:
     * localStorage is the cache,
     * Supabase is the permanent storage.
     */
    const keysToPersist = [
      "life-game-history",
      "life-game-xp",
      "life-game-daily-stats",
      "life-game-daily-activities",
    ];

    if (gold > 0) {
      keysToPersist.push(
        "life-game-gold",
        "life-game-gold-ledger"
      );
    }

    await persistStorageKeys(
      keysToPersist
    );

    /*
     * REFRESH OTHER COMPONENTS
     */
    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  return (
    <div className="space-y-4">
      {/* ACTIVITY HISTORY */}
      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            History
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Activity Records
          </h3>

          <p className="mt-1 text-sm opacity-50">
            Hapus aktivitas yang tidak sengaja tercatat.
          </p>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-sm opacity-50">
              No activity records yet.
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
                            title="Hapus record"
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
                            🪙 +{gold} Gold
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

      {/* GOLD LEDGER */}
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