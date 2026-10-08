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

type QuranUnit =
  | "pages"
  | "verses";

type Habit = {
  id: string;
  name: string;
  xp: number;
  stat: StatName;
  earnsGold?: boolean;
  trackQuran?: boolean;
  quranUnit?: QuranUnit;
  icon?: string;
};

function loadHabits(): Habit[] {
  const saved =
    localStorage.getItem(
      "life-game-habits"
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return [];
  }

  return [];
}

export default function Habits() {
  const [habits, setHabits] =
    useState<Habit[]>([]);

  const [showForm, setShowForm] =
    useState(false);

  const [name, setName] =
    useState("");

  const [icon, setIcon] =
    useState("✨");

  const [xp, setXp] =
    useState("5");

  const [stat, setStat] =
    useState<StatName>("Growth");

  const [earnsGold, setEarnsGold] =
    useState(false);

  const [trackQuran, setTrackQuran] =
    useState(false);

  const [quranUnit, setQuranUnit] =
    useState<QuranUnit>("pages");

  const [editingHabitId, setEditingHabitId] =
    useState<string | null>(null);

  const [draggedHabitId, setDraggedHabitId] =
    useState<string | null>(null);

  const [dragOverHabitId, setDragOverHabitId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeHabits() {
      await syncLifeGameStorageFromSupabase();

      if (cancelled) {
        return;
      }

      setHabits(loadHabits());
    }

    void initializeHabits();

    return () => {
      cancelled = true;
    };
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

  function resetForm() {
    setName("");
    setIcon("✨");
    setXp("5");
    setStat("Growth");
    setEarnsGold(false);
    setTrackQuran(false);
    setQuranUnit("pages");
    setEditingHabitId(null);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(
    habit: Habit
  ) {
    setEditingHabitId(
      habit.id
    );

    setName(
      habit.name
    );

    setIcon(
      habit.icon ||
        "✨"
    );

    setXp(
      String(
        habit.xp
      )
    );

    setStat(
      habit.stat
    );

    setEarnsGold(
      habit.earnsGold === true
    );

    setTrackQuran(
      habit.trackQuran === true
    );

    setQuranUnit(
      habit.quranUnit ||
        "pages"
    );

    setShowForm(true);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function saveHabit() {
    const habitName =
      name.trim();

    const habitXp =
      Number(xp);

    const habitIcon =
      icon.trim() ||
      "✨";

    if (
      !habitName ||
      !Number.isFinite(
        habitXp
      ) ||
      habitXp <= 0
    ) {
      return;
    }

    if (
      editingHabitId
    ) {
      const updated =
        habits.map(
          (habit) => {
            if (
              habit.id !==
              editingHabitId
            ) {
              return habit;
            }

            return {
              ...habit,
              name: habitName,
              xp: Math.floor(
                habitXp
              ),
              stat,
              earnsGold,
              trackQuran,
              icon:
                habitIcon,
              ...(trackQuran
                ? {
                    quranUnit,
                  }
                : {
                    quranUnit:
                      undefined,
                  }),
            };
          }
        );

      void saveHabits(
        updated
      );
    } else {
      const newHabit: Habit = {
        id: `${Date.now()}-${Math.random()}`,
        name: habitName,
        xp: Math.floor(
          habitXp
        ),
        stat,
        earnsGold,
        trackQuran,
        icon:
          habitIcon,
        ...(trackQuran
          ? {
              quranUnit,
            }
          : {}),
      };

      void saveHabits([
        ...habits,
        newHabit,
      ]);
    }

    closeForm();
  }

  function deleteHabit(
    id: string
  ) {
    const updated =
      habits.filter(
        (habit) =>
          habit.id !==
          id
      );

    void saveHabits(
      updated
    );

    if (
      editingHabitId ===
      id
    ) {
      closeForm();
    }
  }

  function handleDragStart(
    event: React.DragEvent<HTMLDivElement>,
    id: string
  ) {
    setDraggedHabitId(
      id
    );

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      id
    );
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>,
    id: string
  ) {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";

    if (
      draggedHabitId &&
      draggedHabitId !== id
    ) {
      setDragOverHabitId(
        id
      );
    }
  }

  function handleDragLeave() {
    setDragOverHabitId(
      null
    );
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
    targetId: string
  ) {
    event.preventDefault();

    const sourceId =
      draggedHabitId ||
      event.dataTransfer.getData(
        "text/plain"
      );

    if (
      !sourceId ||
      sourceId ===
        targetId
    ) {
      setDraggedHabitId(
        null
      );

      setDragOverHabitId(
        null
      );

      return;
    }

    const sourceIndex =
      habits.findIndex(
        (habit) =>
          habit.id ===
          sourceId
      );

    const targetIndex =
      habits.findIndex(
        (habit) =>
          habit.id ===
          targetId
      );

    if (
      sourceIndex ===
        -1 ||
      targetIndex ===
        -1
    ) {
      setDraggedHabitId(
        null
      );

      setDragOverHabitId(
        null
      );

      return;
    }

    const updated = [
      ...habits,
    ];

    const [
      movedHabit,
    ] = updated.splice(
      sourceIndex,
      1
    );

    updated.splice(
      targetIndex,
      0,
      movedHabit
    );

    setDraggedHabitId(
      null
    );

    setDragOverHabitId(
      null
    );

    void saveHabits(
      updated
    );
  }

  function handleDragEnd() {
    setDraggedHabitId(
      null
    );

    setDragOverHabitId(
      null
    );
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
          onClick={
            showForm
              ? closeForm
              : openAddForm
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
          <div className="mb-4">
            <p className="font-semibold">
              {editingHabitId
                ? "Edit Habit"
                : "New Habit"}
            </p>

            <p className="mt-1 text-xs opacity-50">
              Customize the emoji, name,
              XP, and other settings.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[80px_1fr_100px_140px_auto]">
            <input
              type="text"
              value={icon}
              onChange={(event) =>
                setIcon(
                  event.target
                    .value
                )
              }
              placeholder="✨"
              className="w-full rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-center text-lg outline-none focus:border-[#8f806d]"
              aria-label="Habit icon"
            />

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target
                    .value
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
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-sm outline-none focus:border-[#8f806d]"
            />

            <select
              value={stat}
              onChange={(event) =>
                setStat(
                  event.target
                    .value as StatName
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
              onClick={
                saveHabit
              }
              className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
            >
              {editingHabitId
                ? "Update"
                : "Save"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-50">
            <span>
              Example: 📚 📖 🏃 💧 🧠
              🎮 🧘 ☕
            </span>

            <span>
              · Leave empty for ✨
            </span>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d8cec0] bg-white/60 p-3">
            <input
              type="checkbox"
              checked={
                earnsGold
              }
              onChange={(
                event
              ) =>
                setEarnsGold(
                  event.target
                    .checked
                )
              }
              className="mt-0.5 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-semibold">
                Earn Gold from this habit
              </span>

              <span className="mt-1 block text-xs opacity-50">
                If enabled, this habit
                earns 1 Gold every 10
                minutes.
              </span>
            </span>
          </label>

          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d8cec0] bg-white/60 p-3">
            <input
              type="checkbox"
              checked={
                trackQuran
              }
              onChange={(
                event
              ) =>
                setTrackQuran(
                  event.target
                    .checked
                )
              }
              className="mt-0.5 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-semibold">
                Track Quran Progress
              </span>

              <span className="mt-1 block text-xs opacity-50">
                Use this for habits such as
                Ngaji to record how much
                you read each day.
              </span>
            </span>
          </label>

          {trackQuran && (
            <div className="mt-3 rounded-xl border border-[#d8cec0] bg-white/60 p-3">
              <p className="text-sm font-semibold">
                Progress unit
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuranUnit(
                      "pages"
                    )
                  }
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    quranUnit ===
                    "pages"
                      ? "border-[#8f806d] bg-[#8f806d] text-white"
                      : "border-[#cfc3b4] bg-white"
                  }`}
                >
                  📖 Halaman
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setQuranUnit(
                      "verses"
                    )
                  }
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    quranUnit ===
                    "verses"
                      ? "border-[#8f806d] bg-[#8f806d] text-white"
                      : "border-[#cfc3b4] bg-white"
                  }`}
                >
                  آية Ayat
                </button>
              </div>

              <p className="mt-2 text-xs opacity-50">
                You can change the amount
                every day from Today.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {habits.length ===
        0 ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-6 text-center">
            <p className="text-sm opacity-50">
              No habits yet.
            </p>

            <p className="mt-1 font-semibold">
              Add your first habit
              above.
            </p>
          </div>
        ) : (
          habits.map(
            (
              habit,
              index
            ) => (
              <div
                key={
                  habit.id
                }
                draggable
                onDragStart={(
                  event
                ) =>
                  handleDragStart(
                    event,
                    habit.id
                  )
                }
                onDragOver={(
                  event
                ) =>
                  handleDragOver(
                    event,
                    habit.id
                  )
                }
                onDragLeave={
                  handleDragLeave
                }
                onDrop={(
                  event
                ) =>
                  handleDrop(
                    event,
                    habit.id
                  )
                }
                onDragEnd={
                  handleDragEnd
                }
                className={`flex items-center gap-3 rounded-2xl bg-[#f5f0e8] p-4 transition ${
                  draggedHabitId ===
                  habit.id
                    ? "opacity-40"
                    : ""
                } ${
                  dragOverHabitId ===
                  habit.id
                    ? "ring-2 ring-[#8f806d]"
                    : ""
                }`}
              >
                <div
                  className="hidden shrink-0 cursor-grab select-none text-lg opacity-40 active:cursor-grabbing sm:block"
                  title="Drag to reorder"
                >
                  ⋮⋮
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-xl">
                  {habit.icon ||
                    "✨"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold opacity-30">
                      {index +
                        1}
                    </span>

                    <p className="truncate font-semibold">
                      {habit.name}
                    </p>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs opacity-50">
                    <span>
                      +
                      {
                        habit.xp
                      }{" "}
                      XP
                    </span>

                    <span>
                      · +5{" "}
                      {
                        habit.stat
                      }
                    </span>

                    {habit.earnsGold && (
                      <span>
                        · 🪙 earns
                        Gold
                      </span>
                    )}

                    {habit.trackQuran && (
                      <span>
                        · 📖{" "}
                        {habit.quranUnit ===
                        "verses"
                          ? "Ayat"
                          : "Halaman"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openEditForm(
                        habit
                      )
                    }
                    className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteHabit(
                        habit.id
                      )
                    }
                    className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>

      {habits.length >
        1 && (
        <p className="mt-3 text-center text-xs opacity-40">
          ⋮⋮ Drag habits to change
          their order
        </p>
      )}
    </div>
  );
}