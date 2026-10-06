"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Person = {
  id: string;
  name: string;
  birth_date: string | null;
  mbti: string | null;
  characteristics: string | null;
  tags: string | null;
  relationship: string | null;
  is_favorite: boolean;
  likes: string | null;
  dislikes: string | null;
  notes: string | null;
};

type PersonMoment = {
  id: string;
  person_id: string;
  moment_date: string;
  title: string;
  description: string | null;
  tags: string | null;
};

type PersonArchiveProps = {
  personId: string;
  onBack: () => void;
};

const RELATIONSHIP_TYPES = [
  "Friend",
  "Best Friend",
  "Classmate",
  "Family",
  "Partner",
  "Acquaintance",
  "Other",
];

function getZodiac(birthDate: string | null) {
  if (!birthDate) return null;

  const [, monthString, dayString] = birthDate.split("-");
  const month = Number(monthString);
  const day = Number(dayString);

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return "Aries";
  }

  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return "Taurus";
  }

  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return "Gemini";
  }

  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return "Cancer";
  }

  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return "Leo";
  }

  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return "Virgo";
  }

  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return "Libra";
  }

  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return "Scorpio";
  }

  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return "Sagittarius";
  }

  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return "Capricorn";
  }

  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return "Aquarius";
  }

  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
    return "Pisces";
  }

  return null;
}

function getZodiacSymbol(zodiac: string | null) {
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

  return zodiac ? symbols[zodiac] ?? "" : "";
}

function getLifePathNumber(birthDate: string | null) {
  if (!birthDate) return null;

  const digits = birthDate
    .replace(/\D/g, "")
    .split("")
    .map(Number);

  if (digits.length !== 8) return null;

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
        (sum, digit) => sum + Number(digit),
        0
      );
  }

  return total;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function inputClassName() {
  return "mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]";
}

export default function PersonArchive({
  personId,
  onBack,
}: PersonArchiveProps) {
  const [person, setPerson] =
    useState<Person | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [relationship, setRelationship] =
    useState("");

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [editingRelationship, setEditingRelationship] =
    useState(false);

  const [savingRelationship, setSavingRelationship] =
    useState(false);

  const [relationshipSaved, setRelationshipSaved] =
    useState(false);

  const [likes, setLikes] =
    useState("");

  const [dislikes, setDislikes] =
    useState("");

  const [editingLikes, setEditingLikes] =
    useState(false);

  const [savingLikes, setSavingLikes] =
    useState(false);

  const [likesSaved, setLikesSaved] =
    useState(false);

  const [notes, setNotes] =
    useState("");

  const [editingNotes, setEditingNotes] =
    useState(false);

  const [savingNotes, setSavingNotes] =
    useState(false);

  const [notesSaved, setNotesSaved] =
    useState(false);

  const [moments, setMoments] =
    useState<PersonMoment[]>([]);

  const [loadingMoments, setLoadingMoments] =
    useState(true);

  const [showMomentForm, setShowMomentForm] =
    useState(false);

  const [editingMomentId, setEditingMomentId] =
    useState<string | null>(null);

  const [momentDate, setMomentDate] =
    useState("");

  const [momentTitle, setMomentTitle] =
    useState("");

  const [momentDescription, setMomentDescription] =
    useState("");

  const [momentTags, setMomentTags] =
    useState("");

  const [savingMoment, setSavingMoment] =
    useState(false);

  const [deletingMomentId, setDeletingMomentId] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadPerson() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "PERSON ARCHIVE: USER ERROR",
          userError
        );

        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("people")
        .select(
          "id, name, birth_date, mbti, characteristics, tags, relationship, is_favorite, likes, dislikes, notes"
        )
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(
          "PERSON ARCHIVE: LOAD ERROR",
          error
        );

        setLoading(false);
        return;
      }

      setPerson(data);

      setRelationship(
        data.relationship ?? ""
      );

      setIsFavorite(
        data.is_favorite ?? false
      );

      setLikes(data.likes ?? "");
      setDislikes(data.dislikes ?? "");

      setNotes(data.notes ?? "");

      setLoading(false);
    }

    void loadPerson();
  }, [personId]);

  useEffect(() => {
    async function loadMoments() {
      setLoadingMoments(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "PERSON MOMENTS: USER ERROR",
          userError
        );

        setLoadingMoments(false);
        return;
      }

      const { data, error } = await supabase
        .from("person_moments")
        .select(
          "id, person_id, moment_date, title, description, tags"
        )
        .eq("person_id", personId)
        .eq("user_id", user.id)
        .order("moment_date", {
          ascending: false,
        });

      if (error) {
        console.error(
          "PERSON MOMENTS: LOAD ERROR",
          error
        );

        setLoadingMoments(false);
        return;
      }

      setMoments(data ?? []);
      setLoadingMoments(false);
    }

    void loadMoments();
  }, [personId]);

  async function saveRelationship() {
    if (!person) return;

    setSavingRelationship(true);
    setRelationshipSaved(false);

    try {
      const supabase = createClient();

      const cleanRelationship =
        relationship.trim() || null;

      const { error } = await supabase
        .from("people")
        .update({
          relationship: cleanRelationship,
          is_favorite: isFavorite,
          updated_at: new Date().toISOString(),
        })
        .eq("id", person.id);

      if (error) {
        console.error(
          "PERSON ARCHIVE: RELATIONSHIP SAVE ERROR",
          error
        );

        return;
      }

      setPerson((current) =>
        current
          ? {
              ...current,
              relationship:
                cleanRelationship,
              is_favorite: isFavorite,
            }
          : current
      );

      setEditingRelationship(false);
      setRelationshipSaved(true);

      window.setTimeout(
        () => setRelationshipSaved(false),
        2500
      );
    } finally {
      setSavingRelationship(false);
    }
  }

  async function saveLikesDislikes() {
    if (!person) return;

    setSavingLikes(true);
    setLikesSaved(false);

    try {
      const supabase = createClient();

      const cleanLikes =
        likes.trim() || null;

      const cleanDislikes =
        dislikes.trim() || null;

      const { error } = await supabase
        .from("people")
        .update({
          likes: cleanLikes,
          dislikes: cleanDislikes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", person.id);

      if (error) {
        console.error(
          "PERSON ARCHIVE: LIKES SAVE ERROR",
          error
        );

        return;
      }

      setPerson((current) =>
        current
          ? {
              ...current,
              likes: cleanLikes,
              dislikes: cleanDislikes,
            }
          : current
      );

      setEditingLikes(false);
      setLikesSaved(true);

      window.setTimeout(
        () => setLikesSaved(false),
        2500
      );
    } finally {
      setSavingLikes(false);
    }
  }

  async function saveNotes() {
    if (!person) return;

    setSavingNotes(true);
    setNotesSaved(false);

    try {
      const supabase = createClient();

      const cleanNotes =
        notes.trim() || null;

      const { error } = await supabase
        .from("people")
        .update({
          notes: cleanNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", person.id);

      if (error) {
        console.error(
          "PERSON ARCHIVE: NOTES SAVE ERROR",
          error
        );

        return;
      }

      setPerson((current) =>
        current
          ? {
              ...current,
              notes: cleanNotes,
            }
          : current
      );

      setEditingNotes(false);
      setNotesSaved(true);

      window.setTimeout(
        () => setNotesSaved(false),
        2500
      );
    } finally {
      setSavingNotes(false);
    }
  }

  function resetMomentForm() {
    setMomentDate("");
    setMomentTitle("");
    setMomentDescription("");
    setMomentTags("");
    setEditingMomentId(null);
    setShowMomentForm(false);
  }

  function openNewMoment() {
    setMomentDate(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

    setMomentTitle("");
    setMomentDescription("");
    setMomentTags("");
    setEditingMomentId(null);
    setShowMomentForm(true);
  }

  function openEditMoment(
    moment: PersonMoment
  ) {
    setMomentDate(moment.moment_date);
    setMomentTitle(moment.title);
    setMomentDescription(
      moment.description ?? ""
    );
    setMomentTags(moment.tags ?? "");
    setEditingMomentId(moment.id);
    setShowMomentForm(true);
  }

  async function saveMoment() {
    if (
      !person ||
      !momentDate ||
      !momentTitle.trim()
    ) {
      return;
    }

    setSavingMoment(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "PERSON MOMENTS: USER ERROR",
          userError
        );

        return;
      }

      const payload = {
        person_id: person.id,
        user_id: user.id,
        moment_date: momentDate,
        title: momentTitle.trim(),
        description:
          momentDescription.trim() || null,
        tags:
          momentTags.trim() || null,
        updated_at:
          new Date().toISOString(),
      };

      if (editingMomentId) {
        const {
          data,
          error,
        } = await supabase
          .from("person_moments")
          .update(payload)
          .eq("id", editingMomentId)
          .eq("user_id", user.id)
          .select(
            "id, person_id, moment_date, title, description, tags"
          )
          .single();

        if (error) {
          console.error(
            "PERSON MOMENTS: UPDATE ERROR",
            error
          );

          return;
        }

        setMoments((current) =>
          current
            .map((moment) =>
              moment.id === editingMomentId
                ? data
                : moment
            )
            .sort((a, b) =>
              b.moment_date.localeCompare(
                a.moment_date
              )
            )
        );
      } else {
        const {
          data,
          error,
        } = await supabase
          .from("person_moments")
          .insert(payload)
          .select(
            "id, person_id, moment_date, title, description, tags"
          )
          .single();

        if (error) {
          console.error(
            "PERSON MOMENTS: INSERT ERROR",
            error
          );

          return;
        }

        setMoments((current) =>
          [...current, data].sort(
            (a, b) =>
              b.moment_date.localeCompare(
                a.moment_date
              )
          )
        );
      }

      resetMomentForm();
    } finally {
      setSavingMoment(false);
    }
  }

  async function deleteMoment(
    momentId: string
  ) {
    if (
      !window.confirm(
        "Delete this moment?"
      )
    ) {
      return;
    }

    setDeletingMomentId(momentId);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("person_moments")
        .delete()
        .eq("id", momentId)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "PERSON MOMENTS: DELETE ERROR",
          error
        );

        return;
      }

      setMoments((current) =>
        current.filter(
          (moment) =>
            moment.id !== momentId
        )
      );
    } finally {
      setDeletingMomentId(null);
    }
  }

  if (loading) {
    return (
      <section>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm font-medium text-[#746a5e] transition hover:text-[#3f382f]"
        >
          ← Back to People
        </button>

        <div className="rounded-2xl bg-[#f7f2ea] p-8 shadow-sm">
          <p className="text-sm text-[#746a5e]">
            Loading person archive...
          </p>
        </div>
      </section>
    );
  }

  if (!person) {
    return (
      <section>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm font-medium text-[#746a5e] transition hover:text-[#3f382f]"
        >
          ← Back to People
        </button>

        <div className="rounded-2xl border border-dashed border-[#d8cec0] bg-[#eee7dc] p-8 text-center">
          <div className="text-4xl">
            👤
          </div>

          <h2 className="mt-4 text-xl font-bold text-[#3f382f]">
            Person not found.
          </h2>

          <p className="mt-2 text-sm text-[#746a5e]">
            This person could not be
            loaded from your archive.
          </p>
        </div>
      </section>
    );
  }

  const zodiac =
    getZodiac(person.birth_date);

  const zodiacSymbol =
    getZodiacSymbol(zodiac);

  const lifePathNumber =
    getLifePathNumber(
      person.birth_date
    );

  const hasLikesDislikes =
    Boolean(person.likes) ||
    Boolean(person.dislikes);

  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#746a5e] transition hover:text-[#3f382f]"
      >
        ← Back to People
      </button>

      {/* HEADER */}

      <div className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#ebe3d8] text-4xl">
            👤
          </div>

          <div className="mt-5 sm:ml-6 sm:mt-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Person Archive
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#3f382f]">
              {person.name}
            </h2>

            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {person.relationship && (
                <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs font-medium text-[#8b6f5a]">
                  {person.relationship}
                </span>
              )}

              {person.is_favorite && (
                <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]">
                  ⭐ Important
                </span>
              )}

              {person.mbti && (
                <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#8b6f5a]">
                  {person.mbti}
                </span>
              )}

              {zodiac && (
                <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]">
                  {zodiacSymbol} {zodiac}
                </span>
              )}

              {lifePathNumber !== null && (
                <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]">
                  🔢 Life Path{" "}
                  {lifePathNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BASIC INFORMATION */}

      <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          Basic Information
        </p>

        <h3 className="mt-2 text-xl font-bold text-[#3f382f]">
          About {person.name}
        </h3>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoCard
            label="Birth date"
            value={formatDate(
              person.birth_date
            )}
            icon="🎂"
          />

          <InfoCard
            label="Zodiac"
            value={
              zodiac
                ? `${zodiacSymbol} ${zodiac}`
                : "-"
            }
            icon="✨"
          />

          <InfoCard
            label="Life Path"
            value={
              lifePathNumber !== null
                ? String(lifePathNumber)
                : "-"
            }
            icon="🔢"
          />

          <InfoCard
            label="MBTI"
            value={person.mbti || "-"}
            icon="🧠"
          />

          <InfoCard
            label="Characteristics"
            value={
              person.characteristics ||
              "-"
            }
            icon="🌿"
          />
        </div>

        {person.tags && (
          <div className="mt-4 rounded-xl bg-[#ebe3d8] px-4 py-4">
            <p className="text-xs text-[#746a5e]">
              Tags
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {person.tags
                .split(",")
                .map((tag) =>
                  tag.trim()
                )
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#f7f2ea] px-3 py-1 text-xs text-[#746a5e]"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* RELATIONSHIP */}

      <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Relationship
            </p>

            <h3 className="mt-2 text-xl font-bold text-[#3f382f]">
              Connection
            </h3>
          </div>

          {!editingRelationship && (
            <button
              type="button"
              onClick={() =>
                setEditingRelationship(
                  true
                )
              }
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#ebe3d8]"
            >
              Edit
            </button>
          )}
        </div>

        {!editingRelationship &&
        (person.relationship ||
          person.is_favorite) ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {person.relationship && (
              <span className="rounded-full bg-[#ebe3d8] px-3 py-1.5 text-xs font-medium text-[#8b6f5a]">
                {person.relationship}
              </span>
            )}

            {person.is_favorite && (
              <span className="rounded-full bg-[#ebe3d8] px-3 py-1.5 text-xs text-[#746a5e]">
                ⭐ Important
              </span>
            )}
          </div>
        ) : !editingRelationship ? (
          <div className="mt-4">
            <p className="text-sm text-[#746a5e]">
              No relationship details yet.
            </p>

            <button
              type="button"
              onClick={() =>
                setEditingRelationship(
                  true
                )
              }
              className="mt-3 text-sm font-medium text-[#8b6f5a] hover:underline"
            >
              + Add relationship
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <label className="text-sm font-medium text-[#3f382f]">
              Relationship
            </label>

            <select
              value={relationship}
              onChange={(event) =>
                setRelationship(
                  event.target.value
                )
              }
              className={inputClassName()}
            >
              <option value="">
                Select relationship
              </option>

              {RELATIONSHIP_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={() =>
                setIsFavorite(
                  (current) => !current
                )
              }
              className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                isFavorite
                  ? "border-[#b9a48e] bg-[#ebe3d8]"
                  : "border-[#d8cec0] bg-[#f7f2ea] hover:bg-[#ebe3d8]"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-[#3f382f]">
                  Important person
                </p>

                <p className="mt-1 text-xs text-[#746a5e]">
                  Mark this person as
                  especially important.
                </p>
              </div>

              <span
                className={`text-xl ${
                  isFavorite
                    ? "opacity-100"
                    : "opacity-30"
                }`}
              >
                ⭐
              </span>
            </button>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRelationship(
                    person.relationship ??
                      ""
                  );

                  setIsFavorite(
                    person.is_favorite
                  );

                  setEditingRelationship(
                    false
                  );
                }}
                disabled={
                  savingRelationship
                }
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveRelationship
                }
                disabled={
                  savingRelationship
                }
                className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingRelationship
                  ? "Saving..."
                  : "Save"}
              </button>
            </div>

            {relationshipSaved && (
              <p className="mt-3 text-right text-xs text-[#7c8b68]">
                ✓ Relationship saved
              </p>
            )}
          </div>
        )}
      </section>

      {/* LIKES & DISLIKES */}

      <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Likes & Dislikes
            </p>

            <h3 className="mt-2 text-xl font-bold text-[#3f382f]">
              Things they like
            </h3>
          </div>

          {!editingLikes &&
            hasLikesDislikes && (
              <button
                type="button"
                onClick={() =>
                  setEditingLikes(true)
                }
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#ebe3d8]"
              >
                Edit
              </button>
            )}
        </div>

        {!editingLikes &&
        hasLikesDislikes ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {person.likes && (
              <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                <p className="text-xs text-[#746a5e]">
                  Likes
                </p>

                <p className="mt-1 text-sm leading-6 text-[#3f382f]">
                  {person.likes}
                </p>
              </div>
            )}

            {person.dislikes && (
              <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                <p className="text-xs text-[#746a5e]">
                  Dislikes
                </p>

                <p className="mt-1 text-sm leading-6 text-[#3f382f]">
                  {person.dislikes}
                </p>
              </div>
            )}
          </div>
        ) : !editingLikes ? (
          <div className="mt-4">
            <p className="text-sm text-[#746a5e]">
              No likes or dislikes
              recorded yet.
            </p>

            <button
              type="button"
              onClick={() =>
                setEditingLikes(true)
              }
              className="mt-3 text-sm font-medium text-[#8b6f5a] hover:underline"
            >
              + Add details
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Likes
              </label>

              <textarea
                value={likes}
                onChange={(event) =>
                  setLikes(
                    event.target.value
                  )
                }
                placeholder="Music, coffee, cats, movies..."
                rows={3}
                className={inputClassName()}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Dislikes
              </label>

              <textarea
                value={dislikes}
                onChange={(event) =>
                  setDislikes(
                    event.target.value
                  )
                }
                placeholder="Crowded places, spicy food..."
                rows={3}
                className={inputClassName()}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setLikes(
                    person.likes ?? ""
                  );

                  setDislikes(
                    person.dislikes ?? ""
                  );

                  setEditingLikes(false);
                }}
                disabled={savingLikes}
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveLikesDislikes
                }
                disabled={savingLikes}
                className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingLikes
                  ? "Saving..."
                  : "Save"}
              </button>
            </div>

            {likesSaved && (
              <p className="text-right text-xs text-[#7c8b68]">
                ✓ Likes & dislikes
                saved
              </p>
            )}
          </div>
        )}
      </section>

      {/* NOTES */}

      <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Notes
            </p>

            <h3 className="mt-2 text-xl font-bold text-[#3f382f]">
              Things to remember
            </h3>
          </div>

          {!editingNotes &&
            person.notes && (
              <button
                type="button"
                onClick={() =>
                  setEditingNotes(true)
                }
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#ebe3d8]"
              >
                Edit
              </button>
            )}
        </div>

        {!editingNotes &&
        person.notes ? (
          <div className="mt-5 rounded-xl bg-[#ebe3d8] px-4 py-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
              {person.notes}
            </p>
          </div>
        ) : !editingNotes ? (
          <div className="mt-4">
            <p className="text-sm text-[#746a5e]">
              No notes about this person
              yet.
            </p>

            <button
              type="button"
              onClick={() =>
                setEditingNotes(true)
              }
              className="mt-3 text-sm font-medium text-[#8b6f5a] hover:underline"
            >
              + Add notes
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Things you want to remember about them..."
              rows={6}
              className="w-full resize-y rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm leading-6 text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setNotes(
                    person.notes ?? ""
                  );

                  setEditingNotes(false);
                }}
                disabled={savingNotes}
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes}
                className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingNotes
                  ? "Saving..."
                  : "Save"}
              </button>
            </div>

            {notesSaved && (
              <p className="mt-3 text-right text-xs text-[#7c8b68]">
                ✓ Notes saved
              </p>
            )}
          </div>
        )}
      </section>

      {/* MOMENTS / TIMELINE */}

      <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Moments / Timeline
            </p>

            <h3 className="mt-2 text-xl font-bold text-[#3f382f]">
              Your moments together
            </h3>
          </div>

          {!showMomentForm && (
            <button
              type="button"
              onClick={openNewMoment}
              className="shrink-0 rounded-xl bg-[#8b6f5a] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#765a46]"
            >
              + Add Moment
            </button>
          )}
        </div>

        {showMomentForm && (
          <div className="mt-5 rounded-xl border border-[#d8cec0] bg-[#ebe3d8] p-5">
            <p className="text-sm font-semibold text-[#3f382f]">
              {editingMomentId
                ? "Edit moment"
                : "New moment"}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#746a5e]">
                  Date
                </label>

                <input
                  type="date"
                  value={momentDate}
                  onChange={(event) =>
                    setMomentDate(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#746a5e]">
                  Title
                </label>

                <input
                  type="text"
                  value={momentTitle}
                  onChange={(event) =>
                    setMomentTitle(
                      event.target.value
                    )
                  }
                  placeholder="First met..."
                  className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-[#746a5e]">
                Description
              </label>

              <textarea
                value={momentDescription}
                onChange={(event) =>
                  setMomentDescription(
                    event.target.value
                  )
                }
                placeholder="What happened?"
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm leading-6 text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-[#746a5e]">
                Tags
              </label>

              <input
                type="text"
                value={momentTags}
                onChange={(event) =>
                  setMomentTags(
                    event.target.value
                  )
                }
                placeholder="school, trip, birthday..."
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={
                  resetMomentForm
                }
                disabled={savingMoment}
                className="rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveMoment}
                disabled={
                  savingMoment ||
                  !momentDate ||
                  !momentTitle.trim()
                }
                className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingMoment
                  ? "Saving..."
                  : editingMomentId
                  ? "Save Changes"
                  : "Save Moment"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5">
          {loadingMoments ? (
            <p className="text-sm text-[#746a5e]">
              Loading moments...
            </p>
          ) : moments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8cec0] bg-[#eee7dc] px-5 py-6 text-center">
              <div className="text-3xl">
                🕰️
              </div>

              <p className="mt-3 text-sm font-medium text-[#3f382f]">
                No moments recorded
                yet.
              </p>

              <p className="mt-1 text-xs leading-5 text-[#746a5e]">
                Add an important memory
                or moment you shared with{" "}
                {person.name}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {moments.map(
                (moment) => (
                  <article
                    key={moment.id}
                    className="rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#8b6f5a]">
                          {formatDate(
                            moment.moment_date
                          )}
                        </p>

                        <h4 className="mt-1 text-base font-semibold text-[#3f382f]">
                          {moment.title}
                        </h4>

                        {moment.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#746a5e]">
                            {
                              moment.description
                            }
                          </p>
                        )}

                        {moment.tags && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {moment.tags
                              .split(",")
                              .map((tag) =>
                                tag.trim()
                              )
                              .filter(
                                Boolean
                              )
                              .map(
                                (tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-[#f7f2ea] px-2.5 py-1 text-[11px] text-[#746a5e]"
                                  >
                                    {tag}
                                  </span>
                                )
                              )}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEditMoment(
                              moment
                            )
                          }
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#f7f2ea]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteMoment(
                              moment.id
                            )
                          }
                          disabled={
                            deletingMomentId ===
                            moment.id
                          }
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#9a6f65] transition hover:bg-[#f7f2ea] disabled:opacity-50"
                        >
                          {deletingMomentId ===
                          moment.id
                            ? "..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="text-lg">
          {icon}
        </span>

        <div className="min-w-0">
          <p className="text-xs text-[#746a5e]">
            {label}
          </p>

          <p className="mt-1 text-sm font-medium leading-5 text-[#3f382f]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}