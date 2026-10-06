"use client";

import { useEffect, useState } from "react";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type StatName =
  | "Energy"
  | "Focus"
  | "Growth";

type Habit = {
  id: string;
  name: string;
  xp: number;
  stat: StatName;
  earnsGold?: boolean;
};

export default function Habits() {
  const [habits, setHabits] =
    useState<Habit[]>([]);

  const [showForm, setShowForm] =
    useState(false);

  const [name, setName] =
    useState("");

  const [xp, setXp] =
    useState("5");

  const [stat, setStat] =
    useState<StatName>("Growth");

  const [earnsGold, setEarnsGold] =
    useState(false);

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "life-game-habits"
      );

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setHabits(parsed);
      }
    } catch {
      setHabits([]);
    }
  }, []);

  async function saveHabits(
    updated: Habit[]
  ) {
    setHabits(updated);

    localStorage.setItem(
      "life-game-habits",
      JSON.stringify(updated)
    );

    window.dispatchEvent(
      new Event("life-game-updated")
    );

    const result =
      await saveCurrentLifeGameStorage(
        "life-game-habits"
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan habits ke Supabase:",
        result
      );
    }
  }

  function addHabit() {
    const habitName =
      name.trim();

    const habitXp =
      Number(xp);

    if (
      !habitName ||
      !Number.isFinite(habitXp) ||
      habitXp <= 0
    ) {
      return;
    }

    const newHabit: Habit = {
      id: `${Date.now()}-${Math.random()}`,
      name: habitName,
      xp: Math.floor(habitXp),
      stat,
      earnsGold,
    };

    void saveHabits([
      ...habits,
      newHabit,
    ]);

    setName("");
    setXp("5");
    setStat("Growth");
    setEarnsGold(false);
    setShowForm(false);
  }

  function deleteHabit(
    id: string
  ) {
    const updated =
      habits.filter(
        (habit) =>
          habit.id !== id
      );

    void saveHabits(updated);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm opacity-50">
            Your habits
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Habit List
          </h3>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowForm(!showForm)
          }
          className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
        >
          {showForm
            ? "Cancel"
            : "+ Add Habit"}
        </button>
      </div>

      {showForm && (
        <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_100px_140px_auto]">
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Habit name"
              className="min-w-0 rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-sm outline-none focus:border-[#8f806d]"
            />

            <input
              type="number"
              min="1"
              step="1"
              value={xp}
              onChange={(event) =>
                setXp(
                  event.target.value
                )
              }
              className="rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-sm outline-none focus:border-[#8f806d]"
            />

            <select
              value={stat}
              onChange={(event) =>
                setStat(
                  event.target.value as StatName
                )
              }
              className="rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-sm outline-none focus:border-[#8f806d]"
            >
              <option value="Energy">
                Energy
              </option>

              <option value="Focus">
                Focus
              </option>

              <option value="Growth">
                Growth
              </option>
            </select>

            <button
              type="button"
              onClick={addHabit}
              className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d8cec0] bg-white/60 p-3">
            <input
              type="checkbox"
              checked={earnsGold}
              onChange={(event) =>
                setEarnsGold(
                  event.target.checked
                )
              }
              className="mt-0.5 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-semibold">
                Earn Gold from this habit
              </span>

              <span className="mt-1 block text-xs opacity-50">
                If enabled, this habit earns 1 Gold every 10 minutes.
              </span>
            </span>
          </label>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {habits.length === 0 ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-6 text-center">
            <p className="text-sm opacity-50">
              No habits yet.
            </p>

            <p className="mt-1 font-semibold">
              Add your first habit above.
            </p>
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between gap-4 rounded-2xl bg-[#f5f0e8] p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {habit.name}
                </p>

                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs opacity-50">
                  <span>
                    +{habit.xp} XP
                  </span>

                  <span>
                    · +5 {habit.stat}
                  </span>

                  {habit.earnsGold && (
                    <span>
                      · 🪙 earns Gold
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  deleteHabit(
                    habit.id
                  )
                }
                className="shrink-0 rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}