"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  saveCurrentLifeGameStorage,
} from "@/lib/life-game-storage";

type LearningNote = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  folder: string;
  links: string[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY =
  "life-game-learning";

function makeId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function loadNotes(): LearningNote[] {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

async function saveNotes(
  notes: LearningNote[]
) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(notes)
  );

  window.dispatchEvent(
    new Event("life-game-updated")
  );

  const result =
    await saveCurrentLifeGameStorage(
      STORAGE_KEY
    );

  if (!result.success) {
    console.error(
      "Gagal menyimpan Learning ke Supabase:",
      result
    );
  }
}

function normalizeTags(
  value: string
) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter(
      (tag, index, array) =>
        array.findIndex(
          (item) =>
            item.toLowerCase() ===
            tag.toLowerCase()
        ) === index
    );
}

export default function Learning() {
  const [notes, setNotes] =
    useState<LearningNote[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [folder, setFolder] =
    useState("All");

  const [tagFilter, setTagFilter] =
    useState("All");

  const [query, setQuery] =
    useState("");

  const [view, setView] =
    useState<"notes" | "graph">(
      "notes"
    );

  const [graphZoom, setGraphZoom] =
    useState(1);

  const [graphPan, setGraphPan] =
    useState({
      x: 0,
      y: 0,
    });

  const [
    graphPositions,
    setGraphPositions,
  ] = useState<
    Record<
      string,
      {
        x: number;
        y: number;
      }
    >
  >({});

  const [
    draggingNodeId,
    setDraggingNodeId,
  ] = useState<string | null>(
    null
  );

  const [
    draggingPan,
    setDraggingPan,
  ] = useState(false);

  const [
    graphPointer,
    setGraphPointer,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [title, setTitle] =
    useState("");

  const [summary, setSummary] =
    useState("");

  const [tags, setTags] =
    useState("");

  const [noteFolder, setNoteFolder] =
    useState("General");

  const [links, setLinks] =
    useState<string[]>([]);

  const [editing, setEditing] =
    useState(false);

  useEffect(() => {
    const loaded =
      loadNotes();

    setNotes(loaded);

    function refresh() {
      setNotes(
        loadNotes()
      );
    }

    window.addEventListener(
      "life-game-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "life-game-updated",
        refresh
      );
    };
  }, []);

  const folders = useMemo(() => {
    const values =
      new Set<string>([
        "General",
      ]);

    notes.forEach((note) => {
      if (
        note.folder.trim()
      ) {
        values.add(
          note.folder.trim()
        );
      }
    });

    return Array.from(
      values
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [notes]);

  const allTags = useMemo(() => {
    const values =
      new Set<string>();

    notes.forEach((note) => {
      note.tags.forEach(
        (tag) =>
          values.add(tag)
      );
    });

    return Array.from(
      values
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [notes]);

  const filteredNotes =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      return notes.filter(
        (note) => {
          const matchesFolder =
            folder === "All" ||
            note.folder ===
              folder;

          const matchesTag =
            tagFilter === "All" ||
            note.tags.includes(
              tagFilter
            );

          const haystack = [
            note.title,
            note.summary,
            note.folder,
            note.tags.join(" "),
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !search ||
            haystack.includes(
              search
            );

          return (
            matchesFolder &&
            matchesTag &&
            matchesSearch
          );
        }
      );
    }, [
      notes,
      folder,
      tagFilter,
      query,
    ]);

  const selectedNote =
    notes.find(
      (note) =>
        note.id === selectedId
    ) ?? null;

  function resetEditor() {
    setSelectedId(null);
    setTitle("");
    setSummary("");
    setTags("");
    setNoteFolder("General");
    setLinks([]);
    setEditing(false);
  }

  function selectNote(
    note: LearningNote
  ) {
    setSelectedId(note.id);
    setTitle(note.title);
    setSummary(note.summary);
    setTags(
      note.tags.join(", ")
    );
    setNoteFolder(
      note.folder
    );
    setLinks(note.links);
    setEditing(true);
  }

  function createNote() {
    resetEditor();
    setEditing(true);
  }

  function toggleLink(
    id: string
  ) {
    setLinks((current) =>
      current.includes(id)
        ? current.filter(
            (item) =>
              item !== id
          )
        : [
            ...current,
            id,
          ]
    );
  }

  async function saveNote() {
    const cleanTitle =
      title.trim();

    if (!cleanTitle) {
      window.alert(
        "Judul materi belum diisi."
      );
      return;
    }

    const now =
      new Date().toISOString();

    const cleanTags =
      normalizeTags(tags);

    const cleanFolder =
      noteFolder.trim() ||
      "General";

    if (selectedId) {
      const updated =
        notes.map((note) =>
          note.id === selectedId
            ? {
                ...note,
                title:
                  cleanTitle,
                summary:
                  summary.trim(),
                tags:
                  cleanTags,
                folder:
                  cleanFolder,
                links:
                  links.filter(
                    (id) =>
                      notes.some(
                        (item) =>
                          item.id ===
                          id
                      )
                  ),
                updatedAt:
                  now,
              }
            : note
        );

      setNotes(updated);

      await saveNotes(
        updated
      );
    } else {
      const newNote: LearningNote =
        {
          id: makeId(),
          title:
            cleanTitle,
          summary:
            summary.trim(),
          tags:
            cleanTags,
          folder:
            cleanFolder,
          links:
            links.filter(
              (id) =>
                notes.some(
                  (item) =>
                    item.id === id
                )
            ),
          createdAt:
            now,
          updatedAt:
            now,
        };

      const updated = [
        newNote,
        ...notes,
      ];

      setNotes(updated);

      await saveNotes(
        updated
      );

      setSelectedId(
        newNote.id
      );
    }

    setEditing(false);
  }

  async function deleteNote() {
    if (!selectedId) {
      return;
    }

    const note =
      notes.find(
        (item) =>
          item.id ===
          selectedId
      );

    if (!note) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus "${note.title}" dari Learning?`
      );

    if (!confirmed) {
      return;
    }

    const updated =
      notes
        .filter(
          (item) =>
            item.id !==
            selectedId
        )
        .map((item) => ({
          ...item,
          links:
            item.links.filter(
              (id) =>
                id !==
                selectedId
            ),
        }));

    setNotes(updated);

    await saveNotes(
      updated
    );

    resetEditor();
  }

  const graphNotes =
    useMemo(() => {
      return notes.filter(
        (note) => {
          if (
            folder !== "All" &&
            note.folder !==
              folder
          ) {
            return false;
          }

          if (
            tagFilter !== "All" &&
            !note.tags.includes(
              tagFilter
            )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      notes,
      folder,
      tagFilter,
    ]);

  const graphNodeWidth = 180;
  const graphNodeHeight = 72;
  const graphGapX = 250;
  const graphGapY = 125;
  const graphColumns = 6;

  useEffect(() => {
    setGraphPositions(
      (current) => {
        const next = {
          ...current,
        };

        let changed = false;

        graphNotes.forEach(
          (
            note,
            index
          ) => {
            if (
              next[note.id]
            ) {
              return;
            }

            const column =
              index %
              graphColumns;

            const row =
              Math.floor(
                index /
                  graphColumns
              );

            next[note.id] = {
              x:
                140 +
                column *
                  graphGapX,
              y:
                140 +
                row *
                  graphGapY,
            };

            changed = true;
          }
        );

        const validIds =
          new Set(
            graphNotes.map(
              (note) =>
                note.id
            )
          );

        Object.keys(
          next
        ).forEach((id) => {
          if (
            !validIds.has(id)
          ) {
            delete next[id];
            changed = true;
          }
        });

        return changed
          ? next
          : current;
      }
    );
  }, [graphNotes]);

  const graphEdges =
    useMemo(() => {
      const visibleIds =
        new Set(
          graphNotes.map(
            (note) =>
              note.id
          )
        );

      const seen =
        new Set<string>();

      const edges: {
        from: string;
        to: string;
      }[] = [];

      graphNotes.forEach(
        (note) => {
          note.links.forEach(
            (linkedId) => {
              if (
                !visibleIds.has(
                  linkedId
                ) ||
                linkedId ===
                  note.id
              ) {
                return;
              }

              const key = [
                note.id,
                linkedId,
              ]
                .sort()
                .join("::");

              if (
                seen.has(key)
              ) {
                return;
              }

              seen.add(key);

              edges.push({
                from:
                  note.id,
                to:
                  linkedId,
              });
            }
          );
        }
      );

      return edges;
    }, [graphNotes]);

  function resetGraphView() {
    setGraphZoom(1);

    setGraphPan({
      x: 0,
      y: 0,
    });
  }

  function getGraphPoint(
    event: React.PointerEvent<Element>
  ) {
    const svg =
      event.currentTarget instanceof
      SVGSVGElement
        ? event.currentTarget
        : event.currentTarget
            .ownerSVGElement;

    if (!svg) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      svg.getBoundingClientRect();

    return {
      x:
        (event.clientX -
          rect.left -
          graphPan.x) /
        graphZoom,

      y:
        (event.clientY -
          rect.top -
          graphPan.y) /
        graphZoom,
    };
  }

  function handleGraphPointerDown(
    event: React.PointerEvent<SVGSVGElement>
  ) {
    if (
      event.target !==
      event.currentTarget
    ) {
      return;
    }

    const point = {
      x: event.clientX,
      y: event.clientY,
    };

    setDraggingPan(true);

    setGraphPointer(
      point
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  function handleGraphPointerMove(
    event: React.PointerEvent<SVGSVGElement>
  ) {
    if (
      draggingNodeId
    ) {
      const point =
        getGraphPoint(
          event
        );

      setGraphPositions(
        (current) => ({
          ...current,
          [draggingNodeId]:
            {
              x: point.x,
              y: point.y,
            },
        })
      );

      return;
    }

    if (!draggingPan) {
      return;
    }

    const dx =
      event.clientX -
      graphPointer.x;

    const dy =
      event.clientY -
      graphPointer.y;

    setGraphPan(
      (current) => ({
        x:
          current.x + dx,
        y:
          current.y + dy,
      })
    );

    setGraphPointer({
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleGraphPointerUp(
    event: React.PointerEvent<SVGSVGElement>
  ) {
    setDraggingNodeId(
      null
    );

    setDraggingPan(
      false
    );

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  function startDraggingNode(
    event: React.PointerEvent<SVGGElement>,
    noteId: string
  ) {
    event.stopPropagation();
    event.preventDefault();

    const point =
      getGraphPoint(
        event
      );

    setDraggingNodeId(
      noteId
    );

    setGraphPositions(
      (current) => ({
        ...current,
        [noteId]: {
          x: point.x,
          y: point.y,
        },
      })
    );

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  function zoomGraph(
    delta: number
  ) {
    setGraphZoom(
      (current) =>
        Math.min(
          2.5,
          Math.max(
            0.45,
            Number(
              (
                current +
                delta
              ).toFixed(2)
            )
          )
        )
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Knowledge base
            </p>

            <h2 className="mt-1 text-3xl font-bold">
              Learning
            </h2>

            <p className="mt-2 max-w-2xl text-sm opacity-60">
              Simpan apa yang kamu
              pelajari, kelompokkan
              dengan folder dan tags,
              lalu hubungkan materi
              untuk membentuk
              knowledge graph.
            </p>
          </div>

          <button
            type="button"
            onClick={
              createNote
            }
            className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            + New learning
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Materials
            </p>

            <p className="mt-1 text-2xl font-bold">
              {notes.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Folders
            </p>

            <p className="mt-1 text-2xl font-bold">
              {folders.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Connections
            </p>

            <p className="mt-1 text-2xl font-bold">
              {notes.reduce(
                (total, note) =>
                  total +
                  note.links
                    .length,
                0
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-3xl bg-white/60 p-4 shadow-sm">
          <p className="px-2 text-xs font-semibold uppercase tracking-widest opacity-50">
            Folders
          </p>

          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() =>
                setFolder("All")
              }
              className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                folder ===
                "All"
                  ? "bg-[#ddd4c7] font-semibold"
                  : "hover:bg-[#eee7dc]"
              }`}
            >
              📚 All materials
            </button>

            {folders.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setFolder(
                      item
                    )
                  }
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                    folder ===
                    item
                      ? "bg-[#ddd4c7] font-semibold"
                      : "hover:bg-[#eee7dc]"
                  }`}
                >
                  📁 {item}
                </button>
              )
            )}
          </div>

          <div className="mt-6 border-t border-[#d8cec0] pt-4">
            <p className="px-2 text-xs font-semibold uppercase tracking-widest opacity-50">
              Tags
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setTagFilter(
                    "All"
                  )
                }
                className={`rounded-full px-3 py-1 text-xs ${
                  tagFilter ===
                  "All"
                    ? "bg-[#8f806d] text-white"
                    : "bg-[#eee7dc]"
                }`}
              >
                All
              </button>

              {allTags.map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTagFilter(
                        tag
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs ${
                      tagFilter ===
                      tag
                        ? "bg-[#8f806d] text-white"
                        : "bg-[#eee7dc]"
                    }`}
                  >
                    #{tag}
                  </button>
                )
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target
                    .value
                )
              }
              placeholder="Search learning..."
              className="min-w-0 flex-1 rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#8c8276] focus:border-[#8f806d]"
            />

            <div className="flex rounded-xl bg-[#ddd4c7] p-1">
              <button
                type="button"
                onClick={() =>
                  setView(
                    "notes"
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm ${
                  view ===
                  "notes"
                    ? "bg-[#f8f3eb] font-semibold shadow-sm"
                    : "opacity-60"
                }`}
              >
                Notes
              </button>

              <button
                type="button"
                onClick={() =>
                  setView(
                    "graph"
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm ${
                  view ===
                  "graph"
                    ? "bg-[#f8f3eb] font-semibold shadow-sm"
                    : "opacity-60"
                }`}
              >
                Graph
              </button>
            </div>
          </div>

          {view ===
          "notes" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredNotes.length ===
              0 ? (
                <div className="rounded-3xl bg-white/60 p-8 text-center shadow-sm sm:col-span-2">
                  <p className="text-3xl">
                    📚
                  </p>

                  <p className="mt-3 font-semibold">
                    No learning materials yet
                  </p>

                  <p className="mt-1 text-sm opacity-50">
                    Start by
                    writing down
                    something you
                    learned.
                  </p>
                </div>
              ) : (
                filteredNotes.map(
                  (note) => (
                    <button
                      key={
                        note.id
                      }
                      type="button"
                      onClick={() =>
                        selectNote(
                          note
                        )
                      }
                      className="rounded-3xl bg-white/60 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white/80"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold">
                            {
                              note.title
                            }
                          </p>

                          <p className="mt-1 text-xs opacity-50">
                            📁{" "}
                            {
                              note.folder
                            }
                          </p>
                        </div>

                        <span className="shrink-0 text-xs opacity-50">
                          {
                            note
                              .links
                              .length
                          }{" "}
                          link
                          {note.links
                            .length ===
                          1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      <p className="mt-4 line-clamp-4 text-sm leading-6 opacity-65">
                        {note.summary ||
                          "No summary yet."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {note.tags.map(
                          (
                            tag
                          ) => (
                            <span
                              key={
                                tag
                              }
                              className="rounded-full bg-[#eee7dc] px-2.5 py-1 text-[11px]"
                            >
                              #
                              {
                                tag
                              }
                            </span>
                          )
                        )}
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-white/60 shadow-sm">
              <div className="pointer-events-none absolute left-5 top-5 z-10">
                <p className="text-xs uppercase tracking-widest opacity-50">
                  Knowledge graph
                </p>

                <p className="mt-1 text-sm opacity-50">
                  Drag the
                  canvas, move
                  nodes, and
                  zoom in or
                  out.
                </p>
              </div>

              <div className="absolute right-5 top-5 z-10 flex items-center gap-1 rounded-xl bg-[#f8f3eb]/95 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    zoomGraph(
                      -0.15
                    )
                  }
                  className="h-8 w-8 rounded-lg text-sm font-semibold hover:bg-[#eee7dc]"
                  aria-label="Zoom out"
                >
                  −
                </button>

                <button
                  type="button"
                  onClick={
                    resetGraphView
                  }
                  className="min-w-14 rounded-lg px-2 py-2 text-[11px] font-semibold hover:bg-[#eee7dc]"
                >
                  {Math.round(
                    graphZoom *
                      100
                  )}
                  %
                </button>

                <button
                  type="button"
                  onClick={() =>
                    zoomGraph(
                      0.15
                    )
                  }
                  className="h-8 w-8 rounded-lg text-sm font-semibold hover:bg-[#eee7dc]"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>

              {graphNotes.length ===
              0 ? (
                <div className="flex min-h-[560px] items-center justify-center text-center">
                  <div>
                    <p className="text-4xl">
                      🕸️
                    </p>

                    <p className="mt-3 font-semibold">
                      Your graph is empty
                    </p>

                    <p className="mt-1 text-sm opacity-50">
                      Create notes
                      and connect
                      them to see
                      relationships.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative h-[620px] w-full overflow-hidden overscroll-contain touch-none bg-[#f7f2ea]">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 1000 700"
                    preserveAspectRatio="xMidYMid meet"
                    className={`h-full w-full ${
                      draggingPan
                        ? "cursor-grabbing"
                        : "cursor-grab"
                    }`}
                    onPointerDown={
                      handleGraphPointerDown
                    }
                    onPointerMove={
                      handleGraphPointerMove
                    }
                    onPointerUp={
                      handleGraphPointerUp
                    }
                    onPointerCancel={
                      handleGraphPointerUp
                    }
                    onWheel={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      zoomGraph(
                        event.deltaY >
                          0
                          ? -0.08
                          : 0.08
                      );
                    }}
                  >
                    <g
                      transform={`translate(${graphPan.x} ${graphPan.y}) scale(${graphZoom})`}
                    >
                      {graphEdges.map(
                        (edge) => {
                          const from =
                            graphPositions[
                              edge.from
                            ];

                          const to =
                            graphPositions[
                              edge.to
                            ];

                          if (
                            !from ||
                            !to
                          ) {
                            return null;
                          }

                          return (
                            <line
                              key={`${edge.from}-${edge.to}`}
                              x1={
                                from.x
                              }
                              y1={
                                from.y
                              }
                              x2={
                                to.x
                              }
                              y2={
                                to.y
                              }
                              stroke="#9b8d7b"
                              strokeWidth={
                                2
                              }
                              opacity={
                                0.6
                              }
                            />
                          );
                        }
                      )}

                      {graphNotes.map(
                        (note) => {
                          const position =
                            graphPositions[
                              note.id
                            ];

                          if (
                            !position
                          ) {
                            return null;
                          }

                          const isConnected =
                            graphEdges.some(
                              (
                                edge
                              ) =>
                                edge.from ===
                                  note.id ||
                                edge.to ===
                                  note.id
                            );

                          return (
                            <g
                              key={
                                note.id
                              }
                              transform={`translate(${position.x} ${position.y})`}
                              onPointerDown={(
                                event
                              ) =>
                                startDraggingNode(
                                  event,
                                  note.id
                                )
                              }
                              onClick={() =>
                                selectNote(
                                  note
                                )
                              }
                              className="cursor-grab"
                            >
                              <rect
                                x={
                                  -graphNodeWidth /
                                  2
                                }
                                y={
                                  -graphNodeHeight /
                                  2
                                }
                                width={
                                  graphNodeWidth
                                }
                                height={
                                  graphNodeHeight
                                }
                                rx={
                                  16
                                }
                                fill="#f8f3eb"
                                stroke={
                                  isConnected
                                    ? "#8f806d"
                                    : "#cfc4b5"
                                }
                                strokeWidth={
                                  isConnected
                                    ? 2
                                    : 1
                                }
                              />

                              <text
                                x="0"
                                y="-5"
                                textAnchor="middle"
                                className="pointer-events-none"
                                fill="#3f382f"
                                fontSize="14"
                                fontWeight="600"
                              >
                                {note
                                  .title
                                  .length >
                                22
                                  ? `${note.title.slice(
                                      0,
                                      22
                                    )}…`
                                  : note.title}
                              </text>

                              <text
                                x="0"
                                y="17"
                                textAnchor="middle"
                                className="pointer-events-none"
                                fill="#8c8276"
                                fontSize="10"
                              >
                                {note
                                  .folder
                                  .length >
                                24
                                  ? `${note.folder.slice(
                                      0,
                                      24
                                    )}…`
                                  : note.folder}
                              </text>

                              <title>
                                {
                                  note.title
                                }
                              </title>
                            </g>
                          );
                        }
                      )}
                    </g>
                  </svg>

                  <div className="pointer-events-none select-none absolute bottom-4 left-4 rounded-xl bg-[#f8f3eb]/90 px-3 py-2 text-[11px] opacity-70 shadow-sm">
                    🖐 Drag canvas ·
                    🟤 Drag node ·
                    🖱 Scroll to zoom
                  </div>

                  <div className="pointer-events-none select-none absolute bottom-4 right-4 rounded-xl bg-[#f8f3eb]/90 px-3 py-2 text-[11px] opacity-70 shadow-sm">
                    {
                      graphNotes.length
                    }{" "}
                    nodes ·{" "}
                    {
                      graphEdges.length
                    }{" "}
                    connections
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="rounded-3xl bg-white/70 p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-50">
                {selectedId
                  ? "Edit material"
                  : "New material"}
              </p>

              <h3 className="mt-1 text-xl font-bold">
                What did you learn?
              </h3>
            </div>

            <button
              type="button"
              onClick={
                resetEditor
              }
              className="rounded-xl bg-[#eee7dc] px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target
                    .value
                )
              }
              placeholder="Title — e.g. RAAS"
              className="rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
            />

            <textarea
              value={summary}
              onChange={(event) =>
                setSummary(
                  event.target
                    .value
                )
              }
              placeholder="Write what you learned..."
              rows={7}
              className="resize-y rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm leading-6 outline-none focus:border-[#8f806d]"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <input
                  list="learning-folder-suggestions"
                  value={
                    noteFolder
                  }
                  onChange={(
                    event
                  ) =>
                    setNoteFolder(
                      event.target
                        .value
                    )
                  }
                  placeholder="Folder — e.g. Medicine / Renal"
                  className="w-full rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
                />

                <datalist id="learning-folder-suggestions">
                  {folders.map(
                    (item) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      />
                    )
                  )}
                </datalist>

                <p className="mt-1.5 px-1 text-[11px] opacity-45">
                  Folder yang
                  pernah dibuat
                  akan otomatis
                  muncul sebagai
                  pilihan.
                </p>
              </div>

              <input
                value={tags}
                onChange={(event) =>
                  setTags(
                    event.target
                      .value
                  )
                }
                placeholder="Tags — medicine, renal, physiology"
                className="rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm outline-none focus:border-[#8f806d]"
              />
            </div>

            {notes.filter(
              (note) =>
                note.id !==
                selectedId
            ).length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">
                  Connect to other materials
                </p>

                <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                  {notes
                    .filter(
                      (note) =>
                        note.id !==
                        selectedId
                    )
                    .map(
                      (note) => (
                        <button
                          key={
                            note.id
                          }
                          type="button"
                          onClick={() =>
                            toggleLink(
                              note.id
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-xs ${
                            links.includes(
                              note.id
                            )
                              ? "bg-[#8f806d] text-white"
                              : "bg-[#eee7dc]"
                          }`}
                        >
                          {links.includes(
                            note.id
                          )
                            ? "✓ "
                            : ""}
                          {
                            note.title
                          }
                        </button>
                      )
                    )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 border-t border-[#d8cec0] pt-4">
              <div>
                {selectedId && (
                  <button
                    type="button"
                    onClick={
                      deleteNote
                    }
                    className="rounded-xl border border-[#d2bdb4] px-4 py-2.5 text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={
                  saveNote
                }
                className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Save learning
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedNote &&
        !editing && (
          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-sm">
              {
                selectedNote.title
              }
            </p>
          </div>
        )}
    </div>
  );
}