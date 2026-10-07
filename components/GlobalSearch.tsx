"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  icon: string;
  page: string;
};

type PersonSearchItem = {
  id: string;
  name: string;
  birth_date: string | null;
  mbti: string | null;
  characteristics: string | null;
  tags: string | null;
  shio: string | null;
  blood_type: string | null;
  address: string | null;
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

function getZodiac(birthDate: string | null) {
  if (!birthDate) return null;

  const [, monthString, dayString] =
    birthDate.split("-");

  const month = Number(monthString);
  const day = Number(dayString);

  if (
    (month === 3 && day >= 21) ||
    (month === 4 && day <= 19)
  ) {
    return "Aries";
  }

  if (
    (month === 4 && day >= 20) ||
    (month === 5 && day <= 20)
  ) {
    return "Taurus";
  }

  if (
    (month === 5 && day >= 21) ||
    (month === 6 && day <= 20)
  ) {
    return "Gemini";
  }

  if (
    (month === 6 && day >= 21) ||
    (month === 7 && day <= 22)
  ) {
    return "Cancer";
  }

  if (
    (month === 7 && day >= 23) ||
    (month === 8 && day <= 22)
  ) {
    return "Leo";
  }

  if (
    (month === 8 && day >= 23) ||
    (month === 9 && day <= 22)
  ) {
    return "Virgo";
  }

  if (
    (month === 9 && day >= 23) ||
    (month === 10 && day <= 22)
  ) {
    return "Libra";
  }

  if (
    (month === 10 && day >= 23) ||
    (month === 11 && day <= 21)
  ) {
    return "Scorpio";
  }

  if (
    (month === 11 && day >= 22) ||
    (month === 12 && day <= 21)
  ) {
    return "Sagittarius";
  }

  if (
    (month === 12 && day >= 22) ||
    (month === 1 && day <= 19)
  ) {
    return "Capricorn";
  }

  if (
    (month === 1 && day >= 20) ||
    (month === 2 && day <= 18)
  ) {
    return "Aquarius";
  }

  if (
    (month === 2 && day >= 19) ||
    (month === 3 && day <= 20)
  ) {
    return "Pisces";
  }

  return null;
}

function getZodiacSymbol(
  zodiac: string | null
) {
  const symbols: Record<string, string> = {
    Aries: "♈",
    Taurus: "♉",
    Gemini: "♊",
    Cancer: "♋",
    Leo: "♌",
    Virgo: "♍",
    Libra: "♎",
    Scorpio: "♏",
    Sagittarius: "♐",
    Capricorn: "♑",
    Aquarius: "♒",
    Pisces: "♓",
  };

  return zodiac
    ? symbols[zodiac] ?? ""
    : "";
}

function getShioFromBirthDate(
  birthDate: string | null
) {
  if (!birthDate) return "";

  const year = Number(
    birthDate.split("-")[0]
  );

  if (!year) return "";

  const animals = [
    "Rat",
    "Ox",
    "Tiger",
    "Rabbit",
    "Dragon",
    "Snake",
    "Horse",
    "Goat",
    "Monkey",
    "Rooster",
    "Dog",
    "Pig",
  ];

  return (
    animals[(year - 4) % 12] ?? ""
  );
}

function getShioSymbol(
  shio: string | null
) {
  const symbols: Record<string, string> = {
    Rat: "🐀",
    Ox: "🐂",
    Tiger: "🐅",
    Rabbit: "🐇",
    Dragon: "🐉",
    Snake: "🐍",
    Horse: "🐎",
    Goat: "🐐",
    Monkey: "🐒",
    Rooster: "🐓",
    Dog: "🐕",
    Pig: "🐖",
  };

  return shio
    ? symbols[shio] ?? ""
    : "";
}

function getLifePathNumber(
  birthDate: string | null
) {
  if (!birthDate) return null;

  const digits = birthDate
    .replace(/\D/g, "")
    .split("")
    .map(Number);

  if (digits.length !== 8) {
    return null;
  }

  let total = digits.reduce(
    (sum, digit) => sum + digit,
    0
  );

  while (
    total > 9 &&
    total !== 11 &&
    total !== 22 &&
    total !== 33
  ) {
    total = String(total)
      .split("")
      .reduce(
        (sum, digit) =>
          sum + Number(digit),
        0
      );
  }

  return total;
}

function parseTags(
  value: string | null
) {
  if (!value) return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function GlobalSearch({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [query, setQuery] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [people, setPeople] =
    useState<PersonSearchItem[]>([]);

  const [peopleLoading, setPeopleLoading] =
    useState(false);

  /*
   * Refresh global search when other
   * parts of Life Game announce updates.
   */
  useEffect(() => {
    function handleUpdate() {
      setRefreshKey(
        (value) => value + 1
      );
    }

    window.addEventListener(
      "life-game-updated",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "life-game-updated",
        handleUpdate
      );
    };
  }, []);

  /*
   * PEOPLE SEARCH
   *
   * People are stored in Supabase,
   * not localStorage.
   *
   * We load the current user's people
   * and then search locally so we can
   * also search calculated values such
   * as Zodiac, Shio and Life Path.
   */
  useEffect(() => {
    const searchQuery =
      query.trim().toLowerCase();

    if (!searchQuery) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(
      async () => {
        setPeopleLoading(true);

        try {
          const supabase =
            createClient();

          const {
            data: {
              user,
            },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            if (!cancelled) {
              setPeople([]);
            }

            return;
          }

          const {
            data,
            error,
          } = await supabase
            .from("people")
            .select(
              "id, name, birth_date, mbti, characteristics, tags, shio, blood_type, address"
            )
            .eq(
              "user_id",
              user.id
            );

          if (error) {
            console.error(
              "GLOBAL SEARCH PEOPLE ERROR",
              error
            );

            if (!cancelled) {
              setPeople([]);
            }

            return;
          }

          if (cancelled) return;

          setPeople(
            (data ?? []).filter(
              (person) => {
                const calculatedShio =
                  person.shio ||
                  getShioFromBirthDate(
                    person.birth_date
                  );

                const zodiac =
                  getZodiac(
                    person.birth_date
                  );

                const lifePath =
                  getLifePathNumber(
                    person.birth_date
                  );

                const searchableText = [
                  person.name,
                  person.birth_date,
                  person.mbti,
                  person.characteristics,
                  person.tags,
                  person.shio,
                  calculatedShio,
                  person.blood_type,
                  person.address,
                  zodiac,
                  lifePath !== null
                    ? String(
                        lifePath
                      )
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

                return searchableText.includes(
                  searchQuery
                );
              }
            )
          );
        } finally {
          if (!cancelled) {
            setPeopleLoading(false);
          }
        }
      },
      150
    );

    return () => {
      cancelled = true;
      window.clearTimeout(
        timeout
      );
    };
  }, [query, refreshKey]);

  const results = useMemo<
    SearchResult[]
  >(() => {
    const searchQuery =
      query.trim().toLowerCase();

    if (!searchQuery) {
      return [];
    }

    const allResults: SearchResult[] =
      [];

    /*
     * ============================
     * PEOPLE
     * ============================
     */

    people.forEach(
      (person) => {
        const zodiac =
          getZodiac(
            person.birth_date
          );

        const calculatedShio =
          person.shio ||
          getShioFromBirthDate(
            person.birth_date
          );

        const lifePath =
          getLifePathNumber(
            person.birth_date
          );

        const tags =
          parseTags(
            person.tags
          );

        const subtitleParts = [
          "People",
          person.mbti,
          zodiac
            ? `${getZodiacSymbol(
                zodiac
              )} ${zodiac}`
            : "",
          calculatedShio
            ? `${getShioSymbol(
                calculatedShio
              )} ${calculatedShio}`
            : "",
          person.blood_type
            ? `🩸 ${person.blood_type}`
            : "",
          lifePath !== null
            ? `🔢 ${lifePath}`
            : "",
          tags.length > 0
            ? `#${tags[0]}`
            : "",
        ].filter(Boolean);

        allResults.push({
          id: `person-${person.id}`,
          title: person.name,
          subtitle:
            subtitleParts.join(
              " · "
            ),
          type: "People",
          icon: "👤",
          page: "People",
        });
      }
    );

    /*
     * ============================
     * HABITS
     * ============================
     */

    const habits =
      getStoredData(
        "life-game-habits"
      );

    habits.forEach(
      (habit: any) => {
        const text =
          `${habit.name || ""} ${habit.stat || ""}`.toLowerCase();

        if (
          !text.includes(
            searchQuery
          )
        ) {
          return;
        }

        allResults.push({
          id: `habit-${habit.id}`,
          title:
            habit.name ||
            "Untitled Habit",
          subtitle: `Habit · +${
            habit.xp || 0
          } XP · ${
            habit.stat || ""
          }`,
          type: "Habits",
          icon: "📦",
          page: "Habits",
        });
      }
    );

    /*
     * ============================
     * NOTES
     * ============================
     */

    const notes =
      getStoredData(
        "life-game-notes"
      );

    notes.forEach(
      (note: any) => {
        const content =
          stripHtml(
            note.content || ""
          );

        const text =
          `${note.title || ""} ${content}`.toLowerCase();

        if (
          !text.includes(
            searchQuery
          )
        ) {
          return;
        }

        allResults.push({
          id: `note-${note.id}`,
          title:
            note.title ||
            "Untitled Note",
          subtitle: `Note · ${content.slice(
            0,
            90
          )}`,
          type: "Notes",
          icon: "🗒️",
          page: "Notes",
        });
      }
    );

    /*
     * ============================
     * PROJECTS
     * ============================
     */

    const projects =
      getStoredData(
        "life-game-projects"
      );

    projects.forEach(
      (project: any) => {
        const text =
          `${project.title || ""} ${project.description || ""} ${project.status || ""}`.toLowerCase();

        if (
          !text.includes(
            searchQuery
          )
        ) {
          return;
        }

        allResults.push({
          id: `project-${project.id}`,
          title:
            project.title ||
            "Untitled Project",
          subtitle: `Project · ${
            project.status ||
            "Planning"
          }`,
          type: "Projects",
          icon: "🛠️",
          page: "Projects",
        });
      }
    );

    /*
     * ============================
     * JOURNAL
     * ============================
     */

    const journal =
      getStoredData(
        "life-game-journal"
      );

    journal.forEach(
      (entry: any) => {
        const content =
          stripHtml(
            entry.content || ""
          );

        const text =
          `${entry.title || ""} ${content}`.toLowerCase();

        if (
          !text.includes(
            searchQuery
          )
        ) {
          return;
        }

        allResults.push({
          id: `journal-${entry.id}`,
          title:
            entry.title ||
            "Untitled Journal",
          subtitle: `Journal · ${content.slice(
            0,
            90
          )}`,
          type: "Journal",
          icon: "📝",
          page: "Journal",
        });
      }
    );

    /*
     * ============================
     * PLANNER
     * ============================
     */

    const events =
      getStoredData(
        "life-game-planner-events"
      );

    events.forEach(
      (event: any) => {
        const text =
          `${event.title || ""} ${event.date || ""} ${event.notes || ""} ${event.startTime || ""} ${event.endTime || ""}`.toLowerCase();

        if (
          !text.includes(
            searchQuery
          )
        ) {
          return;
        }

        allResults.push({
          id: `event-${event.id}`,
          title:
            event.title ||
            "Untitled Event",
          subtitle: `Calendar · ${
            event.date || ""
          }${
            event.startTime
              ? ` · ${
                  event.startTime
                }${
                  event.endTime
                    ? `–${event.endTime}`
                    : ""
                }`
              : ""
          }`,
          type: "Planner",
          icon: "📅",
          page: "Planner",
        });
      }
    );

    /*
     * ============================
     * RECORDS
     * ============================
     */

    const records =
      getStoredData(
        "life-game-history"
      );

    records.forEach(
      (record: any) => {
        const text =
          `${record.activity || ""} ${record.stat || ""} ${record.date || ""}`.toLowerCase();

        if (
          !text.includes(
            searchQuery
          )
        ) {
          return;
        }

        allResults.push({
          id: `record-${record.id}`,
          title:
            record.activity ||
            "Activity Record",
          subtitle: `Record · +${
            record.xp || 0
          } XP · ${
            record.stat || ""
          }`,
          type: "Records",
          icon: "📊",
          page: "Records",
        });
      }
    );

    /*
     * ============================
     * LEARNING
     * ============================
     */

    const learning =
      getStoredData(
        "life-game-learning"
      );

    learning.forEach(
      (note: any) => {
        const text = [
          note.title || "",
          note.summary || "",
          note.folder || "",
          ...(Array.isArray(
            note.tags
          )
            ? note.tags
            : []),
        ]
          .join(" ")
          .toLowerCase();

        if (
          !text.includes(
            searchQuery
          )
        ) {
          return;
        }

        allResults.push({
          id: `learning-${note.id}`,
          title:
            note.title ||
            "Untitled Learning",
          subtitle: `Learning · ${
            note.folder ||
            "General"
          }${
            Array.isArray(
              note.tags
            ) &&
            note.tags.length
              ? ` · #${note.tags[0]}`
              : ""
          }`,
          type: "Learning",
          icon: "📚",
          page: "Learning",
        });
      }
    );

    /*
     * ============================
     * FINANCE
     * ============================
     */

    const financeKeys = [
      "life-game-transactions",
      "life-game-accounts",
      "life-game-categories",
      "life-game-budgets",
      "life-game-recurring",
      "life-game-goals",
    ];

    financeKeys.forEach(
      (key) => {
        const items =
          getStoredData(key);

        items.forEach(
          (item: any) => {
            const text =
              JSON.stringify(
                item
              ).toLowerCase();

            if (
              !text.includes(
                searchQuery
              )
            ) {
              return;
            }

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
              subtitle: `Finance · ${key
                .replace(
                  "life-game-",
                  ""
                )
                .replace(
                  "-",
                  " "
                )}`,
              type: "Finance",
              icon: "💰",
              page: "Finance",
            });
          }
        );
      }
    );

    return allResults.slice(
      0,
      30
    );
  }, [
    query,
    people,
    refreshKey,
  ]);

  function handleNavigate(
    page: string
  ) {
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
            setQuery(
              event.target.value
            );
            setOpen(true);
          }}
          onFocus={() =>
            setOpen(true)
          }
          placeholder="Search everything..."
          className="w-full rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] py-3 pl-11 pr-4 text-sm text-[#3f382f] outline-none placeholder:text-[#8c8276] focus:border-[#8f806d]"
        />
      </div>

      {open &&
        query.trim() && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[420px] overflow-y-auto rounded-2xl border border-[#d7ccbd] bg-[#f8f3eb] p-2 shadow-xl">
            {results.length ===
              0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl">
                  {peopleLoading
                    ? "⏳"
                    : "🔎"}
                </p>

                <p className="mt-2 text-sm font-semibold text-[#3f382f]">
                  {peopleLoading
                    ? "Searching..."
                    : "Nothing found"}
                </p>

                <p className="mt-1 text-xs text-[#766c60]">
                  {peopleLoading
                    ? "Looking through your People archive..."
                    : "Try another keyword."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map(
                  (result) => (
                    <button
                      key={
                        result.id
                      }
                      type="button"
                      onClick={() =>
                        handleNavigate(
                          result.page
                        )
                      }
                      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[#e9dfd2]"
                    >
                      <span className="mt-0.5 text-lg">
                        {
                          result.icon
                        }
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#3f382f]">
                          {
                            result.title
                          }
                        </span>

                        <span className="mt-1 block truncate text-xs text-[#82776a]">
                          {
                            result.subtitle
                          }
                        </span>
                      </span>

                      <span className="shrink-0 rounded-lg bg-[#ddd4c7] px-2 py-1 text-[10px] font-medium text-[#665c51]">
                        {
                          result.type
                        }
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}