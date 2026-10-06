"use client";

import { useEffect, useMemo, useState } from "react";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

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

type Flashcard = {
  id: string;
  front: string;
  back: string;
  learningId?: string;
  tags: string[];
  createdAt: string;
  lastReviewedAt?: string;
  reviewCount: number;
};

type FlashcardDeck = {
  id: string;
  name: string;
  description: string;
  cards: Flashcard[];
  createdAt: string;
};

const DECKS_KEY = "life-game-flashcard-decks";
const LEARNING_KEY = "life-game-learning";

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function loadDecks(): FlashcardDeck[] {
  try {
    const saved = localStorage.getItem(DECKS_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLearning(): LearningNote[] {
  try {
    const saved = localStorage.getItem(LEARNING_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveDecks(decks: FlashcardDeck[]) {
  localStorage.setItem(
    DECKS_KEY,
    JSON.stringify(decks)
  );

  window.dispatchEvent(
    new Event("life-game-updated")
  );

  const result =
    await saveCurrentLifeGameStorage(
      DECKS_KEY
    );

  if (!result.success) {
    console.error(
      "Gagal menyimpan Flashcard ke Supabase:",
      result
    );
  }
}

export default function Flashcard() {
  const [decks, setDecks] =
    useState<FlashcardDeck[]>([]);

  const [learning, setLearning] =
    useState<LearningNote[]>([]);

  const [selectedDeckId, setSelectedDeckId] =
    useState<string | null>(null);

  const [showNewDeck, setShowNewDeck] =
    useState(false);

  const [deckName, setDeckName] =
    useState("");

  const [deckDescription, setDeckDescription] =
    useState("");

  const [showImport, setShowImport] =
    useState(false);

  const [
    selectedLearningIds,
    setSelectedLearningIds,
  ] = useState<string[]>([]);

  const [front, setFront] =
    useState("");

  const [back, setBack] =
    useState("");

  const [tags, setTags] =
    useState("");

  const [showAddCard, setShowAddCard] =
    useState(false);

  const [reviewIndex, setReviewIndex] =
    useState(0);

  const [showAnswer, setShowAnswer] =
    useState(false);

  useEffect(() => {
    setDecks(loadDecks());
    setLearning(loadLearning());

    function refresh() {
      setDecks(loadDecks());
      setLearning(loadLearning());
    }

    window.addEventListener(
      "life-game-updated",
      refresh
    );

    return () =>
      window.removeEventListener(
        "life-game-updated",
        refresh
      );
  }, []);

  const selectedDeck =
    decks.find(
      (deck) =>
        deck.id === selectedDeckId
    ) ?? null;

  const reviewCard =
    selectedDeck &&
    selectedDeck.cards.length > 0
      ? selectedDeck.cards[
          reviewIndex %
            selectedDeck.cards.length
        ]
      : null;

  const selectedLearningSet =
    useMemo(
      () =>
        new Set(selectedLearningIds),
      [selectedLearningIds]
    );

  function createDeck() {
    const name = deckName.trim();

    if (!name) return;

    const deck: FlashcardDeck = {
      id: makeId("deck"),
      name,
      description:
        deckDescription.trim(),
      cards: [],
      createdAt:
        new Date().toISOString(),
    };

    const updated = [
      ...decks,
      deck,
    ];

    saveDecks(updated);

    setDecks(updated);
    setSelectedDeckId(deck.id);
    setDeckName("");
    setDeckDescription("");
    setShowNewDeck(false);
  }

  function deleteDeck(
    deckId: string
  ) {
    const deck = decks.find(
      (item) => item.id === deckId
    );

    if (!deck) return;

    if (
      !window.confirm(
        `Hapus deck "${deck.name}"?\n\nSemua flashcard di dalamnya juga akan dihapus.`
      )
    ) {
      return;
    }

    const updated =
      decks.filter(
        (item) =>
          item.id !== deckId
      );

    saveDecks(updated);

    setDecks(updated);

    setSelectedDeckId(
      updated[0]?.id ?? null
    );
  }

  function addCard() {
    if (!selectedDeck) return;

    const cleanFront =
      front.trim();

    const cleanBack =
      back.trim();

    if (
      !cleanFront ||
      !cleanBack
    ) {
      return;
    }

    const card: Flashcard = {
      id: makeId("card"),
      front: cleanFront,
      back: cleanBack,
      tags: tags
        .split(",")
        .map((tag) =>
          tag.trim()
        )
        .filter(Boolean),
      createdAt:
        new Date().toISOString(),
      reviewCount: 0,
    };

    const updated =
      decks.map((deck) =>
        deck.id === selectedDeck.id
          ? {
              ...deck,
              cards: [
                ...deck.cards,
                card,
              ],
            }
          : deck
      );

    saveDecks(updated);

    setDecks(updated);
    setFront("");
    setBack("");
    setTags("");
    setShowAddCard(false);
  }

  function importFromLearning() {
    if (
      !selectedDeck ||
      selectedLearningIds.length ===
        0
    ) {
      return;
    }

    const selectedNotes =
      learning.filter((note) =>
        selectedLearningSet.has(
          note.id
        )
      );

    const existingLearningIds =
      new Set(
        selectedDeck.cards
          .map(
            (card) =>
              card.learningId
          )
          .filter(Boolean)
      );

    const newCards: Flashcard[] =
      selectedNotes
        .filter(
          (note) =>
            !existingLearningIds.has(
              note.id
            )
        )
        .map((note) => ({
          id: makeId("card"),
          front: note.title,
          back:
            note.summary ||
            "Belum ada summary untuk materi ini.",
          learningId: note.id,
          tags: note.tags,
          createdAt:
            new Date().toISOString(),
          reviewCount: 0,
        }));

    if (newCards.length === 0) {
      window.alert(
        "Materi yang dipilih sudah ada di deck ini."
      );

      return;
    }

    const updated =
      decks.map((deck) =>
        deck.id === selectedDeck.id
          ? {
              ...deck,
              cards: [
                ...deck.cards,
                ...newCards,
              ],
            }
          : deck
      );

    saveDecks(updated);

    setDecks(updated);
    setSelectedLearningIds([]);
    setShowImport(false);
    setReviewIndex(0);
  }

  function deleteCard(
    cardId: string
  ) {
    if (!selectedDeck) return;

    const updated =
      decks.map((deck) =>
        deck.id === selectedDeck.id
          ? {
              ...deck,
              cards:
                deck.cards.filter(
                  (card) =>
                    card.id !==
                    cardId
                ),
            }
          : deck
      );

    saveDecks(updated);

    setDecks(updated);
    setReviewIndex(0);
  }

  function reviewCardAction() {
    if (
      !selectedDeck ||
      !reviewCard
    ) {
      return;
    }

    const updated =
      decks.map((deck) =>
        deck.id === selectedDeck.id
          ? {
              ...deck,
              cards:
                deck.cards.map(
                  (card) =>
                    card.id ===
                    reviewCard.id
                      ? {
                          ...card,
                          reviewCount:
                            card.reviewCount +
                            1,
                          lastReviewedAt:
                            new Date().toISOString(),
                        }
                      : card
                ),
            }
          : deck
      );

    saveDecks(updated);

    setDecks(updated);
    setShowAnswer(false);

    setReviewIndex(
      (current) =>
        selectedDeck.cards
          .length > 0
          ? (current + 1) %
            selectedDeck.cards.length
          : 0
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Memory training
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Flashcard
            </h2>

            <p className="mt-1 text-sm opacity-50">
              Turn what you learn into something you can remember.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowNewDeck(true)
            }
            className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            + New Deck
          </button>
        </div>

        {showNewDeck && (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4">
            <input
              value={deckName}
              onChange={(event) =>
                setDeckName(
                  event.target.value
                )
              }
              placeholder="Deck name"
              className="w-full rounded-xl border border-[#cfc3b4] bg-white px-3 py-2 text-sm outline-none"
              autoFocus
            />

            <textarea
              value={deckDescription}
              onChange={(event) =>
                setDeckDescription(
                  event.target.value
                )
              }
              placeholder="Description (optional)"
              rows={2}
              className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white px-3 py-2 text-sm outline-none"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={createDeck}
                className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
              >
                Create
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowNewDeck(false)
                }
                className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-3xl bg-white/60 p-4 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-widest opacity-50">
            Decks
          </p>

          {decks.length === 0 ? (
            <p className="text-sm opacity-50">
              Belum ada deck.
            </p>
          ) : (
            <div className="space-y-2">
              {decks.map(
                (deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => {
                      setSelectedDeckId(
                        deck.id
                      );
                      setReviewIndex(0);
                      setShowAnswer(false);
                    }}
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      selectedDeckId ===
                      deck.id
                        ? "bg-[#ddd4c7]"
                        : "bg-[#f5f0e8] hover:bg-[#e9e0d5]"
                    }`}
                  >
                    <p className="font-medium">
                      {deck.name}
                    </p>

                    <p className="mt-1 text-xs opacity-50">
                      {deck.cards.length} cards
                    </p>
                  </button>
                )
              )}
            </div>
          )}
        </aside>

        <div className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          {!selectedDeck ? (
            <div className="flex min-h-[320px] items-center justify-center text-center">
              <div>
                <div className="text-4xl">
                  🧠
                </div>

                <h3 className="mt-3 text-xl font-bold">
                  Choose a deck
                </h3>

                <p className="mt-1 text-sm opacity-50">
                  Create a deck first, then start building your cards.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-50">
                    Deck
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    {selectedDeck.name}
                  </h3>

                  {selectedDeck.description && (
                    <p className="mt-1 text-sm opacity-50">
                      {selectedDeck.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowImport(true)
                    }
                    className="rounded-xl bg-[#ddd4c7] px-3 py-2 text-sm font-medium"
                  >
                    Import from Learning
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAddCard(true)
                    }
                    className="rounded-xl bg-[#8f806d] px-3 py-2 text-sm font-medium text-white"
                  >
                    + Add Card
                  </button>
                </div>
              </div>

              {showImport && (
                <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        Import from Learning
                      </p>

                      <p className="text-xs opacity-50">
                        1 materi akan menjadi 1 draft flashcard.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowImport(
                          false
                        )
                      }
                      className="text-lg opacity-50"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                    {learning.length === 0 ? (
                      <p className="text-sm opacity-50">
                        Belum ada materi di Learning.
                      </p>
                    ) : (
                      learning.map(
                        (note) => (
                          <label
                            key={note.id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLearningSet.has(
                                note.id
                              )}
                              onChange={() =>
                                setSelectedLearningIds(
                                  (current) =>
                                    current.includes(
                                      note.id
                                    )
                                      ? current.filter(
                                          (id) =>
                                            id !==
                                            note.id
                                        )
                                      : [
                                          ...current,
                                          note.id,
                                        ]
                                )
                              }
                              className="mt-1"
                            />

                            <span className="min-w-0">
                              <span className="block font-medium">
                                {note.title}
                              </span>

                              <span className="mt-1 block text-xs opacity-50">
                                {note.folder}

                                {note.tags.length >
                                0
                                  ? ` · ${note.tags.join(
                                      ", "
                                    )}`
                                  : ""}
                              </span>
                            </span>
                          </label>
                        )
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      importFromLearning
                    }
                    disabled={
                      selectedLearningIds.length ===
                      0
                    }
                    className="mt-4 rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Import{" "}
                    {selectedLearningIds.length ||
                      ""}{" "}
                    selected
                  </button>
                </div>
              )}

              {showAddCard && (
                <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4">
                  <p className="font-semibold">
                    New Flashcard
                  </p>

                  <input
                    value={front}
                    onChange={(event) =>
                      setFront(
                        event.target.value
                      )
                    }
                    placeholder="Front / Question"
                    className="mt-3 w-full rounded-xl border border-[#cfc3b4] bg-white px-3 py-2 text-sm outline-none"
                  />

                  <textarea
                    value={back}
                    onChange={(event) =>
                      setBack(
                        event.target.value
                      )
                    }
                    placeholder="Back / Answer"
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white px-3 py-2 text-sm outline-none"
                  />

                  <input
                    value={tags}
                    onChange={(event) =>
                      setTags(
                        event.target.value
                      )
                    }
                    placeholder="Tags, separated by commas"
                    className="mt-2 w-full rounded-xl border border-[#cfc3b4] bg-white px-3 py-2 text-sm outline-none"
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={addCard}
                      className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
                    >
                      Save Card
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAddCard(false)
                      }
                      className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-[#f5f0e8] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest opacity-50">
                        Review
                      </p>

                      <p className="mt-1 text-sm opacity-50">
                        {selectedDeck.cards.length} cards
                      </p>
                    </div>

                    {reviewCard && (
                      <span className="text-xs opacity-50">
                        {reviewIndex + 1} /{" "}
                        {selectedDeck.cards.length}
                      </span>
                    )}
                  </div>

                  {reviewCard ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setShowAnswer(
                            (current) =>
                              !current
                          )
                        }
                        className="mt-4 min-h-48 w-full rounded-2xl bg-white p-6 text-left shadow-sm"
                      >
                        <p className="text-xs uppercase tracking-widest opacity-40">
                          {showAnswer
                            ? "Answer"
                            : "Question"}
                        </p>

                        <p className="mt-3 text-lg font-semibold">
                          {showAnswer
                            ? reviewCard.back
                            : reviewCard.front}
                        </p>

                        <p className="mt-5 text-xs opacity-40">
                          {showAnswer
                            ? "Click to see the question"
                            : "Click to reveal the answer"}
                        </p>
                      </button>

                      {showAnswer && (
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {[
                            "Again",
                            "Hard",
                            "Good",
                            "Easy",
                          ].map(
                            (label) => (
                              <button
                                key={label}
                                type="button"
                                onClick={
                                  reviewCardAction
                                }
                                className="rounded-xl bg-white px-2 py-2 text-xs font-medium transition hover:bg-[#e9e0d5]"
                              >
                                {label}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-white p-8 text-center">
                      <p className="font-medium">
                        No cards yet.
                      </p>

                      <p className="mt-1 text-sm opacity-50">
                        Add a card or import one from Learning.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-[#f5f0e8] p-4">
                  <p className="text-xs uppercase tracking-widest opacity-50">
                    Cards
                  </p>

                  <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                    {selectedDeck.cards.length ===
                    0 ? (
                      <p className="text-sm opacity-50">
                        Deck ini masih kosong.
                      </p>
                    ) : (
                      selectedDeck.cards.map(
                        (card, index) => (
                          <div
                            key={card.id}
                            className="rounded-xl bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs opacity-40">
                                  Card{" "}
                                  {index + 1}
                                  {card.learningId
                                    ? " · from Learning"
                                    : ""}
                                </p>

                                <p className="mt-1 font-medium">
                                  {card.front}
                                </p>

                                <p className="mt-1 text-sm opacity-60">
                                  {card.back}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteCard(
                                    card.id
                                  )
                                }
                                className="shrink-0 rounded-lg px-2 py-1 text-lg opacity-30 hover:bg-[#e9e0d5] hover:opacity-100"
                                aria-label="Delete card"
                              >
                                ×
                              </button>
                            </div>

                            {card.tags.length >
                              0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {card.tags.map(
                                  (tag) => (
                                    <span
                                      key={
                                        tag
                                      }
                                      className="rounded-full bg-[#eee7dc] px-2 py-1 text-[11px] opacity-70"
                                    >
                                      {tag}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-[#d8cec0] pt-4">
                <button
                  type="button"
                  onClick={() =>
                    deleteDeck(
                      selectedDeck.id
                    )
                  }
                  className="rounded-xl border border-[#cfc3b4] px-3 py-2 text-sm opacity-60 transition hover:bg-[#f5f0e8] hover:opacity-100"
                >
                  Delete Deck
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}