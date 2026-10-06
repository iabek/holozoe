"use client";

import { useEffect, useRef, useState } from "react";
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

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
    return "Aries";

  if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
    return "Taurus";

  if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
    return "Gemini";

  if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
    return "Cancer";

  if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
    return "Leo";

  if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
    return "Virgo";

  if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
    return "Libra";

  if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
    return "Scorpio";

  if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
    return "Sagittarius";

  if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
    return "Capricorn";

  if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
    return "Aquarius";

  if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
    return "Pisces";

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

function formatBirthDate(date: string | null) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMomentDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
        <span className="text-xl">{icon}</span>

        <div className="min-w-0">
          <p className="text-xs text-[#746a5e]">{label}</p>

          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#3f382f]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SaveStatus({
  saving,
  saved,
}: {
  saving: boolean;
  saved: boolean;
}) {
  if (!saving && !saved) return null;

  return (
    <span className="text-xs text-[#7c8b68]">
      {saving ? "Saving..." : "✓ Saved"}
    </span>
  );
}

export default function PersonArchive({
  personId,
  onBack,
}: PersonArchiveProps) {
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // BASIC INFORMATION
  // =========================

  const [editingBasicInfo, setEditingBasicInfo] = useState(false);

  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editMbti, setEditMbti] = useState("");
  const [editCharacteristics, setEditCharacteristics] = useState("");
  const [editTags, setEditTags] = useState("");

  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [basicInfoSaved, setBasicInfoSaved] = useState(false);

  // =========================
  // RELATIONSHIP
  // =========================

  const [relationship, setRelationship] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const [editingRelationship, setEditingRelationship] =
    useState(false);

  const [savingRelationship, setSavingRelationship] =
    useState(false);

  const [relationshipSaved, setRelationshipSaved] =
    useState(false);

  // =========================
  // LIKES / DISLIKES
  // =========================

  const [likes, setLikes] = useState("");
  const [dislikes, setDislikes] = useState("");

  const [editingLikes, setEditingLikes] = useState(false);

  const [savingLikes, setSavingLikes] = useState(false);
  const [likesSaved, setLikesSaved] = useState(false);

  // =========================
  // NOTES
  // =========================

  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // =========================
  // MOMENTS
  // =========================

  const [moments, setMoments] = useState<PersonMoment[]>([]);
  const [loadingMoments, setLoadingMoments] = useState(true);

  const [showMomentForm, setShowMomentForm] = useState(false);
  const [editingMomentId, setEditingMomentId] =
    useState<string | null>(null);

  const [momentDate, setMomentDate] = useState("");
  const [momentTitle, setMomentTitle] = useState("");
  const [momentDescription, setMomentDescription] =
    useState("");
  const [momentTags, setMomentTags] = useState("");

  const [savingMoment, setSavingMoment] = useState(false);
  const [momentSaved, setMomentSaved] = useState(false);

  const [deletingMomentId, setDeletingMomentId] =
    useState<string | null>(null);

  // Prevent autosave from running during initial loading.
  const initialBasicInfoLoaded = useRef(false);
  const initialRelationshipLoaded = useRef(false);
  const initialLikesLoaded = useRef(false);
  const initialNotesLoaded = useRef(false);
  const initialMomentLoaded = useRef(false);

  // Prevent simultaneous moment creation.
  const creatingMomentRef = useRef(false);

  // =========================
  // LOAD PERSON
  // =========================

  useEffect(() => {
    async function loadPerson() {
      setLoading(true);

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

      // Basic info
      setEditName(data.name ?? "");
      setEditBirthDate(data.birth_date ?? "");
      setEditMbti(data.mbti ?? "");
      setEditCharacteristics(data.characteristics ?? "");
      setEditTags(data.tags ?? "");

      // Relationship
      setRelationship(data.relationship ?? "");
      setIsFavorite(data.is_favorite ?? false);

      // Likes / dislikes
      setLikes(data.likes ?? "");
      setDislikes(data.dislikes ?? "");

      // Notes
      setNotes(data.notes ?? "");

      initialBasicInfoLoaded.current = true;
      initialRelationshipLoaded.current = true;
      initialLikesLoaded.current = true;
      initialNotesLoaded.current = true;

      setLoading(false);
    }

    void loadPerson();
  }, [personId]);

  // =========================
  // LOAD MOMENTS
  // =========================

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
      initialMomentLoaded.current = true;
      setLoadingMoments(false);
    }

    void loadMoments();
  }, [personId]);

  // =========================
  // BASIC INFO AUTOSAVE
  // =========================

  useEffect(() => {
    if (!person || !initialBasicInfoLoaded.current) {
      return;
    }

    if (!editingBasicInfo) {
      return;
    }

    const timer = window.setTimeout(async () => {
      if (!editName.trim()) {
        return;
      }

      setSavingBasicInfo(true);
      setBasicInfoSaved(false);

      try {
        const supabase = createClient();

        const updatedPerson = {
          name: editName.trim(),
          birth_date: editBirthDate || null,
          mbti: editMbti.trim() || null,
          characteristics:
            editCharacteristics.trim() || null,
          tags: editTags.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("people")
          .update(updatedPerson)
          .eq("id", person.id);

        if (error) {
          console.error(
            "PERSON ARCHIVE: BASIC INFO SAVE ERROR",
            error
          );
          return;
        }

        setPerson((current) =>
          current
            ? {
                ...current,
                ...updatedPerson,
              }
            : current
        );

        setBasicInfoSaved(true);

        window.setTimeout(() => {
          setBasicInfoSaved(false);
        }, 1800);
      } finally {
        setSavingBasicInfo(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    editName,
    editBirthDate,
    editMbti,
    editCharacteristics,
    editTags,
    editingBasicInfo,
    person?.id,
  ]);

  // =========================
  // RELATIONSHIP AUTOSAVE
  // =========================

  useEffect(() => {
    if (!person || !initialRelationshipLoaded.current) {
      return;
    }

    if (!editingRelationship) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setSavingRelationship(true);
      setRelationshipSaved(false);

      try {
        const supabase = createClient();

        const updatedValues = {
          relationship: relationship.trim() || null,
          is_favorite: isFavorite,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("people")
          .update(updatedValues)
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
                  updatedValues.relationship,
                is_favorite:
                  updatedValues.is_favorite,
              }
            : current
        );

        setRelationshipSaved(true);

        window.setTimeout(() => {
          setRelationshipSaved(false);
        }, 1800);
      } finally {
        setSavingRelationship(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    relationship,
    isFavorite,
    editingRelationship,
    person?.id,
  ]);

  // =========================
  // LIKES / DISLIKES AUTOSAVE
  // =========================

  useEffect(() => {
    if (!person || !initialLikesLoaded.current) {
      return;
    }

    if (!editingLikes) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setSavingLikes(true);
      setLikesSaved(false);

      try {
        const supabase = createClient();

        const updatedValues = {
          likes: likes.trim() || null,
          dislikes: dislikes.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("people")
          .update(updatedValues)
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
                likes: updatedValues.likes,
                dislikes: updatedValues.dislikes,
              }
            : current
        );

        setLikesSaved(true);

        window.setTimeout(() => {
          setLikesSaved(false);
        }, 1800);
      } finally {
        setSavingLikes(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    likes,
    dislikes,
    editingLikes,
    person?.id,
  ]);

  // =========================
  // NOTES AUTOSAVE
  // =========================

  useEffect(() => {
    if (!person || !initialNotesLoaded.current) {
      return;
    }

    if (!editingNotes) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setSavingNotes(true);
      setNotesSaved(false);

      try {
        const supabase = createClient();

        const updatedValues = {
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("people")
          .update(updatedValues)
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
                notes: updatedValues.notes,
              }
            : current
        );

        setNotesSaved(true);

        window.setTimeout(() => {
          setNotesSaved(false);
        }, 1800);
      } finally {
        setSavingNotes(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notes, editingNotes, person?.id]);

  // =========================
  // MOMENT HELPERS
  // =========================

  function resetMomentForm() {
    setMomentDate("");
    setMomentTitle("");
    setMomentDescription("");
    setMomentTags("");
    setEditingMomentId(null);
    setShowMomentForm(false);
    setMomentSaved(false);
  }

  function openNewMoment() {
    setMomentDate(
      new Date().toISOString().slice(0, 10)
    );
    setMomentTitle("");
    setMomentDescription("");
    setMomentTags("");
    setEditingMomentId(null);
    setMomentSaved(false);
    setShowMomentForm(true);
  }

  function openEditMoment(moment: PersonMoment) {
    setMomentDate(moment.moment_date);
    setMomentTitle(moment.title);
    setMomentDescription(moment.description ?? "");
    setMomentTags(moment.tags ?? "");
    setEditingMomentId(moment.id);
    setMomentSaved(false);
    setShowMomentForm(true);
  }

  // =========================
  // MOMENT AUTOSAVE
  // =========================

  useEffect(() => {
    if (!person || !initialMomentLoaded.current) {
      return;
    }

    if (!showMomentForm) {
      return;
    }

    // New moment needs both date and title
    // before it can be inserted because the DB
    // requires both fields.
    if (!momentDate || !momentTitle.trim()) {
      return;
    }

    const timer = window.setTimeout(async () => {
      if (creatingMomentRef.current) {
        return;
      }

      setSavingMoment(true);
      setMomentSaved(false);

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
          tags: momentTags.trim() || null,
          updated_at: new Date().toISOString(),
        };

        if (editingMomentId) {
          const { data, error } = await supabase
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
          creatingMomentRef.current = true;

          const { data, error } = await supabase
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
            [...current, data].sort((a, b) =>
              b.moment_date.localeCompare(
                a.moment_date
              )
            )
          );

          setEditingMomentId(data.id);
        }

        setMomentSaved(true);

        window.setTimeout(() => {
          setMomentSaved(false);
        }, 1800);
      } finally {
        creatingMomentRef.current = false;
        setSavingMoment(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    momentDate,
    momentTitle,
    momentDescription,
    momentTags,
    editingMomentId,
    showMomentForm,
    person?.id,
  ]);

  // =========================
  // DELETE MOMENT
  // =========================

  async function deleteMoment(momentId: string) {
    const confirmed = window.confirm(
      "Delete this moment?"
    );

    if (!confirmed) return;

    setDeletingMomentId(momentId);

    try {
      const supabase = createClient();

      const { data: userData } =
        await supabase.auth.getUser();

      const user = userData.user;

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
          (moment) => moment.id !== momentId
        )
      );

      if (editingMomentId === momentId) {
        resetMomentForm();
      }
    } finally {
      setDeletingMomentId(null);
    }
  }

  // =========================
  // LOADING
  // =========================

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

  // =========================
  // NOT FOUND
  // =========================

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
          <div className="text-4xl">👤</div>

          <h2 className="mt-4 text-xl font-bold text-[#3f382f]">
            Person not found.
          </h2>

          <p className="mt-2 text-sm text-[#746a5e]">
            This person could not be loaded from your
            archive.
          </p>
        </div>
      </section>
    );
  }

  const zodiac = getZodiac(
    editingBasicInfo
      ? editBirthDate || null
      : person.birth_date
  );

  const zodiacSymbol = getZodiacSymbol(zodiac);

  const hasLikesDislikes =
    Boolean(person.likes) ||
    Boolean(person.dislikes);

  // =========================
  // UI
  // =========================

  return (
    <section>
      {/* BACK */}
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#746a5e] transition hover:text-[#3f382f]"
      >
        ← Back to People
      </button>

      {/* =========================
          HEADER
          ========================= */}

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
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          BASIC INFORMATION
          ========================= */}

      <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Basic Information
            </p>

            <h3 className="mt-2 text-xl font-bold text-[#3f382f]">
              About {person.name}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <SaveStatus
              saving={savingBasicInfo}
              saved={basicInfoSaved}
            />

            {!editingBasicInfo && (
              <button
                type="button"
                onClick={() => {
                  setEditName(person.name);
                  setEditBirthDate(
                    person.birth_date ?? ""
                  );
                  setEditMbti(person.mbti ?? "");
                  setEditCharacteristics(
                    person.characteristics ?? ""
                  );
                  setEditTags(person.tags ?? "");
                  setEditingBasicInfo(true);
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#ebe3d8]"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {!editingBasicInfo ? (
          <>
            <div className="mt-6">
              <InfoCard
                label="Name"
                value={person.name}
                icon="👤"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Birth date"
                value={formatBirthDate(
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
                label="MBTI"
                value={person.mbti || "-"}
                icon="🧠"
              />

              <InfoCard
                label="Characteristics"
                value={
                  person.characteristics || "-"
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
                    .map((tag) => tag.trim())
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
          </>
        ) : (
          <div className="mt-6 space-y-5">
            {/* NAME */}

            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Name
              </label>

              <input
                type="text"
                value={editName}
                onChange={(event) =>
                  setEditName(event.target.value)
                }
                placeholder="Person's name"
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            {/* BIRTH DATE */}

            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Birth date
              </label>

              <input
                type="date"
                value={editBirthDate}
                onChange={(event) =>
                  setEditBirthDate(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              />

              {zodiac && (
                <p className="mt-2 text-xs text-[#746a5e]">
                  {zodiacSymbol} {zodiac}
                </p>
              )}
            </div>

            {/* MBTI */}

            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                MBTI
              </label>

              <input
                type="text"
                value={editMbti}
                onChange={(event) =>
                  setEditMbti(event.target.value)
                }
                placeholder="e.g. INFJ"
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm uppercase text-[#3f382f] outline-none placeholder:normal-case placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            {/* CHARACTERISTICS */}

            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Characteristics
              </label>

              <textarea
                value={editCharacteristics}
                onChange={(event) =>
                  setEditCharacteristics(
                    event.target.value
                  )
                }
                placeholder="Kind, quiet, funny..."
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm leading-6 text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            {/* TAGS */}

            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Tags
              </label>

              <input
                type="text"
                value={editTags}
                onChange={(event) =>
                  setEditTags(event.target.value)
                }
                placeholder="friend, classmate, important"
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditName(person.name);
                  setEditBirthDate(
                    person.birth_date ?? ""
                  );
                  setEditMbti(person.mbti ?? "");
                  setEditCharacteristics(
                    person.characteristics ?? ""
                  );
                  setEditTags(person.tags ?? "");
                  setEditingBasicInfo(false);
                }}
                disabled={savingBasicInfo}
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================
          RELATIONSHIP
          ========================= */}

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

          <div className="flex items-center gap-3">
            <SaveStatus
              saving={savingRelationship}
              saved={relationshipSaved}
            />

            {!editingRelationship && (
              <button
                type="button"
                onClick={() => {
                  setRelationship(
                    person.relationship ?? ""
                  );
                  setIsFavorite(
                    person.is_favorite
                  );
                  setEditingRelationship(true);
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#ebe3d8]"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {!editingRelationship ? (
          person.relationship || person.is_favorite ? (
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
          ) : (
            <div className="mt-4">
              <p className="text-sm text-[#746a5e]">
                No relationship details yet.
              </p>

              <button
                type="button"
                onClick={() =>
                  setEditingRelationship(true)
                }
                className="mt-3 text-sm font-medium text-[#8b6f5a] hover:underline"
              >
                + Add relationship
              </button>
            </div>
          )
        ) : (
          <div className="mt-5">
            <label className="text-sm font-medium text-[#3f382f]">
              Relationship
            </label>

            <select
              value={relationship}
              onChange={(event) =>
                setRelationship(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
            >
              <option value="">
                Select relationship
              </option>

              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                setIsFavorite((current) => !current)
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
                  Mark this person as especially important.
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

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setRelationship(
                    person.relationship ?? ""
                  );
                  setIsFavorite(
                    person.is_favorite
                  );
                  setEditingRelationship(false);
                }}
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================
          LIKES & DISLIKES
          ========================= */}

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

          <div className="flex items-center gap-3">
            <SaveStatus
              saving={savingLikes}
              saved={likesSaved}
            />

            {!editingLikes && (
              <button
                type="button"
                onClick={() => {
                  setLikes(person.likes ?? "");
                  setDislikes(
                    person.dislikes ?? ""
                  );
                  setEditingLikes(true);
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#ebe3d8]"
              >
                {hasLikesDislikes ? "Edit" : "Add"}
              </button>
            )}
          </div>
        </div>

        {!editingLikes ? (
          hasLikesDislikes ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {person.likes && (
                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs text-[#746a5e]">
                    Likes
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                    {person.likes}
                  </p>
                </div>
              )}

              {person.dislikes && (
                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs text-[#746a5e]">
                    Dislikes
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                    {person.dislikes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#746a5e]">
              No likes or dislikes recorded yet.
            </p>
          )
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Likes
              </label>

              <textarea
                value={likes}
                onChange={(event) =>
                  setLikes(event.target.value)
                }
                placeholder="Music, coffee, cats, movies..."
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Dislikes
              </label>

              <textarea
                value={dislikes}
                onChange={(event) =>
                  setDislikes(event.target.value)
                }
                placeholder="Crowded places, spicy food..."
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setLikes(person.likes ?? "");
                  setDislikes(
                    person.dislikes ?? ""
                  );
                  setEditingLikes(false);
                }}
                disabled={savingLikes}
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================
          NOTES
          ========================= */}

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

          <div className="flex items-center gap-3">
            <SaveStatus
              saving={savingNotes}
              saved={notesSaved}
            />

            {!editingNotes && (
              <button
                type="button"
                onClick={() => {
                  setNotes(person.notes ?? "");
                  setEditingNotes(true);
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#ebe3d8]"
              >
                {person.notes ? "Edit" : "Add"}
              </button>
            )}
          </div>
        </div>

        {!editingNotes ? (
          person.notes ? (
            <div className="mt-5 rounded-xl bg-[#ebe3d8] px-4 py-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                {person.notes}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#746a5e]">
              No notes about this person yet.
            </p>
          )
        ) : (
          <div className="mt-5">
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Things you want to remember about them..."
              rows={6}
              className="w-full resize-y rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm leading-6 text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setNotes(person.notes ?? "");
                  setEditingNotes(false);
                }}
                disabled={savingNotes}
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================
          MOMENTS / TIMELINE
          ========================= */}

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
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#3f382f]">
                {editingMomentId
                  ? "Edit moment"
                  : "New moment"}
              </p>

              <SaveStatus
                saving={savingMoment}
                saved={momentSaved}
              />
            </div>

            <p className="mt-1 text-xs text-[#746a5e]">
              Changes are saved automatically.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* DATE */}

              <div>
                <label className="text-xs font-medium text-[#746a5e]">
                  Date
                </label>

                <input
                  type="date"
                  value={momentDate}
                  onChange={(event) =>
                    setMomentDate(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
                />
              </div>

              {/* TITLE */}

              <div>
                <label className="text-xs font-medium text-[#746a5e]">
                  Title
                </label>

                <input
                  type="text"
                  value={momentTitle}
                  onChange={(event) =>
                    setMomentTitle(event.target.value)
                  }
                  placeholder="First met..."
                  className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
                />
              </div>
            </div>

            {/* DESCRIPTION */}

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
                className="mt-2 w-full resize-y rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm leading-6 text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            {/* TAGS */}

            <div className="mt-4">
              <label className="text-xs font-medium text-[#746a5e]">
                Tags
              </label>

              <input
                type="text"
                value={momentTags}
                onChange={(event) =>
                  setMomentTags(event.target.value)
                }
                placeholder="school, trip, birthday"
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={resetMomentForm}
                disabled={savingMoment}
                className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#f7f2ea]"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* MOMENT LIST */}

        <div className="mt-6">
          {loadingMoments ? (
            <p className="text-sm text-[#746a5e]">
              Loading moments...
            </p>
          ) : moments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8cec0] bg-[#ebe3d8] px-5 py-8 text-center">
              <div className="text-3xl">🕰️</div>

              <p className="mt-3 text-sm text-[#746a5e]">
                No moments recorded yet.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="space-y-4">
                {moments.map((moment) => (
                  <article
                    key={moment.id}
                    className="relative rounded-xl border border-[#d8cec0] bg-[#ebe3d8] p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#8b6f5a]">
                          {formatMomentDate(
                            moment.moment_date
                          )}
                        </p>

                        <h4 className="mt-1 text-lg font-bold text-[#3f382f]">
                          {moment.title}
                        </h4>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditMoment(moment)
                          }
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#8b6f5a] transition hover:bg-[#f7f2ea]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteMoment(moment.id)
                          }
                          disabled={
                            deletingMomentId ===
                            moment.id
                          }
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#a16b5d] transition hover:bg-[#f7f2ea] disabled:opacity-50"
                        >
                          {deletingMomentId ===
                          moment.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>

                    {moment.description && (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                        {moment.description}
                      </p>
                    )}

                    {moment.tags && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {moment.tags
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
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}