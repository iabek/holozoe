"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type PlannerEvent = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  recurrence:
    | "none"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
  notes: string;
};

type PersonBirthday = {
  id: string;
  name: string;
  birth_date: string;
};

const STORAGE_KEY = "life-game-planner-events";

const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return getDateKey(new Date());
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);

  const mondayIndex =
    firstDay.getDay() === 0
      ? 6
      : firstDay.getDay() - 1;

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const days: Date[] = [];

  for (let i = 0; i < mondayIndex; i++) {
    days.push(
      new Date(
        year,
        month,
        1 - (mondayIndex - i)
      )
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  while (days.length < 42) {
    const lastDate = days[days.length - 1];
    const nextDate = new Date(lastDate);

    nextDate.setDate(nextDate.getDate() + 1);

    days.push(nextDate);
  }

  return days;
}

function formatEventTime(event: PlannerEvent) {
  if (!event.startTime && !event.endTime) {
    return "All day";
  }

  if (event.startTime && event.endTime) {
    return `${event.startTime}ÔÇô${event.endTime}`;
  }

  return event.startTime || event.endTime || "All day";
}

function getRecurrenceLabel(
  recurrence: PlannerEvent["recurrence"]
) {
  switch (recurrence) {
    case "daily":
      return "Daily";

    case "weekly":
      return "Weekly";

    case "monthly":
      return "Monthly";

    case "yearly":
      return "Yearly";

    default:
      return "One-time";
  }
}

function eventOccursOnDate(
  event: PlannerEvent,
  date: Date
) {
  const target = getDateKey(date);

  if (event.recurrence === "none") {
    return event.date === target;
  }

  const eventDate = new Date(
    `${event.date}T00:00:00`
  );

  const targetDate = new Date(
    `${target}T00:00:00`
  );

  if (targetDate < eventDate) {
    return false;
  }

  if (event.recurrence === "daily") {
    return true;
  }

  if (event.recurrence === "weekly") {
    return (
      eventDate.getDay() === targetDate.getDay()
    );
  }

  if (event.recurrence === "monthly") {
    return (
      eventDate.getDate() === targetDate.getDate()
    );
  }

  if (event.recurrence === "yearly") {
    return (
      eventDate.getMonth() ===
        targetDate.getMonth() &&
      eventDate.getDate() ===
        targetDate.getDate()
    );
  }

  return false;
}

function getEventsForDate(
  events: PlannerEvent[],
  date: Date
) {
  return events
    .filter((event) =>
      eventOccursOnDate(event, date)
    )
    .sort((a, b) =>
      (a.startTime || "99:99").localeCompare(
        b.startTime || "99:99"
      )
    );
}

export default function Planner() {
  const [currentMonth, setCurrentMonth] =
    useState(() => {
      const now = new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    });

  const [events, setEvents] = useState<
    PlannerEvent[]
  >([]);

  const [birthdayEvents, setBirthdayEvents] =
    useState<PlannerEvent[]>([]);

  const [selectedDate, setSelectedDate] =
    useState(getTodayKey());

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");

  const [date, setDate] =
    useState(getTodayKey());

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [recurrence, setRecurrence] =
    useState<PlannerEvent["recurrence"]>("none");

  const [notes, setNotes] = useState("");

  /* =========================
     LOAD MANUAL EVENTS
  ========================= */

  useEffect(() => {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setEvents(parsed);
      }
    } catch {
      setEvents([]);
    }
  }, []);

  /* =========================
     LOAD PEOPLE BIRTHDAYS
  ========================= */

  useEffect(() => {
    async function loadBirthdays() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "PLANNER: USER ERROR",
          userError
        );
        return;
      }

      const { data, error } = await supabase
        .from("people")
        .select("id, name, birth_date")
        .eq("user_id", user.id)
        .not("birth_date", "is", null);

      if (error) {
        console.error(
          "PLANNER: BIRTHDAY LOAD ERROR",
          error
        );
        return;
      }

      const people =
        (data ?? []) as PersonBirthday[];

      const generatedBirthdayEvents: PlannerEvent[] =
        people.map((person) => ({
          id: `birthday-${person.id}`,
          title: `­ƒÄé ${person.name}'s Birthday`,
          date: person.birth_date,
          recurrence: "yearly",
          notes: "Birthday from People archive.",
        }));

      setBirthdayEvents(
        generatedBirthdayEvents
      );
    }

    void loadBirthdays();
  }, []);

  /* =========================
     ALL EVENTS
  ========================= */

  const allEvents = useMemo(
    () => [...events, ...birthdayEvents],
    [events, birthdayEvents]
  );

  /* =========================
     SAVE MANUAL EVENTS
  ========================= */

  function saveEvents(
    nextEvents: PlannerEvent[]
  ) {
    setEvents(nextEvents);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextEvents)
    );

    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  /* =========================
     FORM
  ========================= */

  function resetForm() {
    setTitle("");
    setDate(selectedDate);
    setStartTime("");
    setEndTime("");
    setRecurrence("none");
    setNotes("");
    setEditingId(null);
  }

  function openAddForm(
    selectedDateValue?: string
  ) {
    resetForm();

    setDate(
      selectedDateValue || selectedDate
    );

    setShowForm(true);
  }

  function openEditForm(
    event: PlannerEvent
  ) {
    if (event.id.startsWith("birthday-")) {
      return;
    }

    setEditingId(event.id);
    setTitle(event.title);
    setDate(event.date);
    setStartTime(event.startTime ?? "");
    setEndTime(event.endTime ?? "");
    setRecurrence(event.recurrence);
    setNotes(event.notes);
    setShowForm(true);
  }

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    if (
      startTime &&
      endTime &&
      endTime < startTime
    ) {
      window.alert(
        "End time cannot be earlier than start time."
      );

      return;
    }

    const event: PlannerEvent = {
      id:
        editingId ||
        `${Date.now()}-${Math.random()}`,
      title: title.trim(),
      date,
      startTime:
        startTime || undefined,
      endTime:
        endTime || undefined,
      recurrence,
      notes: notes.trim(),
    };

    if (editingId) {
      saveEvents(
        events.map((item) =>
          item.id === editingId
            ? event
            : item
        )
      );
    } else {
      saveEvents([
        ...events,
        event,
      ]);
    }

    setSelectedDate(date);
    setShowForm(false);
    resetForm();
  }

  function deleteEvent(
    eventId: string
  ) {
    if (eventId.startsWith("birthday-")) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this event?"
      );

    if (!confirmed) {
      return;
    }

    saveEvents(
      events.filter(
        (event) =>
          event.id !== eventId
      )
    );
  }

  /* =========================
     NAVIGATION
  ========================= */

  function goToPreviousMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );
  }

  function goToNextMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );
  }

  function goToToday() {
    const today = new Date();

    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setSelectedDate(
      getTodayKey()
    );
  }

  /* =========================
     DERIVED DATA
  ========================= */

  const calendarDays = useMemo(
    () =>
      getCalendarDays(
        currentMonth
      ),
    [currentMonth]
  );

  const selectedDateObject =
    new Date(
      `${selectedDate}T00:00:00`
    );

  const selectedEvents =
    getEventsForDate(
      allEvents,
      selectedDateObject
    );

  const upcomingEvents =
    useMemo(() => {
      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const result: {
        event: PlannerEvent;
        date: Date;
      }[] = [];

      for (
        let i = 0;
        i < 90;
        i++
      ) {
        const currentDate =
          new Date(today);

        currentDate.setDate(
          today.getDate() + i
        );

        const dayEvents =
          getEventsForDate(
            allEvents,
            currentDate
          );

        dayEvents.forEach(
          (event) => {
            result.push({
              event,
              date: new Date(
                currentDate
              ),
            });
          }
        );
      }

      return result
        .sort((a, b) => {
          const dateCompare =
            a.date.getTime() -
            b.date.getTime();

          if (dateCompare !== 0) {
            return dateCompare;
          }

          return (
            a.event.startTime ||
            "99:99"
          ).localeCompare(
            b.event.startTime ||
              "99:99"
          );
        })
        .slice(0, 8);
    }, [allEvents]);

  return (
    <div>
      {/* HEADER */}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50">
            Planning
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            Planner
          </h2>

          <p className="mt-1 text-sm opacity-50">
            Schedule your time, events, and important dates.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            openAddForm()
          }
          className="rounded-xl bg-[#8f806d] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + Add event
        </button>
      </div>

      {/* CALENDAR */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={
                goToPreviousMonth
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f0e8] text-lg transition hover:bg-[#e6dccf]"
              aria-label="Previous month"
            >
              ÔÇ╣
            </button>

            <button
              type="button"
              onClick={
                goToNextMonth
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f0e8] text-lg transition hover:bg-[#e6dccf]"
              aria-label="Next month"
            >
              ÔÇ║
            </button>

            <h3 className="ml-2 text-xl font-bold">
              {formatMonth(
                currentMonth
              )}
            </h3>
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="rounded-xl border border-[#cfc3b4] bg-[#f5f0e8] px-4 py-2 text-sm font-medium transition hover:bg-[#e6e0d7]"
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-[#d8cec0]">
          {WEEKDAYS.map(
            (day) => (
              <div
                key={day}
                className="px-2 pb-3 text-center text-xs font-semibold uppercase tracking-wider opacity-40"
              >
                {day}
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map(
            (day) => {
              const dateKey =
                getDateKey(day);

              const isCurrentMonth =
                day.getMonth() ===
                currentMonth.getMonth();

              const isToday =
                dateKey ===
                getTodayKey();

              const isSelected =
                dateKey ===
                selectedDate;

              const dayEvents =
                getEventsForDate(
                  allEvents,
                  day
                );

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDate(
                      dateKey
                    );
                  }}
                  className={`min-h-[105px] border-b border-r border-[#ddd4c7] p-2 text-left transition ${
                    isCurrentMonth
                      ? "bg-white/20"
                      : "bg-[#eee8df]/40"
                  } ${
                    isSelected
                      ? "bg-[#e1d6c8]"
                      : "hover:bg-[#eee6dc]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                        isToday
                          ? "bg-[#8f806d] font-bold text-white"
                          : isCurrentMonth
                          ? "font-medium"
                          : "opacity-30"
                      }`}
                    >
                      {day.getDate()}
                    </span>

                    {dayEvents.length >
                      0 && (
                      <span className="text-[10px] opacity-40">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents
                      .slice(0, 2)
                      .map(
                        (event) => (
                          <div
                            key={
                              event.id
                            }
                            className="truncate rounded-md bg-[#d8cec0] px-2 py-1 text-[11px] font-medium"
                          >
                            {event.startTime &&
                              `${event.startTime} `}
                            {event.title}
                          </div>
                        )
                      )}

                    {dayEvents.length >
                      2 && (
                      <div className="px-1 text-[10px] opacity-50">
                        +
                        {dayEvents.length -
                          2}{" "}
                        more
                      </div>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* SELECTED DAY + UPCOMING */}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* SELECTED DAY */}

        <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-50">
                Selected day
              </p>

              <h3 className="mt-1 text-xl font-bold">
                {selectedDateObject.toLocaleDateString(
                  "en-US",
                  {
                    weekday:
                      "long",
                    month:
                      "long",
                    day: "numeric",
                    year:
                      "numeric",
                  }
                )}
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                openAddForm(
                  selectedDate
                )
              }
              className="rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm font-medium transition hover:bg-[#e9dfd2]"
            >
              + Add
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {selectedEvents.length ===
            0 ? (
              <div className="rounded-2xl bg-[#f5f0e8] p-5 text-center">
                <p className="text-sm opacity-50">
                  No events for this day.
                </p>
              </div>
            ) : (
              selectedEvents.map(
                (event) => {
                  const isBirthday =
                    event.id.startsWith(
                      "birthday-"
                    );

                  return (
                    <div
                      key={event.id}
                      className="rounded-2xl bg-[#f5f0e8] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {event.title}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs opacity-50">
                            <span>
                              {formatEventTime(
                                event
                              )}
                            </span>

                            <span>ÔÇó</span>

                            <span>
                              {getRecurrenceLabel(
                                event.recurrence
                              )}
                            </span>
                          </div>

                          {event.notes && (
                            <p className="mt-3 whitespace-pre-wrap text-sm opacity-60">
                              {event.notes}
                            </p>
                          )}

                          {isBirthday && (
                            <p className="mt-3 text-xs text-[#8b6f5a]">
                              From People archive
                            </p>
                          )}
                        </div>

                        {!isBirthday && (
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  event
                                )
                              }
                              className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium transition hover:bg-[#cfc3b4]"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteEvent(
                                  event.id
                                )
                              }
                              className="rounded-lg bg-[#e6d5d0] px-3 py-2 text-xs font-medium text-[#694d46] transition hover:bg-[#dcc6c0]"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* UPCOMING */}

        <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Next
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Upcoming
            </h3>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingEvents.length ===
            0 ? (
              <div className="rounded-2xl bg-[#f5f0e8] p-5 text-center">
                <p className="text-sm opacity-50">
                  No upcoming events.
                </p>
              </div>
            ) : (
              upcomingEvents.map(
                ({ event, date }) => (
                  <button
                    key={`${event.id}-${getDateKey(
                      date
                    )}`}
                    type="button"
                    onClick={() => {
                      setSelectedDate(
                        getDateKey(
                          date
                        )
                      );

                      setCurrentMonth(
                        new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          1
                        )
                      );
                    }}
                    className="w-full rounded-2xl bg-[#f5f0e8] p-4 text-left transition hover:bg-[#e9dfd2]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wider opacity-40">
                          {date.toLocaleDateString(
                            "en-US",
                            {
                              weekday:
                                "short",
                              month:
                                "short",
                              day: "numeric",
                            }
                          )}
                        </p>

                        <p className="mt-1 truncate font-semibold">
                          {event.title}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs opacity-50">
                        {event.startTime ||
                          "All day"}
                      </span>
                    </div>
                  </button>
                )
              )
            )}
          </div>
        </section>
      </div>

      {/* ADD / EDIT FORM */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#f5f0e8] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-50">
                  Planner
                </p>

                <h3 className="mt-1 text-2xl font-bold">
                  {editingId
                    ? "Edit event"
                    : "New event"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4d9cb] text-lg opacity-60 hover:opacity-100"
              >
                ├ù
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="text-sm font-semibold">
                  Event
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Thesis meeting"
                  className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">
                    Start{" "}
                    <span className="font-normal opacity-50">
                      (optional)
                    </span>
                  </label>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) =>
                      setStartTime(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    End{" "}
                    <span className="font-normal opacity-50">
                      (optional)
                    </span>
                  </label>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) =>
                      setEndTime(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Repeat
                </label>

                <select
                  value={recurrence}
                  onChange={(e) =>
                    setRecurrence(
                      e.target
                        .value as PlannerEvent["recurrence"]
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
                >
                  <option value="none">
                    One-time
                  </option>

                  <option value="daily">
                    Daily
                  </option>

                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>

                  <option value="yearly">
                    Yearly
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  placeholder="Optional notes..."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-[#cfc3b4] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#d8cec0] pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-[#cfc3b4] bg-white/50 px-4 py-2.5 text-sm font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {editingId
                    ? "Save changes"
                    : "Add event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
