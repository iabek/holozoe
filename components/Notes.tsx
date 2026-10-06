"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  saveLifeGameStorage,
  syncLifeGameStorageFromSupabase,
} from "@/lib/life-game-storage";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
};

const STORAGE_KEY = "life-game-notes";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function stripHtml(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function plainTextToHtml(text: string) {
  if (!text) return "";

  const div = document.createElement("div");
  div.textContent = text;

  return div.innerHTML.replace(/\n/g, "<br>");
}

function loadNotes(): Note[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (note): note is Note =>
        note &&
        typeof note === "object" &&
        typeof note.id === "string" &&
        typeof note.title === "string" &&
        typeof note.content === "string" &&
        typeof note.createdAt === "string" &&
        typeof note.updatedAt === "string"
    );
  } catch {
    return [];
  }
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [isNewNote, setIsNewNote] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await syncLifeGameStorageFromSupabase();

      if (cancelled) {
        return;
      }

      const loadedNotes = loadNotes();

      setNotes(loadedNotes);

      if (loadedNotes.length > 0) {
        setSelectedNoteId(loadedNotes[0].id);
        setEditingTitle(loadedNotes[0].title);
        setEditingContent(loadedNotes[0].content);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const content = editingContent;

    if (
      editorRef.current.innerHTML !== content &&
      document.activeElement !== editorRef.current
    ) {
      editorRef.current.innerHTML = content
        ? content.includes("<")
          ? content
          : plainTextToHtml(content)
        : "";
    }
  }, [editingContent, isNewNote]);

  const persistNotes = async (updatedNotes: Note[]) => {
    const serialized = JSON.stringify(updatedNotes);

    setNotes(updatedNotes);
    localStorage.setItem(STORAGE_KEY, serialized);
    window.dispatchEvent(new Event("life-game-updated"));

    const result = await saveLifeGameStorage(
      STORAGE_KEY,
      serialized
    );

    if (!result.success) {
      console.error(
        "Gagal menyimpan Notes ke Supabase:",
        result
      );
    }
  };

  const saveCurrentNote = (
    title: string,
    content: string,
    currentNotes: Note[]
  ) => {
    const now = new Date().toISOString();

    if (isNewNote || !selectedNoteId) {
      const newNote: Note = {
        id: createId(),
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };

      const updatedNotes = [newNote, ...currentNotes];

      void persistNotes(updatedNotes);

      setSelectedNoteId(newNote.id);
      setEditingTitle(newNote.title);
      setEditingContent(newNote.content);
      setIsNewNote(false);
      setIsDirty(false);

      return;
    }

    const updatedNotes = currentNotes.map((note) =>
      note.id === selectedNoteId
        ? {
            ...note,
            title,
            content,
            updatedAt: now,
          }
        : note
    );

    void persistNotes(updatedNotes);

    setEditingContent(content);
    setIsDirty(false);
  };

  useEffect(() => {
    if (!isNewNote && !selectedNoteId) return;
    if (!isDirty) return;

    const cleanTitle = editingTitle.trim() || "Untitled";

    const currentContent =
      editorRef.current?.innerHTML || editingContent;

    const plainContent = stripHtml(currentContent).trim();

    if (!plainContent) return;

    saveCurrentNote(
      cleanTitle,
      currentContent,
      notes
    );
  }, [
    editingTitle,
    editingContent,
    isDirty,
  ]);

  useEffect(() => {
    if ((!isNewNote && !selectedNoteId) || !isDirty) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
  }, [
    isNewNote,
    selectedNoteId,
    isDirty,
  ]);

  const filteredNotes = useMemo(() => {
    const sortedNotes = [...notes].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }

      return (
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
      );
    });

    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return sortedNotes;
    }

    return sortedNotes.filter((note) => {
      const readableContent = stripHtml(
        note.content
      );

      return (
        note.title
          .toLowerCase()
          .includes(keyword) ||
        readableContent
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [notes, search]);

  function selectNote(note: Note) {
    setSelectedNoteId(note.id);
    setEditingTitle(note.title);
    setEditingContent(note.content);
    setIsNewNote(false);
    setIsDirty(false);
  }

  function createNewNote() {
    setSelectedNoteId(null);
    setEditingTitle("");
    setEditingContent("");
    setIsNewNote(true);
    setIsDirty(false);

    requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }

  function saveNote() {
    const title =
      editingTitle.trim() || "Untitled";

    const content =
      editorRef.current?.innerHTML ||
      editingContent;

    if (!content.trim()) {
      return;
    }

    saveCurrentNote(
      title,
      content,
      notes
    );
  }

  function togglePin(noteId: string) {
    const updatedNotes = notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            pinned: !note.pinned,
          }
        : note
    );

    void persistNotes(updatedNotes);
  }

  function deleteNote() {
    if (!selectedNoteId) {
      return;
    }

    const note = notes.find(
      (item) => item.id === selectedNoteId
    );

    if (!note) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${note.title}"?\n\nThis note will be permanently deleted.`
    );

    if (!confirmed) {
      return;
    }

    const updatedNotes = notes.filter(
      (item) => item.id !== selectedNoteId
    );

    void persistNotes(updatedNotes);

    if (updatedNotes.length > 0) {
      const nextNote = updatedNotes[0];

      setSelectedNoteId(nextNote.id);
      setEditingTitle(nextNote.title);
      setEditingContent(nextNote.content);
      setIsNewNote(false);
      setIsDirty(false);
    } else {
      setSelectedNoteId(null);
      setEditingTitle("");
      setEditingContent("");
      setIsNewNote(false);
      setIsDirty(false);
    }
  }

  function runCommand(command: string) {
    editorRef.current?.focus();

    document.execCommand(
      command,
      false
    );

    const content =
      editorRef.current?.innerHTML || "";

    setEditingContent(content);
    setIsDirty(true);
  }

  function handleEditorKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>
  ) {
    if (
      event.ctrlKey &&
      event.key === "Enter"
    ) {
      event.preventDefault();
      saveNote();
    }
  }

  function handleTitleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveNote();
      editorRef.current?.focus();
    }
  }

  const selectedNote = notes.find(
    (note) => note.id === selectedNoteId
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-[#d8cec0] bg-white/70 shadow-sm">
      <div className="flex min-h-[650px] flex-col md:flex-row">
        <aside className="w-full border-b border-[#d8cec0] bg-[#f5f0e8]/70 md:w-[300px] md:border-b-0 md:border-r">
          <div className="border-b border-[#d8cec0] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                Notes
              </h2>

              <button
                type="button"
                onClick={createNewNote}
                className="rounded-xl bg-[#3f382f] px-3 py-2 text-sm font-medium text-white transition hover:opacity-85"
              >
                + New Note
              </button>
            </div>

            <div className="mt-4">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search notes..."
                className="w-full rounded-xl border border-[#d8cec0] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8f806d]"
              />
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto p-2">
            {filteredNotes.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm opacity-50">
                  {search
                    ? "No notes found."
                    : "No notes yet."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={createNewNote}
                    className="mt-3 text-sm font-medium underline underline-offset-4"
                  >
                    Create your first note
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotes.map((note) => {
                  const isSelected =
                    note.id === selectedNoteId &&
                    !isNewNote;

                  const preview =
                    stripHtml(note.content);

                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() =>
                        selectNote(note)
                      }
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${
                        isSelected
                          ? "bg-white shadow-sm"
                          : "hover:bg-white/70"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold">
                        {note.title || "Untitled"}
                      </p>

                      <p className="mt-1 truncate text-xs opacity-45">
                        {preview || "No content"}
                      </p>

                      <p className="mt-2 text-[11px] opacity-40">
                        {formatDate(
                          note.updatedAt
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-white/40">
          {isNewNote || selectedNote ? (
            <div className="flex min-h-[650px] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8cec0] px-5 py-4 sm:px-7">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-40">
                    {isNewNote
                      ? "New note"
                      : "Note"}
                  </p>

                  {!isNewNote &&
                    selectedNote && (
                      <p className="mt-1 text-xs opacity-40">
                        Last edited{" "}
                        {formatDate(
                          selectedNote.updatedAt
                        )}
                      </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  {!isNewNote &&
                    selectedNoteId && (
                      <button
                        type="button"
                        onClick={() =>
                          togglePin(
                            selectedNoteId
                          )
                        }
                        className="rounded-xl border border-[#d8cec0] px-3 py-2 text-sm font-medium transition hover:bg-[#f5f0e8]"
                      >
                        {notes.find(
                          (note) =>
                            note.id ===
                            selectedNoteId
                        )?.pinned
                          ? "📌 Unpin"
                          : "📌 Pin"}
                      </button>
                    )}

                  {!isNewNote && (
                    <button
                      type="button"
                      onClick={deleteNote}
                      className="rounded-xl border border-[#d8cec0] px-3 py-2 text-sm font-medium transition hover:bg-[#f5f0e8]"
                    >
                      Delete
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={saveNote}
                    className="rounded-xl bg-[#3f382f] px-4 py-2 text-sm font-medium text-white transition hover:opacity-85"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="px-5 pt-7 sm:px-10 sm:pt-9">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(event) => {
                    setEditingTitle(
                      event.target.value
                    );
                    setIsDirty(true);
                  }}
                  onKeyDown={
                    handleTitleKeyDown
                  }
                  placeholder="Untitled"
                  className="w-full border-0 bg-transparent text-3xl font-bold text-[#3f382f] outline-none placeholder:text-[#3f382f]/25"
                />
              </div>

              <div className="px-5 pt-5 sm:px-10">
                <div className="flex flex-wrap gap-1 rounded-xl border border-[#d8cec0] bg-[#f5f0e8]/70 p-2">
                  <button
                    type="button"
                    onClick={() =>
                      runCommand("bold")
                    }
                    className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-white"
                    title="Bold"
                  >
                    B
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      runCommand("italic")
                    }
                    className="rounded-lg px-3 py-1.5 text-sm italic hover:bg-white"
                    title="Italic"
                  >
                    I
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      runCommand("underline")
                    }
                    className="rounded-lg px-3 py-1.5 text-sm underline hover:bg-white"
                    title="Underline"
                  >
                    U
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      runCommand(
                        "strikeThrough"
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-sm line-through hover:bg-white"
                    title="Strikethrough"
                  >
                    S
                  </button>

                  <span className="mx-1 w-px bg-[#d8cec0]" />

                  <button
                    type="button"
                    onClick={() =>
                      runCommand(
                        "insertUnorderedList"
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-sm hover:bg-white"
                    title="Bullet list"
                  >
                    • List
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      runCommand(
                        "insertOrderedList"
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-sm hover:bg-white"
                    title="Numbered list"
                  >
                    1. List
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      runCommand("formatBlock")
                    }
                    className="rounded-lg px-3 py-1.5 text-sm hover:bg-white"
                    title="Quote"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                  >
                    Quote
                  </button>
                </div>
              </div>

              <div className="flex-1 px-5 pb-8 pt-3 sm:px-10">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) => {
                    setEditingContent(
                      event.currentTarget
                        .innerHTML
                    );
                    setIsDirty(true);
                  }}
                  onKeyDown={
                    handleEditorKeyDown
                  }
                  data-placeholder="Start writing..."
                  className="min-h-[440px] w-full border-0 bg-transparent text-[15px] leading-7 text-[#3f382f] outline-none empty:before:text-[#3f382f]/30 empty:before:content-[attr(data-placeholder)] [&_blockquote]:border-l-4 [&_blockquote]:border-[#b8aa98] [&_blockquote]:pl-4 [&_blockquote]:italic [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
                />
              </div>

              <div className="border-t border-[#d8cec0] px-5 py-3 text-xs opacity-40 sm:px-10">
                <div className="flex justify-between gap-3">
                  <span>
                    {isNewNote
                      ? "Unsaved note"
                      : selectedNote
                        ? `Created ${formatDate(
                            selectedNote.createdAt
                          )}`
                        : ""}
                  </span>

                  <span>
                    Ctrl + Enter to save
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[650px] items-center justify-center px-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold">
                  No note selected
                </h2>

                <p className="mt-2 text-sm opacity-50">
                  Select a note or create a new
                  one.
                </p>

                <button
                  type="button"
                  onClick={createNewNote}
                  className="mt-5 rounded-xl bg-[#3f382f] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-85"
                >
                  + New Note
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}