"use client";

import { useEffect, useMemo, useState } from "react";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  icon: string;
  page: string;
};

function stripHtml(html: string) {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ");
  }

  const temp = document.createElement("div");
  temp.innerHTML = html;

  return temp.textContent || temp.innerText || "";
}

function getStoredData(key: string) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function GlobalSearch({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    function handleUpdate() {
      setRefreshKey((value) => value + 1);
    }

    window.addEventListener("life-game-updated", handleUpdate);

    return () => {
      window.removeEventListener("life-game-updated", handleUpdate);
    };
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const searchQuery = query.trim().toLowerCase();

    if (!searchQuery) return [];

    const allResults: SearchResult[] = [];

    const habits = getStoredData("life-game-habits");
    habits.forEach((habit: any) => {
      const text = `${habit.name || ""} ${habit.stat || ""}`.toLowerCase();
      if (!text.includes(searchQuery)) return;

      allResults.push({
        id: `habit-${habit.id}`,
        title: habit.name || "Untitled Habit",
        subtitle: `Habit · +${habit.xp || 0} XP · ${habit.stat || ""}`,
        type: "Habits",
        icon: "📦",
        page: "Habits",
      });
    });

    const notes = getStoredData("life-game-notes");
    notes.forEach((note: any) => {
      const content = stripHtml(note.content || "");
      const text = `${note.title || ""} ${content}`.toLowerCase();
      if (!text.includes(searchQuery)) return;

      allResults.push({
        id: `note-${note.id}`,
        title: note.title || "Untitled Note",
        subtitle: `Note · ${content.slice(0, 90)}`,
        type: "Notes",
        icon: "🗒️",
        page: "Notes",
      });
    });

    const projects = getStoredData("life-game-projects");
    projects.forEach((project: any) => {
      const text = `${project.title || ""} ${project.description || ""} ${project.status || ""}`.toLowerCase();
      if (!text.includes(searchQuery)) return;

      allResults.push({
        id: `project-${project.id}`,
        title: project.title || "Untitled Project",
        subtitle: `Project · ${project.status || "Planning"}`,
        type: "Projects",
        icon: "🛠️",
        page: "Projects",
      });
    });

    const journal = getStoredData("life-game-journal");
    journal.forEach((entry: any) => {
      const content = stripHtml(entry.content || "");
      const text = `${entry.title || ""} ${content}`.toLowerCase();
      if (!text.includes(searchQuery)) return;

      allResults.push({
        id: `journal-${entry.id}`,
        title: entry.title || "Untitled Journal",
        subtitle: `Journal · ${content.slice(0, 90)}`,
        type: "Journal",
        icon: "📝",
        page: "Journal",
      });
    });

    const events = getStoredData("life-game-planner-events");
    events.forEach((event: any) => {
      const text = `${event.title || ""} ${event.date || ""} ${event.notes || ""} ${event.startTime || ""} ${event.endTime || ""}`.toLowerCase();
      if (!text.includes(searchQuery)) return;

      allResults.push({
        id: `event-${event.id}`,
        title: event.title || "Untitled Event",
        subtitle: `Calendar · ${event.date || ""}${event.startTime ? ` · ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}` : ""}`,
        type: "Planner",
        icon: "📅",
        page: "Planner",
      });
    });

    const records = getStoredData("life-game-history");
    records.forEach((record: any) => {
      const text = `${record.activity || ""} ${record.stat || ""} ${record.date || ""}`.toLowerCase();
      if (!text.includes(searchQuery)) return;

      allResults.push({
        id: `record-${record.id}`,
        title: record.activity || "Activity Record",
        subtitle: `Record · +${record.xp || 0} XP · ${record.stat || ""}`,
        type: "Records",
        icon: "📊",
        page: "Records",
      });
    });

    // LEARNING
    const learning = getStoredData("life-game-learning");
    learning.forEach((note: any) => {
      const text = [
        note.title || "",
        note.summary || "",
        note.folder || "",
        ...(Array.isArray(note.tags) ? note.tags : []),
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(searchQuery)) return;

      allResults.push({
        id: `learning-${note.id}`,
        title: note.title || "Untitled Learning",
        subtitle: `Learning · ${note.folder || "General"}${Array.isArray(note.tags) && note.tags.length ? ` · #${note.tags[0]}` : ""}`,
        type: "Learning",
        icon: "📚",
        page: "Learning",
      });
    });

    const financeKeys = [
      "life-game-transactions",
      "life-game-accounts",
      "life-game-categories",
      "life-game-budgets",
      "life-game-recurring",
      "life-game-goals",
    ];

    financeKeys.forEach((key) => {
      const items = getStoredData(key);

      items.forEach((item: any) => {
        const text = JSON.stringify(item).toLowerCase();
        if (!text.includes(searchQuery)) return;

        const title =
          item.name ||
          item.title ||
          item.description ||
          item.note ||
          item.category ||
          "Finance Item";

        allResults.push({
          id: `finance-${key}-${item.id || title}`,
          title,
          subtitle: `Finance · ${key.replace("life-game-", "").replace("-", " ")}`,
          type: "Finance",
          icon: "💰",
          page: "Finance",
        });
      });
    });

    return allResults.slice(0, 30);
  }, [query, refreshKey]);

  function handleNavigate(page: string) {
    onNavigate(page);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50">
          🔎
        </span>

        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search everything..."
          className="w-full rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] py-3 pl-11 pr-4 text-sm text-[#3f382f] outline-none placeholder:text-[#8c8276] focus:border-[#8f806d]"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[420px] overflow-y-auto rounded-2xl border border-[#d7ccbd] bg-[#f8f3eb] p-2 shadow-xl">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl">🔎</p>
              <p className="mt-2 text-sm font-semibold text-[#3f382f]">
                Nothing found
              </p>
              <p className="mt-1 text-xs text-[#766c60]">
                Try another keyword.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleNavigate(result.page)}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[#e9dfd2]"
                >
                  <span className="mt-0.5 text-lg">{result.icon}</span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#3f382f]">
                      {result.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#82776a]">
                      {result.subtitle}
                    </span>
                  </span>

                  <span className="shrink-0 rounded-lg bg-[#ddd4c7] px-2 py-1 text-[10px] font-medium text-[#665c51]">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
