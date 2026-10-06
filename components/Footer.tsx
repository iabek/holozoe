"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Version = {
  id: string;
  version: string;
  name: string;
  date: string;
  time: string;
  items: string[];
};

type VersionRow = {
  id: string;
  version: string;
  name: string;
  date: string | null;
  time: string | null;
  items: string[] | null;
};

const supabase = createClient();

const VERSION_UPDATED_EVENT = "life-game-version-updated";

const fallbackVersions: Version[] = [
  {
    id: "fallback-v0.4",
    version: "v0.4",
    name: "Knowledge & Finance",
    date: "2026-10-06",
    time: "00:00",
    items: [
      "Finance account filter",
      "Learning",
      "Knowledge Graph",
      "Global Search",
      "Planner & Calendar",
    ],
  },
  {
    id: "fallback-v0.3",
    version: "v0.3",
    name: "Personal Era",
    date: "2026-10-03",
    time: "00:00",
    items: [
      "Journal",
      "Notes",
      "Finance",
      "Projects",
      "Footer & Version History",
    ],
  },
  {
    id: "fallback-v0.2",
    version: "v0.2",
    name: "Life System",
    date: "2026-10-02",
    time: "00:00",
    items: [
      "Dashboard",
      "Today",
      "Habits",
      "Prayer",
      "Gold",
      "Leisure",
      "Records",
      "XP & Level",
    ],
  },
  {
    id: "fallback-v0.1",
    version: "v0.1",
    name: "The Beginning",
    date: "2026-10-01",
    time: "00:00",
    items: [
      "Basic stats",
      "Today activity input",
      "XP & Level foundation",
      "Activity history",
    ],
  },
];

/* =========================================================
   VERSION HELPERS
========================================================= */

function getVersionNumber(version: string) {
  const cleaned = version
    .trim()
    .toLowerCase()
    .replace(/^v/, "");

  const parts = cleaned.split(".");

  const major = Number(parts[0]) || 0;
  const minor = Number(parts[1]) || 0;

  return major * 1000 + minor;
}

function sortVersions(versions: Version[]) {
  return [...versions].sort(
    (a, b) =>
      getVersionNumber(b.version) -
      getVersionNumber(a.version)
  );
}

function getLatestVersion(versions: Version[]) {
  const sorted = sortVersions(versions);

  return sorted.length > 0
    ? sorted[0]
    : null;
}

/* =========================================================
   DATE HELPERS
========================================================= */

function normalizeDateForInput(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  const simpleDateMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (simpleDateMatch) {
    return value;
  }

  const timestampMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (timestampMatch) {
    return `${timestampMatch[1]}-${timestampMatch[2]}-${timestampMatch[3]}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getFullYear();

  const month = String(
    parsed.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    parsed.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(
  value: string | null | undefined
) {
  const normalized =
    normalizeDateForInput(value);

  if (!normalized) {
    return "";
  }

  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return value || "";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (Number.isNaN(date.getTime())) {
    return value || "";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function createEmptyVersion(): Version {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const hours = String(
    now.getHours()
  ).padStart(2, "0");

  const minutes = String(
    now.getMinutes()
  ).padStart(2, "0");

  return {
    id: "",
    version: "",
    name: "",
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
    items: [""],
  };
}

/* =========================================================
   SUPABASE MAPPING
========================================================= */

function rowToVersion(
  row: VersionRow
): Version {
  return {
    id: row.id,
    version: row.version || "",
    name: row.name || "",
    date: normalizeDateForInput(row.date),
    time: row.time || "00:00",
    items: Array.isArray(row.items)
      ? row.items
      : [],
  };
}

function versionToPayload(
  version: Version
) {
  return {
    version: version.version.trim(),
    name: version.name.trim(),
    date: version.date,
    time: version.time || "00:00",
    items: version.items
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

/* =========================================================
   FOOTER
========================================================= */

export default function Footer() {
  const [modal, setModal] = useState<
    "about" | "history" | null
  >(null);

  const [versions, setVersions] =
    useState<Version[]>([]);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [
    editingVersion,
    setEditingVersion,
  ] = useState<Version | null>(null);

  const [
    savingVersion,
    setSavingVersion,
  ] = useState(false);

  const [
    deletingVersionId,
    setDeletingVersionId,
  ] = useState<string | null>(null);

  /* =======================================================
     LOAD VERSION HISTORY
  ======================================================= */

  async function loadVersions() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setVersions(
          sortVersions(fallbackVersions)
        );

        setIsAdmin(false);

        return;
      }

      /* ---------------------------------------------------
         CHECK ADMIN
      --------------------------------------------------- */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Gagal membaca status admin:",
          profileError
        );

        setIsAdmin(false);
      } else {
        setIsAdmin(
          profile?.is_admin === true
        );
      }

      /* ---------------------------------------------------
         LOAD VERSION HISTORY

         HANYA kolom:
         id
         version
         name
         date
         time
         items
      --------------------------------------------------- */

      const {
        data,
        error,
      } = await supabase
        .from("version_history")
        .select(
          "id, version, name, date, time, items"
        );

      if (error) {
        console.error(
          "Gagal mengambil Version History:",
          error
        );

        setVersions(
          sortVersions(fallbackVersions)
        );

        return;
      }

      if (!data || data.length === 0) {
        setVersions([]);

        return;
      }

      const loadedVersions =
        (data as VersionRow[]).map(
          rowToVersion
        );

      setVersions(
        sortVersions(loadedVersions)
      );
    } catch (error) {
      console.error(
        "Error load Version History:",
        error
      );

      setVersions(
        sortVersions(fallbackVersions)
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadVersions();
  }, []);

  /* =======================================================
     LISTEN VERSION UPDATE
  ======================================================= */

  useEffect(() => {
    function handleVersionUpdated() {
      loadVersions();
    }

    window.addEventListener(
      VERSION_UPDATED_EVENT,
      handleVersionUpdated
    );

    return () => {
      window.removeEventListener(
        VERSION_UPDATED_EVENT,
        handleVersionUpdated
      );
    };
  }, []);

  /* =======================================================
     SORTED VERSION
  ======================================================= */

  const sortedVersions = useMemo(
    () => sortVersions(versions),
    [versions]
  );

  const latestVersion =
    getLatestVersion(sortedVersions);

  /* =======================================================
     ADD
  ======================================================= */

  function openAddVersion() {
    if (!isAdmin) {
      return;
    }

    setEditingVersion(
      createEmptyVersion()
    );
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function openEditVersion(
    version: Version
  ) {
    if (!isAdmin) {
      return;
    }

    setEditingVersion({
      ...version,
      date: normalizeDateForInput(
        version.date
      ),
      items: [...version.items],
    });
  }

  /* =======================================================
     CLOSE EDITOR
  ======================================================= */

  function closeEditor() {
    if (savingVersion) {
      return;
    }

    setEditingVersion(null);
  }

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  function updateEditingVersion(
    field:
      | "version"
      | "name"
      | "date"
      | "time",
    value: string
  ) {
    if (!editingVersion) {
      return;
    }

    setEditingVersion({
      ...editingVersion,
      [field]: value,
    });
  }

  /* =======================================================
     UPDATE ITEM
  ======================================================= */

  function updateItem(
    index: number,
    value: string
  ) {
    if (!editingVersion) {
      return;
    }

    const items = [
      ...editingVersion.items,
    ];

    items[index] = value;

    setEditingVersion({
      ...editingVersion,
      items,
    });
  }

  /* =======================================================
     ADD ITEM
  ======================================================= */

  function addItem() {
    if (!editingVersion) {
      return;
    }

    setEditingVersion({
      ...editingVersion,
      items: [
        ...editingVersion.items,
        "",
      ],
    });
  }

  /* =======================================================
     REMOVE ITEM
  ======================================================= */

  function removeItem(index: number) {
    if (!editingVersion) {
      return;
    }

    const items =
      editingVersion.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

    setEditingVersion({
      ...editingVersion,
      items:
        items.length > 0
          ? items
          : [""],
    });
  }

  /* =======================================================
     SAVE VERSION
  ======================================================= */

  async function saveEditingVersion() {
    if (
      !editingVersion ||
      !isAdmin
    ) {
      return;
    }

    const cleanVersion =
      editingVersion.version.trim();

    const cleanName =
      editingVersion.name.trim();

    const cleanDate =
      normalizeDateForInput(
        editingVersion.date
      );

    const cleanTime =
      editingVersion.time;

    if (!cleanVersion) {
      alert(
        "Version belum diisi."
      );

      return;
    }

    if (!cleanName) {
      alert(
        "Nama version belum diisi."
      );

      return;
    }

    if (!cleanDate) {
      alert(
        "Tanggal belum diisi."
      );

      return;
    }

    if (!cleanTime) {
      alert(
        "Waktu belum diisi."
      );

      return;
    }

    const duplicate =
      versions.some(
        (version) =>
          version.id !==
            editingVersion.id &&
          version.version
            .trim()
            .toLowerCase() ===
            cleanVersion.toLowerCase()
      );

    if (duplicate) {
      alert(
        "Version tersebut sudah ada."
      );

      return;
    }

    const cleanedVersion: Version = {
      ...editingVersion,
      version: cleanVersion,
      name: cleanName,
      date: cleanDate,
      time: cleanTime,
      items:
        editingVersion.items
          .map((item) =>
            item.trim()
          )
          .filter(Boolean),
    };

    setSavingVersion(true);

    try {
      let error: Error | null = null;

      /* ID kosong = ADD */

      if (!cleanedVersion.id) {
        const result =
          await supabase
            .from("version_history")
            .insert(
              versionToPayload(
                cleanedVersion
              )
            );

        error = result.error;
      }

      /* ID ada = EDIT */

      else {
        const result =
          await supabase
            .from("version_history")
            .update(
              versionToPayload(
                cleanedVersion
              )
            )
            .eq(
              "id",
              cleanedVersion.id
            );

        error = result.error;
      }

      if (error) {
        console.error(
          "Gagal menyimpan Version History:",
          error
        );

        alert(
          `Gagal menyimpan Version History.\n\n${error.message}`
        );

        return;
      }

      await loadVersions();

      setEditingVersion(null);

      window.dispatchEvent(
        new Event(
          VERSION_UPDATED_EVENT
        )
      );
    } finally {
      setSavingVersion(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function deleteVersion(
    id: string
  ) {
    if (!isAdmin) {
      return;
    }

    const confirmed =
      window.confirm(
        "Hapus version history ini?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingVersionId(id);

    try {
      const { error } =
        await supabase
          .from("version_history")
          .delete()
          .eq("id", id);

      if (error) {
        console.error(
          "Gagal menghapus Version History:",
          error
        );

        alert(
          `Gagal menghapus Version History.\n\n${error.message}`
        );

        return;
      }

      await loadVersions();

      window.dispatchEvent(
        new Event(
          VERSION_UPDATED_EVENT
        )
      );

      if (
        editingVersion?.id === id
      ) {
        setEditingVersion(null);
      }
    } finally {
      setDeletingVersionId(null);
    }
  }

  /* =======================================================
     FOOTER VERSION
  ======================================================= */

  function formatFooterVersion() {
    if (!latestVersion) {
      return "Version History";
    }

    return `${latestVersion.version} · ${latestVersion.name}`;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <footer className="mt-12 border-t border-[#cfc4b5] pt-6 pb-8">
        <div className="flex flex-col gap-4 text-sm text-[#746a5e] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-[#554c42]">
              HOLOZOE
            </p>

            <p className="mt-1 text-xs">
              Life, fully lived.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setModal("about")
              }
              className="rounded-lg px-3 py-2 hover:bg-[#e5ddd2]"
            >
              About
            </button>

            <span className="opacity-40">
              •
            </span>

            <button
              type="button"
              onClick={() =>
                setModal("history")
              }
              className="rounded-lg px-3 py-2 hover:bg-[#e5ddd2]"
            >
              Version History
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1 text-xs text-[#8a7e70] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Built for a life that keeps moving.
          </span>

          <span>
            {formatFooterVersion()}
          </span>
        </div>
      </footer>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#342d26]/40 p-5 backdrop-blur-sm"
          onMouseDown={() =>
            setModal(null)
          }
        >
          <div
            className="w-full max-w-lg max-h-[75vh] overflow-hidden rounded-3xl border border-[#d7ccbd] bg-[#f8f3eb] p-6 shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
                  {modal === "about"
                    ? "About"
                    : "History"}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#3f382f]">
                  {modal === "about"
                    ? "HOLOZOE"
                    : "Version History"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(null)
                }
                className="rounded-lg px-3 py-2 text-sm text-[#746a5e] hover:bg-[#e5ddd2]"
              >
                Close
              </button>
            </div>

            {modal === "about" ? (
              <div className="mt-6 space-y-4 text-sm leading-7 text-[#62584c]">
                <p>
                  HOLOZOE is a personal life dashboard designed to turn real-life progress into something visible, trackable, and meaningful.
                </p>

                <p>
                  It is not meant to replace life with a game. The idea is the opposite: the system grows together with the person creating it.
                </p>

                <div className="rounded-2xl bg-[#eee7dc] p-4">
                  <p className="font-semibold text-[#554c42]">
                    The principle
                  </p>

                  <p className="mt-1">
                    Real actions first. The game simply helps you see the progress.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {isAdmin &&
                  !editingVersion && (
                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={
                          openAddVersion
                        }
                        className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#796c5c]"
                      >
                        + Add Version
                      </button>
                    </div>
                  )}

                {editingVersion ? (
                  <div className="mt-5 max-h-[57vh] overflow-y-auto pr-2">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-[#746a5e]">
                          Version
                        </label>

                        <input
                          type="text"
                          value={
                            editingVersion.version
                          }
                          onChange={(event) =>
                            updateEditingVersion(
                              "version",
                              event.target.value
                            )
                          }
                          placeholder="v0.8"
                          className="mt-1 w-full rounded-xl border border-[#d7ccbd] bg-white/70 px-3 py-2.5 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#746a5e]">
                          Name
                        </label>

                        <input
                          type="text"
                          value={
                            editingVersion.name
                          }
                          onChange={(event) =>
                            updateEditingVersion(
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Life System & Access"
                          className="mt-1 w-full rounded-xl border border-[#d7ccbd] bg-white/70 px-3 py-2.5 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-[#746a5e]">
                            Date
                          </label>

                          <input
                            type="date"
                            value={normalizeDateForInput(
                              editingVersion.date
                            )}
                            onChange={(event) =>
                              updateEditingVersion(
                                "date",
                                event.target.value
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-[#d7ccbd] bg-white/70 px-3 py-2.5 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#746a5e]">
                            Time
                          </label>

                          <input
                            type="time"
                            value={
                              editingVersion.time
                            }
                            onChange={(event) =>
                              updateEditingVersion(
                                "time",
                                event.target.value
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-[#d7ccbd] bg-white/70 px-3 py-2.5 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-[#746a5e]">
                            Changes
                          </label>

                          <button
                            type="button"
                            onClick={addItem}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-[#746a5e] hover:bg-[#e5ddd2]"
                          >
                            + Add item
                          </button>
                        </div>

                        <div className="mt-2 space-y-2">
                          {editingVersion.items.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      event.target.value
                                    )
                                  }
                                  placeholder="What changed?"
                                  className="flex-1 rounded-xl border border-[#d7ccbd] bg-white/70 px-3 py-2.5 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItem(
                                      index
                                    )
                                  }
                                  className="rounded-lg px-2 py-2 text-xs text-[#8a7e70] hover:bg-[#e5ddd2]"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#eee7dc] p-4 text-xs leading-5 text-[#746a5e]">
                        Versi terbaru ditentukan dari nomor version. Jadi kalau menyimpan v0.8, v0.8 otomatis menjadi Current dan tampil paling atas.
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={
                            closeEditor
                          }
                          disabled={
                            savingVersion
                          }
                          className="rounded-xl px-4 py-2.5 text-sm text-[#746a5e] hover:bg-[#e5ddd2] disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={
                            saveEditingVersion
                          }
                          disabled={
                            savingVersion
                          }
                          className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#796c5c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingVersion
                            ? "Saving..."
                            : "Save Version"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 max-h-[52vh] space-y-4 overflow-y-auto pr-2">
                    {loading ? (
                      <div className="rounded-2xl bg-white/50 p-8 text-center text-sm text-[#746a5e]">
                        Loading Version History...
                      </div>
                    ) : sortedVersions.length ===
                      0 ? (
                      <div className="rounded-2xl bg-white/50 p-8 text-center text-sm text-[#746a5e]">
                        Belum ada Version History.
                      </div>
                    ) : (
                      sortedVersions.map(
                        (
                          version,
                          index
                        ) => {
                          const isLatest =
                            index === 0;

                          return (
                            <article
                              key={
                                version.id
                              }
                              className="rounded-2xl border border-[#d7ccbd] bg-white/50 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div>
                                    <span className="font-bold text-[#3f382f]">
                                      {
                                        version.version
                                      }
                                    </span>

                                    <span className="ml-2 text-sm text-[#746a5e]">
                                      {
                                        version.name
                                      }
                                    </span>
                                  </div>

                                  <p className="mt-1 text-xs text-[#8a7e70]">
                                    {formatDate(
                                      version.date
                                    )}

                                    {version.time
                                      ? ` · ${version.time}`
                                      : ""}
                                  </p>
                                </div>

                                <span
                                  className={
                                    isLatest
                                      ? "rounded-full bg-[#d8cec0] px-2.5 py-1 text-xs text-[#554c42]"
                                      : "rounded-full bg-[#e8e1d8] px-2.5 py-1 text-xs text-[#746a5e]"
                                  }
                                >
                                  {isLatest
                                    ? "Current"
                                    : "Completed"}
                                </span>
                              </div>

                              {version.items.length >
                                0 && (
                                <ul className="mt-3 space-y-1 text-sm text-[#62584c]">
                                  {version.items.map(
                                    (
                                      item,
                                      itemIndex
                                    ) => (
                                      <li
                                        key={`${version.id}-${itemIndex}`}
                                      >
                                        <span className="mr-2 opacity-50">
                                          •
                                        </span>

                                        {item}
                                      </li>
                                    )
                                  )}
                                </ul>
                              )}

                              {isAdmin && (
                                <div className="mt-4 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditVersion(
                                        version
                                      )
                                    }
                                    className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium text-[#554c42] transition hover:bg-[#cfc3b4]"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteVersion(
                                        version.id
                                      )
                                    }
                                    disabled={
                                      deletingVersionId ===
                                      version.id
                                    }
                                    className="rounded-lg px-3 py-2 text-xs font-medium text-[#8a5f55] transition hover:bg-[#eadbd6] disabled:opacity-50"
                                  >
                                    {deletingVersionId ===
                                    version.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              )}
                            </article>
                          );
                        }
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}