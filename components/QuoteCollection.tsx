
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type QuoteType = "media" | "book";

type Quote = {
  id: string;
  user_id: string;
  source_title: string;
  quote: string;
  character_name?: string | null;
  episode?: string | null;
  timestamp_note?: string | null;
  author?: string | null;
  page_number?: string | null;
  personal_note?: string | null;
  tags?: string[] | null;
  created_at: string;
};

type QuoteCollectionProps = {
  type: QuoteType;
  onBack: () => void;
};

const inputClass =
  "w-full rounded-xl border border-[#d8cec0] bg-white/70 px-3 py-2.5 text-sm text-[#3f382f] outline-none placeholder:text-[#a59a8b] focus:border-[#8f806d]";

export default function QuoteCollection({
  type,
  onBack,
}: QuoteCollectionProps) {
  const table = type === "media" ? "media_quotes" : "book_quotes";
  const isMedia = type === "media";

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sourceTitle, setSourceTitle] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [episode, setEpisode] = useState("");
  const [timestampNote, setTimestampNote] = useState("");
  const [author, setAuthor] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [tagsText, setTagsText] = useState("");

  const supabase = createClient();

  const resetForm = useCallback(() => {
    setEditingId(null);
    setSourceTitle("");
    setQuoteText("");
    setCharacterName("");
    setEpisode("");
    setTimestampNote("");
    setAuthor("");
    setPageNumber("");
    setPersonalNote("");
    setTagsText("");
  }, []);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setQuotes([]);
        setError("Please log in to access your quotes.");
        return;
      }

      const { data, error: queryError } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setQuotes((data ?? []) as Quote[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load quotes."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, table]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  function startEditing(item: Quote) {
    setEditingId(item.id);
    setSourceTitle(item.source_title);
    setQuoteText(item.quote);
    setCharacterName(item.character_name ?? "");
    setEpisode(item.episode ?? "");
    setTimestampNote(item.timestamp_note ?? "");
    setAuthor(item.author ?? "");
    setPageNumber(item.page_number ?? "");
    setPersonalNote(item.personal_note ?? "");
    setTagsText((item.tags ?? []).join(", "));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!sourceTitle.trim() || !quoteText.trim()) {
      setError("Source title and quote are required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      const common = {
        source_title: sourceTitle.trim(),
        quote: quoteText.trim(),
        personal_note: personalNote.trim() || null,
        tags: tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const payload = isMedia
        ? {
            ...common,
            character_name: characterName.trim() || null,
            episode: episode.trim() || null,
            timestamp_note: timestampNote.trim() || null,
          }
        : {
            ...common,
            author: author.trim() || null,
            page_number: pageNumber.trim() || null,
          };

      if (editingId) {
        const { error: updateError } = await supabase
          .from(table)
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from(table)
          .insert({
            ...payload,
            user_id: user.id,
          });

        if (insertError) throw insertError;
      }

      resetForm();
      await loadQuotes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save quote."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this quote permanently?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      if (editingId === id) resetForm();

      await loadQuotes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete quote."
      );
    }
  }

  const normalizedSearch = search.trim().toLowerCase();

  const filteredQuotes = quotes.filter((item) => {
    const searchable = [
      item.source_title,
      item.quote,
      item.character_name,
      item.episode,
      item.author,
      item.page_number,
      item.personal_note,
      ...(item.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm text-[#817362] hover:text-[#3f382f]"
        >
          ← Back to Archive
        </button>

        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          Archive / {isMedia ? "Movies & Series" : "Books"}
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#3f382f]">
          {isMedia ? "Lines worth remembering." : "Words worth keeping."}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746a5e]">
          {isMedia
            ? "Save the dialogue that stayed with you, the character who said it, and why it matters."
            : "Keep the passages that moved you, the words you want to revisit, and your own reflections."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#746a5e]">
          <span className="rounded-full bg-[#ebe3d8] px-3 py-1.5">
            {quotes.length} saved {quotes.length === 1 ? "quote" : "quotes"}
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] p-5 shadow-sm sm:p-6"
      >
        <div>
          <h3 className="text-lg font-semibold text-[#3f382f]">
            {editingId ? "Edit quote" : "Save a new quote"}
          </h3>
          <p className="mt-1 text-sm text-[#746a5e]">
            Fields marked with * are required.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {isMedia ? "Movie or series title *" : "Book or novel title *"}
          </label>
          <input
            className={inputClass}
            value={sourceTitle}
            onChange={(e) => setSourceTitle(e.target.value)}
            placeholder={isMedia ? "e.g. Interstellar" : "e.g. The Little Prince"}
            maxLength={200}
            required
          />
        </div>

        {!isMedia && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Author
            </label>
            <input
              className={inputClass}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author's name"
              maxLength={200}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Quote *
          </label>
          <textarea
            className={inputClass}
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            placeholder="Write the words you want to remember..."
            rows={4}
            maxLength={10000}
            required
          />
        </div>

        {isMedia ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Character
              </label>
              <input
                className={inputClass}
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Who said it?"
                maxLength={200}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Episode
              </label>
              <input
                className={inputClass}
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
                placeholder="e.g. Season 2, Episode 4"
                maxLength={200}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Timestamp (optional)
              </label>
              <input
                className={inputClass}
                value={timestampNote}
                onChange={(e) => setTimestampNote(e.target.value)}
                placeholder="e.g. 01:24:35"
                maxLength={100}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Page number
            </label>
            <input
              className={inputClass}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="e.g. 42 or Chapter 3"
              maxLength={100}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Personal reflection
          </label>
          <textarea
            className={inputClass}
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
            placeholder="Why does this quote matter to you?"
            rows={3}
            maxLength={5000}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Tags
          </label>
          <input
            className={inputClass}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="love, identity, healing (separate with commas)"
            maxLength={500}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#766854] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Save changes"
                : "Save quote"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-[#d8cec0] px-5 py-2.5 text-sm hover:bg-[#eee7dc]"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#3f382f]">
              Your collection
            </h3>
            <p className="text-sm text-[#746a5e]">
              Quotes saved to your personal archive.
            </p>
          </div>

          <input
            className={`${inputClass} sm:max-w-xs`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes, titles, tags..."
            aria-label="Search quotes"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[#f7f2ea] p-8 text-center text-sm text-[#746a5e]">
            Loading your quotes...
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8cec0] bg-[#f7f2ea] p-8 text-center">
            <p className="text-3xl">{isMedia ? "🎬" : "📚"}</p>
            <h4 className="mt-3 font-semibold text-[#3f382f]">
              {search ? "No matching quotes" : "Your collection starts here"}
            </h4>
            <p className="mt-1 text-sm text-[#746a5e]">
              {search
                ? "Try another title, phrase, author, or tag."
                : "Save a quote above whenever a line stays with you."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredQuotes.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] p-5 shadow-sm"
              >
                <p className="whitespace-pre-wrap font-serif text-lg leading-7 text-[#3f382f]">
                  “{item.quote}”
                </p>

                <div className="mt-4 border-l-2 border-[#c9bba8] pl-3">
                  <p className="font-semibold text-[#594b3b]">
                    {item.source_title}
                  </p>

                  {isMedia && item.character_name && (
                    <p className="mt-1 text-sm text-[#746a5e]">
                      {item.character_name}
                    </p>
                  )}

                  {!isMedia && item.author && (
                    <p className="mt-1 text-sm text-[#746a5e]">
                      By {item.author}
                    </p>
                  )}

                  {isMedia && (item.episode || item.timestamp_note) && (
                    <p className="mt-1 text-xs text-[#8a7e70]">
                      {[item.episode, item.timestamp_note]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  {!isMedia && item.page_number && (
                    <p className="mt-1 text-xs text-[#8a7e70]">
                      Page: {item.page_number}
                    </p>
                  )}
                </div>

                {item.personal_note && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#746a5e]">
                    {item.personal_note}
                  </p>
                )}

                {!!item.tags?.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag, index) => (
                      <span
                        key={`${item.id}-${tag}-${index}`}
                        className="rounded-full bg-[#ebe3d8] px-2.5 py-1 text-xs text-[#746a5e]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e3d9cd] pt-3">
                  <p className="text-xs text-[#a09485]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      className="rounded-lg px-3 py-1.5 text-sm text-[#746a5e] hover:bg-[#ebe3d8]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
