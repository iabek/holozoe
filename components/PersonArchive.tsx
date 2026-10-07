"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Person = {
  id: string;
  name: string;
  birth_date: string | null;
  mbti: string | null;
  shio: string | null;
  blood_type: string | null;
  address: string | null;
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

const BLOOD_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const MBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
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

function getShio(birthDate: string | null) {
  if (!birthDate) return null;

  const year = Number(birthDate.split("-")[0]);

  if (!year) return null;

  const shios = [
    "Monkey",
    "Rooster",
    "Dog",
    "Pig",
    "Rat",
    "Ox",
    "Tiger",
    "Rabbit",
    "Dragon",
    "Snake",
    "Horse",
    "Goat",
  ];

  return shios[year % 12];
}

function getShioSymbol(shio: string | null) {
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

  return shio ? symbols[shio] ?? "" : "";
}

function getLifePathNumber(birthDate: string | null) {
  if (!birthDate) return null;

  const digits = birthDate
    .replace(/\D/g, "")
    .split("")
    .map(Number);

  if (digits.length !== 8) return null;

  let total = digits.reduce((sum, digit) => sum + digit, 0);

  while (
    total > 9 &&
    total !== 11 &&
    total !== 22 &&
    total !== 33
  ) {
    total = String(total)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }

  return total;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function inputClassName() {
  return "mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]";
}

function displayValue(value: string | null) {
  return value?.trim() ? value : "-";
}

export default function PersonArchive({
  personId,
  onBack,
}: PersonArchiveProps) {
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  /* BASIC INFO */
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [basicName, setBasicName] = useState("");
  const [basicBirthDate, setBasicBirthDate] = useState("");
  const [basicMbti, setBasicMbti] = useState("");
  const [basicBloodType, setBasicBloodType] = useState("");
  const [basicAddress, setBasicAddress] = useState("");
  const [basicCharacteristics, setBasicCharacteristics] = useState("");
  const [basicTags, setBasicTags] = useState("");
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [basicInfoSaved, setBasicInfoSaved] = useState(false);

  /* RELATIONSHIP */
  const [relationship, setRelationship] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState(false);
  const [savingRelationship, setSavingRelationship] = useState(false);
  const [relationshipSaved, setRelationshipSaved] = useState(false);

  /* LIKES */
  const [likes, setLikes] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [editingLikes, setEditingLikes] = useState(false);
  const [savingLikes, setSavingLikes] = useState(false);
  const [likesSaved, setLikesSaved] = useState(false);

  /* NOTES */
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  /* MOMENTS */
  const [moments, setMoments] = useState<PersonMoment[]>([]);
  const [loadingMoments, setLoadingMoments] = useState(true);
  const [showMomentForm, setShowMomentForm] = useState(false);
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [momentDate, setMomentDate] = useState("");
  const [momentTitle, setMomentTitle] = useState("");
  const [momentDescription, setMomentDescription] = useState("");
  const [momentTags, setMomentTags] = useState("");
  const [savingMoment, setSavingMoment] = useState(false);
  const [deletingMomentId, setDeletingMomentId] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadPerson() {
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("PERSON ARCHIVE: USER ERROR", userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("people")
        .select(
          "id, name, birth_date, mbti, shio, blood_type, address, characteristics, tags, relationship, is_favorite, likes, dislikes, notes"
        )
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("PERSON ARCHIVE: LOAD ERROR", error);
        setLoading(false);
        return;
      }

      const calculatedShio = data.shio ?? getShio(data.birth_date);

      const normalizedPerson: Person = {
        ...data,
        shio: calculatedShio,
        blood_type: data.blood_type ?? null,
        address: data.address ?? null,
      };

      setPerson(normalizedPerson);

      setBasicName(data.name ?? "");
      setBasicBirthDate(data.birth_date ?? "");
      setBasicMbti(data.mbti ?? "");
      setBasicBloodType(data.blood_type ?? "");
      setBasicAddress(data.address ?? "");
      setBasicCharacteristics(data.characteristics ?? "");
      setBasicTags(data.tags ?? "");

      setRelationship(data.relationship ?? "");
      setIsFavorite(data.is_favorite ?? false);
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
        console.error("PERSON MOMENTS: USER ERROR", userError);
        setLoadingMoments(false);
        return;
      }

      const { data, error } = await supabase
        .from("person_moments")
        .select("id, person_id, moment_date, title, description, tags")
        .eq("person_id", personId)
        .eq("user_id", user.id)
        .order("moment_date", {
          ascending: false,
        });

      if (error) {
        console.error("PERSON MOMENTS: LOAD ERROR", error);
        setLoadingMoments(false);
        return;
      }

      setMoments(data ?? []);
      setLoadingMoments(false);
    }

    void loadMoments();
  }, [personId]);

  function startEditingBasicInfo() {
    if (!person) return;

    setBasicName(person.name ?? "");
    setBasicBirthDate(person.birth_date ?? "");
    setBasicMbti(person.mbti ?? "");
    setBasicBloodType(person.blood_type ?? "");
    setBasicAddress(person.address ?? "");
    setBasicCharacteristics(person.characteristics ?? "");
    setBasicTags(person.tags ?? "");

    setBasicInfoSaved(false);
    setEditingBasicInfo(true);
  }

  function cancelEditingBasicInfo() {
    if (!person) return;

    setBasicName(person.name ?? "");
    setBasicBirthDate(person.birth_date ?? "");
    setBasicMbti(person.mbti ?? "");
    setBasicBloodType(person.blood_type ?? "");
    setBasicAddress(person.address ?? "");
    setBasicCharacteristics(person.characteristics ?? "");
    setBasicTags(person.tags ?? "");

    setEditingBasicInfo(false);
  }

  async function saveBasicInfo() {
    if (!person) return;

    const cleanName = basicName.trim();

    if (!cleanName) {
      return;
    }

    setSavingBasicInfo(true);
    setBasicInfoSaved(false);

    try {
      const supabase = createClient();

      const calculatedShio = getShio(basicBirthDate || null);

      const payload = {
        name: cleanName,
        birth_date: basicBirthDate || null,
        mbti: basicMbti.trim() || null,
        shio: calculatedShio,
        blood_type: basicBloodType || null,
        address: basicAddress.trim() || null,
        characteristics: basicCharacteristics.trim() || null,
        tags: basicTags.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("people")
        .update(payload)
        .eq("id", person.id);

      if (error) {
        console.error("PERSON ARCHIVE: BASIC INFO SAVE ERROR", error);
        return;
      }

      setPerson((current) =>
        current
          ? {
              ...current,
              ...payload,
              birth_date: payload.birth_date,
              mbti: payload.mbti,
              shio: payload.shio,
              blood_type: payload.blood_type,
              address: payload.address,
              characteristics: payload.characteristics,
              tags: payload.tags,
            }
          : current
      );

      setEditingBasicInfo(false);
      setBasicInfoSaved(true);

      window.setTimeout(() => {
        setBasicInfoSaved(false);
      }, 2500);
    } finally {
      setSavingBasicInfo(false);
    }
  }

  async function saveRelationship() {
    if (!person) return;

    setSavingRelationship(true);
    setRelationshipSaved(false);

    try {
      const supabase = createClient();

      const cleanRelationship = relationship.trim() || null;

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
              relationship: cleanRelationship,
              is_favorite: isFavorite,
            }
          : current
      );

      setEditingRelationship(false);
      setRelationshipSaved(true);

      window.setTimeout(() => setRelationshipSaved(false), 2500);
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

      const cleanLikes = likes.trim() || null;
      const cleanDislikes = dislikes.trim() || null;

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

      window.setTimeout(() => setLikesSaved(false), 2500);
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

      const cleanNotes = notes.trim() || null;

      const { error } = await supabase
        .from("people")
        .update({
          notes: cleanNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", person.id);

      if (error) {
        console.error("PERSON ARCHIVE: NOTES SAVE ERROR", error);
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

      window.setTimeout(() => setNotesSaved(false), 2500);
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
      new Date().toISOString().slice(0, 10)
    );
    setMomentTitle("");
    setMomentDescription("");
    setMomentTags("");
    setEditingMomentId(null);
    setShowMomentForm(true);
  }

  function openEditMoment(moment: PersonMoment) {
    setMomentDate(moment.moment_date ?? "");
    setMomentTitle(moment.title ?? "");
    setMomentDescription(moment.description ?? "");
    setMomentTags(moment.tags ?? "");
    setEditingMomentId(moment.id);
    setShowMomentForm(true);
  }

  async function saveMoment() {
    if (!person) return;

    if (!momentDate || !momentTitle.trim()) {
      return;
    }

    setSavingMoment(true);

    try {
      const supabase = createClient();

      const payload = {
        moment_date: momentDate,
        title: momentTitle.trim(),
        description: momentDescription.trim() || null,
        tags: momentTags.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingMomentId) {
        const { error } = await supabase
          .from("person_moments")
          .update(payload)
          .eq("id", editingMomentId)
          .eq("person_id", person.id);

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
                ? {
                    ...moment,
                    moment_date: payload.moment_date,
                    title: payload.title,
                    description: payload.description,
                    tags: payload.tags,
                  }
                : moment
            )
            .sort(
              (a, b) =>
                new Date(b.moment_date).getTime() -
                new Date(a.moment_date).getTime()
            )
        );
      } else {
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

        const { data, error } = await supabase
          .from("person_moments")
          .insert({
            user_id: user.id,
            person_id: person.id,
            ...payload,
          })
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

        if (data) {
          setMoments((current) =>
            [data, ...current].sort(
              (a, b) =>
                new Date(b.moment_date).getTime() -
                new Date(a.moment_date).getTime()
            )
          );
        }
      }

      resetMomentForm();
    } finally {
      setSavingMoment(false);
    }
  }

  async function deleteMoment(momentId: string) {
    if (!person) return;

    const confirmed = window.confirm(
      "Delete this moment?"
    );

    if (!confirmed) return;

    setDeletingMomentId(momentId);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("person_moments")
        .delete()
        .eq("id", momentId)
        .eq("person_id", person.id);

      if (error) {
        console.error(
          "PERSON MOMENTS: DELETE ERROR",
          error
        );
        return;
      }

      setMoments((current) =>
        current.filter((moment) => moment.id !== momentId)
      );

      if (editingMomentId === momentId) {
        resetMomentForm();
      }
    } finally {
      setDeletingMomentId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3eee6] px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-[#746a5e]">
            Loading person...
          </p>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-[#f3eee6] px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={onBack}
            className="mb-6 rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-2 text-sm font-medium text-[#746a5e] hover:bg-[#ebe3d8]"
          >
            ← Back
          </button>

          <div className="rounded-2xl bg-[#f7f2ea] p-8 text-center shadow-sm">
            <p className="text-sm text-[#746a5e]">
              Person not found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const zodiac = getZodiac(
    editingBasicInfo
      ? basicBirthDate || null
      : person.birth_date
  );

  const shio = getShio(
    editingBasicInfo
      ? basicBirthDate || null
      : person.birth_date
  );

  const lifePath = getLifePathNumber(
    editingBasicInfo
      ? basicBirthDate || null
      : person.birth_date
  );

  return (
    <div className="min-h-screen bg-[#f3eee6] px-5 py-8 pb-16">
      <div className="mx-auto max-w-4xl">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-fit rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
          >
            ← Back
          </button>

          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9a8c7c]">
              Person Archive
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-[#3f382f]">
              {person.name}
            </h1>
          </div>
        </div>

        {/* BASIC INFORMATION */}
        <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Basic Information
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#3f382f]">
                {person.name}
              </h2>
            </div>

            {!editingBasicInfo && (
              <button
                type="button"
                onClick={startEditingBasicInfo}
                className="w-fit rounded-xl bg-[#8b6f5a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
              >
                Edit
              </button>
            )}
          </div>

          {!editingBasicInfo ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Name
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {displayValue(person.name)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Birth Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {formatDate(person.birth_date)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    MBTI
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {displayValue(person.mbti)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Blood Type
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {displayValue(person.blood_type)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Zodiac
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {zodiac
                      ? `${getZodiacSymbol(zodiac)} ${zodiac}`
                      : "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Shio
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {shio
                      ? `${getShioSymbol(shio)} ${shio}`
                      : "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Life Path
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {lifePath ?? "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Address
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-[#3f382f]">
                    {displayValue(person.address)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Characteristics
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                    {displayValue(person.characteristics)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Tags
                  </p>

                  {person.tags?.trim() ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {person.tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#f7f2ea] px-3 py-1 text-xs font-medium text-[#746a5e]"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[#3f382f]">
                      -
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Name
                  </label>

                  <input
                    type="text"
                    value={basicName}
                    onChange={(event) =>
                      setBasicName(event.target.value)
                    }
                    className={inputClassName()}
                    placeholder="Name"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Birth Date
                  </label>

                  <input
                    type="date"
                    value={basicBirthDate}
                    onChange={(event) =>
                      setBasicBirthDate(event.target.value)
                    }
                    className={inputClassName()}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    MBTI
                  </label>

                  <select
                    value={basicMbti}
                    onChange={(event) =>
                      setBasicMbti(event.target.value)
                    }
                    className={inputClassName()}
                  >
                    <option value="">Select MBTI</option>

                    {MBTI_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Blood Type
                  </label>

                  <select
                    value={basicBloodType}
                    onChange={(event) =>
                      setBasicBloodType(event.target.value)
                    }
                    className={inputClassName()}
                  >
                    <option value="">Select Blood Type</option>

                    {BLOOD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Address
                  </label>

                  <textarea
                    value={basicAddress}
                    onChange={(event) =>
                      setBasicAddress(event.target.value)
                    }
                    rows={3}
                    className={inputClassName()}
                    placeholder="Address"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Characteristics
                  </label>

                  <textarea
                    value={basicCharacteristics}
                    onChange={(event) =>
                      setBasicCharacteristics(event.target.value)
                    }
                    rows={4}
                    className={inputClassName()}
                    placeholder="Characteristics"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Tags
                  </label>

                  <input
                    type="text"
                    value={basicTags}
                    onChange={(event) =>
                      setBasicTags(event.target.value)
                    }
                    className={inputClassName()}
                    placeholder="Example: campus, close-friend, gaming"
                  />

                  <p className="mt-1 text-xs text-[#9a8c7c]">
                    Separate multiple tags with commas.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Zodiac
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {zodiac
                      ? `${getZodiacSymbol(zodiac)} ${zodiac}`
                      : "-"}
                  </p>

                  <p className="mt-1 text-xs text-[#9a8c7c]">
                    Automatically calculated from birth date.
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Shio
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {shio
                      ? `${getShioSymbol(shio)} ${shio}`
                      : "-"}
                  </p>

                  <p className="mt-1 text-xs text-[#9a8c7c]">
                    Automatically calculated from birth year.
                  </p>
                </div>

                <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                    Life Path
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#3f382f]">
                    {lifePath ?? "-"}
                  </p>

                  <p className="mt-1 text-xs text-[#9a8c7c]">
                    Automatically calculated from birth date.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={cancelEditingBasicInfo}
                  disabled={savingBasicInfo}
                  className="rounded-xl border border-[#d8cec0] px-5 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveBasicInfo}
                  disabled={
                    savingBasicInfo || !basicName.trim()
                  }
                  className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingBasicInfo ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {basicInfoSaved && (
                <p className="mt-3 text-right text-xs text-[#7c8b68]">
                  ✓ Basic information saved
                </p>
              )}
            </>
          )}
        </section>

        {/* RELATIONSHIP */}
        <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Relationship
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#3f382f]">
                How you know this person
              </h2>
            </div>

            {!editingRelationship && (
              <button
                type="button"
                onClick={() => setEditingRelationship(true)}
                className="w-fit rounded-xl bg-[#8b6f5a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
              >
                Edit
              </button>
            )}
          </div>

          {!editingRelationship ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                  Relationship
                </p>

                <p className="mt-1 text-sm font-medium text-[#3f382f]">
                  {displayValue(person.relationship)}
                </p>
              </div>

              <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                  Important Person
                </p>

                <p className="mt-1 text-sm font-medium text-[#3f382f]">
                  {person.is_favorite ? "⭐ Yes" : "No"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5">
                <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                  Relationship
                </label>

                <select
                  value={relationship}
                  onChange={(event) =>
                    setRelationship(event.target.value)
                  }
                  className={inputClassName()}
                >
                  <option value="">Select relationship</option>

                  {RELATIONSHIP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

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
                    isFavorite ? "opacity-100" : "opacity-30"
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
                      person.relationship ?? ""
                    );
                    setIsFavorite(person.is_favorite);
                    setEditingRelationship(false);
                  }}
                  disabled={savingRelationship}
                  className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveRelationship}
                  disabled={savingRelationship}
                  className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingRelationship ? "Saving..." : "Save"}
                </button>
              </div>

              {relationshipSaved && (
                <p className="mt-3 text-right text-xs text-[#7c8b68]">
                  ✓ Relationship saved
                </p>
              )}
            </>
          )}
        </section>

        {/* LIKES / DISLIKES */}
        <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Likes & Dislikes
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#3f382f]">
                Things they like and dislike
              </h2>
            </div>

            {!editingLikes && (
              <button
                type="button"
                onClick={() => setEditingLikes(true)}
                className="w-fit rounded-xl bg-[#8b6f5a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
              >
                Edit
              </button>
            )}
          </div>

          {!editingLikes ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                  Likes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                  {displayValue(person.likes)}
                </p>
              </div>

              <div className="rounded-xl bg-[#ebe3d8] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#9a8c7c]">
                  Dislikes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                  {displayValue(person.dislikes)}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Likes
                  </label>

                  <textarea
                    value={likes}
                    onChange={(event) =>
                      setLikes(event.target.value)
                    }
                    rows={5}
                    className={inputClassName()}
                    placeholder="What do they like?"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Dislikes
                  </label>

                  <textarea
                    value={dislikes}
                    onChange={(event) =>
                      setDislikes(event.target.value)
                    }
                    rows={5}
                    className={inputClassName()}
                    placeholder="What do they dislike?"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLikes(person.likes ?? "");
                    setDislikes(person.dislikes ?? "");
                    setEditingLikes(false);
                  }}
                  disabled={savingLikes}
                  className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveLikesDislikes}
                  disabled={savingLikes}
                  className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingLikes ? "Saving..." : "Save"}
                </button>
              </div>

              {likesSaved && (
                <p className="mt-3 text-right text-xs text-[#7c8b68]">
                  ✓ Likes & dislikes saved
                </p>
              )}
            </>
          )}
        </section>

        {/* NOTES */}
        <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Notes
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#3f382f]">
                Personal notes
              </h2>
            </div>

            {!editingNotes && (
              <button
                type="button"
                onClick={() => setEditingNotes(true)}
                className="w-fit rounded-xl bg-[#8b6f5a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
              >
                Edit
              </button>
            )}
          </div>

          {!editingNotes ? (
            <div className="mt-5 rounded-xl bg-[#ebe3d8] px-4 py-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#3f382f]">
                {displayValue(person.notes)}
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={7}
                className={`${inputClassName()} mt-5`}
                placeholder="Write anything you want to remember..."
              />

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNotes(person.notes ?? "");
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
                  {savingNotes ? "Saving..." : "Save"}
                </button>
              </div>

              {notesSaved && (
                <p className="mt-3 text-right text-xs text-[#7c8b68]">
                  ✓ Notes saved
                </p>
              )}
            </>
          )}
        </section>

        {/* MOMENTS / TIMELINE */}
        <section className="mt-6 rounded-2xl bg-[#f7f2ea] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Moments
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#3f382f]">
                Memories & timeline
              </h2>

              <p className="mt-1 text-sm text-[#746a5e]">
                Record important memories or moments you shared with{" "}
                {person.name}.
              </p>
            </div>

            {!showMomentForm && (
              <button
                type="button"
                onClick={openNewMoment}
                className="w-fit rounded-xl bg-[#8b6f5a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
              >
                + Add Moment
              </button>
            )}
          </div>

          {showMomentForm && (
            <div className="mt-5 rounded-2xl border border-[#d8cec0] bg-[#ebe3d8] p-5">
              <p className="text-sm font-semibold text-[#3f382f]">
                {editingMomentId
                  ? "Edit Moment"
                  : "New Moment"}
              </p>

              <div className="mt-4 grid gap-5">
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Date
                  </label>

                  <input
                    type="date"
                    value={momentDate}
                    onChange={(event) =>
                      setMomentDate(event.target.value)
                    }
                    className={inputClassName()}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Title
                  </label>

                  <input
                    type="text"
                    value={momentTitle}
                    onChange={(event) =>
                      setMomentTitle(event.target.value)
                    }
                    className={inputClassName()}
                    placeholder="Example: First time we met"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Description
                  </label>

                  <textarea
                    value={momentDescription}
                    onChange={(event) =>
                      setMomentDescription(event.target.value)
                    }
                    rows={5}
                    className={inputClassName()}
                    placeholder="What happened?"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                    Tags
                  </label>

                  <input
                    type="text"
                    value={momentTags}
                    onChange={(event) =>
                      setMomentTags(event.target.value)
                    }
                    className={inputClassName()}
                    placeholder="Example: funny, campus, trip"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetMomentForm}
                  disabled={savingMoment}
                  className="rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#f7f2ea]"
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
              <div className="rounded-xl border border-dashed border-[#d8cec0] bg-[#eee7dc] px-5 py-8 text-center">
                <div className="text-3xl">🕰️</div>

                <p className="mt-3 text-sm font-medium text-[#3f382f]">
                  No moments recorded yet.
                </p>

                <p className="mt-1 text-xs leading-5 text-[#746a5e]">
                  Add an important memory or moment you shared with{" "}
                  {person.name}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {moments.map((moment) => (
                  <article
                    key={moment.id}
                    className="rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#8b6f5a]">
                          {formatDate(moment.moment_date)}
                        </p>

                        <h4 className="mt-1 text-base font-semibold text-[#3f382f]">
                          {moment.title}
                        </h4>

                        {moment.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#746a5e]">
                            {moment.description}
                          </p>
                        )}

                        {moment.tags && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {moment.tags
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-[#f7f2ea] px-3 py-1 text-xs font-medium text-[#746a5e]"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditMoment(moment)
                          }
                          disabled={
                            deletingMomentId === moment.id
                          }
                          className="rounded-lg border border-[#d8cec0] bg-[#f7f2ea] px-3 py-2 text-xs font-medium text-[#746a5e] transition hover:bg-white disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteMoment(moment.id)
                          }
                          disabled={
                            deletingMomentId === moment.id
                          }
                          className="rounded-lg border border-[#d8cec0] bg-[#f7f2ea] px-3 py-2 text-xs font-medium text-[#a06f63] transition hover:bg-white disabled:opacity-50"
                        >
                          {deletingMomentId === moment.id
                            ? "..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}