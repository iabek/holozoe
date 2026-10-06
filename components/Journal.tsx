"use client";

import { useEffect, useMemo, useState } from "react";
import {
  saveLifeGameStorage,
  syncLifeGameStorageFromSupabase,
} from "@/lib/life-game-storage";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

type JournalEntry = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
};

const STORAGE_KEY = "life-game-journal";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripHtml(html: string) {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }

  const temp = document.createElement("div");
  temp.innerHTML = html;

  return temp.textContent || temp.innerText || "";
}

function normalizeContent(content: string) {
  if (!content) return "<p></p>";

  if (!/<[a-z][\s\S]*>/i.test(content)) {
    return content
      .split(/\r?\n/)
      .map((line) => {
        if (!line.trim()) return "<p></p>";

        return `<p>${line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>`;
      })
      .join("");
  }

  return content;
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "journal-editor min-h-[240px] w-full bg-transparent text-[16px] leading-8 text-[#40382f] outline-none sm:text-[17px]",
        "data-placeholder": "Write whatever is on your mind...",
      },
    },
    onCreate: () => {
      setEditorReady(true);
    },
    onUpdate: ({ editor: currentEditor }) => {
      setContent(currentEditor.getHTML());
      setIsDirty(true);
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await syncLifeGameStorageFromSupabase();

      if (cancelled) {
        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setEntries([]);
        return;
      }

      try {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setEntries(parsed);
        } else {
          setEntries([]);
        }
      } catch {
        setEntries([]);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveEntries(updatedEntries: JournalEntry[]) {
    const serialized = JSON.stringify(updatedEntries);

    setEntries(updatedEntries);
    localStorage.setItem(STORAGE_KEY, serialized);
    window.dispatchEvent(new Event("life-game-updated"));

    const result = await saveLifeGameStorage(
      STORAGE_KEY,
      serialized
    );

    if (!result.success) {
      console.error(
        "Gagal menyimpan Journal ke Supabase:",
        result
      );
    }
  }

  useEffect(() => {
    if (!isCreating) return;

    const cleanTitle = title.trim();
    const currentContent = editor?.getHTML() || content;
    const plainContent = stripHtml(currentContent).trim();

    if (!cleanTitle || !plainContent) return;

    const timer = window.setTimeout(() => {
      const now = new Date().toISOString();

      if (selectedEntryId) {
        const updatedEntries = entries.map((entry) =>
          entry.id === selectedEntryId
            ? {
                ...entry,
                title: cleanTitle,
                content: currentContent,
                updatedAt: now,
              }
            : entry
        );

        void saveEntries(updatedEntries);
        setIsDirty(false);
        return;
      }

      const newEntry: JournalEntry = {
        id: `${Date.now()}-${Math.random()}`,
        title: cleanTitle,
        content: currentContent,
        createdAt: now,
        updatedAt: now,
      };

      void saveEntries([newEntry, ...entries]);
      setSelectedEntryId(newEntry.id);
      setIsDirty(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    title,
    content,
    isCreating,
    selectedEntryId,
  ]);

  function startNewEntry() {
    setSelectedEntryId(null);
    setTitle("");
    setContent("");
    setIsCreating(true);
    setIsDirty(false);

    requestAnimationFrame(() => {
      editor?.commands.setContent("<p></p>", {
        emitUpdate: false,
      });
      editor?.commands.focus("start");
      setContent(editor?.getHTML() || "<p></p>");
    });
  }

  function cancelEditor() {
    setIsCreating(false);
    setSelectedEntryId(null);
    setTitle("");
    setContent("");
    editor?.commands.clearContent();
    setIsDirty(false);
  }

  function openEntry(entry: JournalEntry) {
    setSelectedEntryId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setIsCreating(true);
    setIsDirty(false);

    requestAnimationFrame(() => {
      if (!editor) return;

      editor.commands.setContent(
        normalizeContent(entry.content),
        {
          emitUpdate: false,
        }
      );

      setContent(editor.getHTML());
      editor.commands.focus("end");
    });
  }

  function saveEntry() {
    const cleanTitle = title.trim();
    const cleanContent = editor?.getHTML() || content;
    const plainContent = stripHtml(cleanContent).trim();

    if (!cleanTitle || !plainContent) return;

    const now = new Date().toISOString();

    if (selectedEntryId) {
      const updatedEntries = entries.map((entry) => {
        if (entry.id !== selectedEntryId) return entry;

        return {
          ...entry,
          title: cleanTitle,
          content: cleanContent,
          updatedAt: now,
        };
      });

      void saveEntries(updatedEntries);
    } else {
      const newEntry: JournalEntry = {
        id: `${Date.now()}-${Math.random()}`,
        title: cleanTitle,
        content: cleanContent,
        createdAt: now,
        updatedAt: now,
      };

      void saveEntries([newEntry, ...entries]);
    }

    setIsCreating(false);
    setSelectedEntryId(null);
    setTitle("");
    setContent("");
    editor?.commands.clearContent();
    setIsDirty(false);
  }

  function togglePin(entryId: string) {
    const updatedEntries = entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            pinned: !entry.pinned,
          }
        : entry
    );

    void saveEntries(updatedEntries);
  }

  function deleteEntry(entryId: string) {
    const entry = entries.find(
      (item) => item.id === entryId
    );

    if (!entry) return;

    const confirmed = window.confirm(
      `Hapus journal "${entry.title}"?`
    );

    if (!confirmed) return;

    const updatedEntries = entries.filter(
      (item) => item.id !== entryId
    );

    void saveEntries(updatedEntries);

    if (selectedEntryId === entryId) {
      cancelEditor();
    }
  }

  function handleTitleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    editor?.commands.focus("start");
  }

  function handleEditorKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>
  ) {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      saveEntry();
    }
  }

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    const sortedEntries = [...entries].sort(
      (a, b) => {
        if (
          Boolean(a.pinned) !== Boolean(b.pinned)
        ) {
          return a.pinned ? -1 : 1;
        }

        return (
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
        );
      }
    );

    if (!query) return sortedEntries;

    return sortedEntries.filter((entry) => {
      const plainContent = stripHtml(
        entry.content
      ).toLowerCase();

      return (
        entry.title
          .toLowerCase()
          .includes(query) ||
        plainContent.includes(query)
      );
    });
  }, [entries, search]);

  const toolbarButtonClass =
    "rounded-lg px-3 py-2 text-sm text-[#554c42] hover:bg-[#e5ddd2]";

  return (
    <div>
      {!isCreating && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#746a5e]">
                Private writing space
              </p>

              <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
                Journal
              </h3>
            </div>

            <button
              type="button"
              onClick={startNewEntry}
              className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
            >
              + New Entry
            </button>
          </div>

          <div className="mt-5">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search journal..."
              className="w-full rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#8c8276] focus:border-[#8f806d]"
            />
          </div>

          <div className="mt-5 space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="rounded-3xl border border-[#d7ccbd] bg-[#f8f3eb]/70 p-8 text-center">
                <p className="text-4xl">📝</p>

                <p className="mt-3 font-semibold text-[#3f382f]">
                  {search
                    ? "No journal found."
                    : "Your journal is empty."}
                </p>

                <p className="mt-1 text-sm text-[#766c60]">
                  {search
                    ? "Try another search."
                    : "Write your first entry whenever you're ready."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={startNewEntry}
                    className="mt-5 rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
                  >
                    + Write First Entry
                  </button>
                )}
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="group rounded-3xl border border-[#d7ccbd] bg-[#f8f3eb]/70 p-5 transition hover:bg-[#fbf7f0] sm:p-6"
                >
                  <button
                    type="button"
                    onClick={() =>
                      openEntry(entry)
                    }
                    className="block w-full text-left"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
                          {formatDate(
                            entry.updatedAt
                          )}
                        </p>

                        <h4 className="mt-1 truncate text-lg font-bold text-[#3f382f]">
                          {entry.title}
                        </h4>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {entry.pinned && (
                          <span title="Pinned">
                            📌
                          </span>
                        )}

                        <span className="text-xs text-[#8a7e70]">
                          {formatTime(
                            entry.updatedAt
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#6d6358]">
                      {stripHtml(entry.content)}
                    </p>
                  </button>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        togglePin(entry.id)
                      }
                      className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium text-[#554c42] transition hover:bg-[#cfc3b4]"
                    >
                      {entry.pinned
                        ? "📌 Unpin"
                        : "📌 Pin"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteEntry(entry.id)
                      }
                      className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium text-[#554c42] transition hover:bg-[#cfc3b4]"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      )}

      {isCreating && (
        <section className="min-h-[calc(100vh-140px)]">
          <button
            type="button"
            onClick={cancelEditor}
            className="text-sm font-medium text-[#746a5e] transition hover:text-[#3f382f]"
          >
            ← Back to Journal
          </button>

          <p className="mt-8 text-sm font-medium text-[#8a7e70]">
            {formatDate(
              new Date().toISOString()
            )}
          </p>

          <input
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setIsDirty(true);
            }}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled journal"
            className="mt-3 w-full border-0 bg-transparent text-3xl font-bold tracking-tight text-[#383128] outline-none placeholder:text-[#a59a8c] sm:text-4xl"
          />

          <div className="mt-6 border-t border-[#cfc4b5]" />

          <div className="mt-4 flex flex-wrap items-center gap-1 border-b border-[#ddd3c6] pb-3">
            <button
              type="button"
              title="Bold"
              className={`${toolbarButtonClass} font-bold`}
              onMouseDown={(event) => {
                event.preventDefault();
                editor
                  ?.chain()
                  .focus()
                  .toggleBold()
                  .run();
              }}
            >
              B
            </button>

            <button
              type="button"
              title="Italic"
              className={`${toolbarButtonClass} italic`}
              onMouseDown={(event) => {
                event.preventDefault();
                editor
                  ?.chain()
                  .focus()
                  .toggleItalic()
                  .run();
              }}
            >
              I
            </button>

            <button
              type="button"
              title="Underline"
              className={`${toolbarButtonClass} underline`}
              onMouseDown={(event) => {
                event.preventDefault();
                editor
                  ?.chain()
                  .focus()
                  .toggleUnderline()
                  .run();
              }}
            >
              U
            </button>

            <button
              type="button"
              title="Strikethrough"
              className={`${toolbarButtonClass} line-through`}
              onMouseDown={(event) => {
                event.preventDefault();
                editor
                  ?.chain()
                  .focus()
                  .toggleStrike()
                  .run();
              }}
            >
              S
            </button>

            <div className="mx-1 h-5 w-px bg-[#d2c7b9]" />

            <button
              type="button"
              title="Bullet list"
              className={toolbarButtonClass}
              onMouseDown={(event) => {
                event.preventDefault();
                editor
                  ?.chain()
                  .focus()
                  .toggleBulletList()
                  .run();
              }}
            >
              • List
            </button>

            <button
              type="button"
              title="Numbered list"
              className={toolbarButtonClass}
              onMouseDown={(event) => {
                event.preventDefault();
                editor
                  ?.chain()
                  .focus()
                  .toggleOrderedList()
                  .run();
              }}
            >
              1. List
            </button>

            <button
              type="button"
              title="Quote"
              className={toolbarButtonClass}
              onMouseDown={(event) => {
                event.preventDefault();

                if (!editor) return;

                if (editor.isActive("blockquote")) {
                  editor
                    .chain()
                    .focus()
                    .unsetBlockquote()
                    .run();
                } else {
                  editor
                    .chain()
                    .focus()
                    .setBlockquote()
                    .run();
                }
              }}
            >
              “ Quote
            </button>

            <button
              type="button"
              title="Clear formatting"
              className={toolbarButtonClass}
              onMouseDown={(event) => {
                event.preventDefault();

                editor
                  ?.chain()
                  .focus()
                  .unsetAllMarks()
                  .clearNodes()
                  .run();
              }}
            >
              Normal
            </button>
          </div>

          <div className="mt-6">
            {editorReady && editor && (
              <div
                onKeyDown={
                  handleEditorKeyDown
                }
              >
                <EditorContent
                  editor={editor}
                />
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#cfc4b5] pt-5 pb-10">
            <p className="text-xs text-[#8a7e70]">
              {stripHtml(content).length} characters
              <span className="mx-2">•</span>
              Ctrl + Enter to save
            </p>

            <div className="flex items-center gap-2">
              {selectedEntryId && (
                <button
                  type="button"
                  onClick={() =>
                    deleteEntry(
                      selectedEntryId
                    )
                  }
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#8a5f55] hover:bg-[#eadbd5]"
                >
                  Delete
                </button>
              )}

              <button
                type="button"
                onClick={cancelEditor}
                className="rounded-xl bg-[#ddd4c7] px-4 py-2.5 text-sm font-medium text-[#554c42] hover:bg-[#cfc3b4]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEntry}
                disabled={
                  !title.trim() ||
                  !stripHtml(content).trim()
                }
                className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7d6f5e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save Entry
              </button>
            </div>
          </div>
        </section>
      )}

      <style jsx global>{`
        .journal-editor {
          min-height: 240px;
        }

        .journal-editor:focus {
          outline: none;
        }

        .journal-editor p {
          margin: 0.35rem 0;
        }

        .journal-editor ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }

        .journal-editor ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          list-style-type: decimal;
        }

        .journal-editor li {
          padding-left: 0.25rem;
        }

        .journal-editor blockquote {
          margin: 1rem 0;
          border-left: 3px solid #8f806d;
          padding-left: 1rem;
          color: #62584c;
        }

        .journal-editor p.is-editor-empty:first-child::before {
          color: #a59a8c;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}