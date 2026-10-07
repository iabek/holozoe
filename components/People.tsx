"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Person = {
  id: string;
  name: string;
  birth_date: string | null;
  mbti: string | null;
  characteristics: string | null;
  tags: string | null;
  shio: string | null;
  blood_type: string | null;
  address: string | null;
  created_at: string;
};

type PeopleProps = {
  onOpenPerson: (personId: string) => void;
};

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

function getShioFromBirthDate(birthDate: string | null) {
  if (!birthDate) return "";

  const year = Number(birthDate.split("-")[0]);
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

  return animals[(year - 4) % 12] ?? "";
}

function parseTags(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter(
      (tag, index, array) =>
        array.findIndex(
          (item) => item.toLowerCase() === tag.toLowerCase()
        ) === index
    );
}

function tagsToString(tags: string[]) {
  return tags.join(", ");
}

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

const ZODIAC_TYPES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const SHIO_TYPES = [
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

const BLOOD_TYPES = ["A", "B", "AB", "O"];

export default function People({ onOpenPerson }: PeopleProps) {
  const [showForm, setShowForm] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingPersonId, setDeletingPersonId] = useState<string | null>(
    null
  );

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [shio, setShio] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [address, setAddress] = useState("");
  const [mbti, setMbti] = useState("");
  const [characteristics, setCharacteristics] = useState("");

  const [tags, setTags] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [filterMbti, setFilterMbti] = useState("");
  const [filterZodiac, setFilterZodiac] = useState("");
  const [filterShio, setFilterShio] = useState("");
  const [filterBloodType, setFilterBloodType] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    async function loadPeople() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("PEOPLE: USER ERROR", userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("people")
        .select(
          "id, name, birth_date, mbti, characteristics, tags, shio, blood_type, address, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("PEOPLE: LOAD ERROR", error);
        setLoading(false);
        return;
      }

      setPeople(data ?? []);
      setLoading(false);
    }

    void loadPeople();
  }, []);

  /*
   * Ambil semua tag langsung dari Supabase.
   *
   * Ini sengaja TIDAK menggunakan state `people`,
   * karena tag bisa saja baru saja dibuat/disimpan
   * dari PersonArchive dan state People belum tentu
   * sudah diperbarui.
   */
  async function loadAvailableTags() {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("PEOPLE: TAG USER ERROR", userError);
      return;
    }

    const { data, error } = await supabase
      .from("people")
      .select("tags")
      .eq("user_id", user.id);

    if (error) {
      console.error("PEOPLE: TAG LOAD ERROR", error);
      return;
    }

    const allTags = (data ?? []).flatMap((person) =>
      parseTags(person.tags)
    );

    const uniqueTags = allTags
      .filter(
        (tag, index, array) =>
          array.findIndex(
            (item) => item.toLowerCase() === tag.toLowerCase()
          ) === index
      )
      .sort((a, b) =>
        a.localeCompare(b, undefined, {
          sensitivity: "base",
        })
      );

    setAvailableTags(uniqueTags);
  }

  async function openForm() {
    setShowForm(true);
    setTagInput("");
    setShowTagSuggestions(true);

    /*
     * Load ulang setiap kali form dibuka.
     *
     * Jadi kalau di database sudah ada:
     *
     * Epinephrine
     *
     * maka langsung tersedia sebagai suggestion.
     */
    await loadAvailableTags();
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setTagInput("");
    setShowTagSuggestions(false);
  }

  function handleBirthDateChange(value: string) {
    setBirthDate(value);

    if (value) {
      setShio(getShioFromBirthDate(value));
    } else {
      setShio("");
    }
  }

  const currentTags = useMemo(() => parseTags(tags), [tags]);

  /*
   * TAG SUGGESTIONS
   *
   * Contoh:
   * availableTags = ["Epinephrine"]
   *
   * tagInput = "epi"
   *
   * hasil:
   * ["Epinephrine"]
   */
  const filteredTagSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();

    return availableTags
      .filter(
        (tag) =>
          !currentTags.some(
            (currentTag) =>
              currentTag.toLowerCase() === tag.toLowerCase()
          )
      )
      .filter((tag) => {
        if (!query) return true;

        return tag.toLowerCase().includes(query);
      })
      .slice(0, 12);
  }, [availableTags, currentTags, tagInput]);

  function addTag(tag: string) {
    const cleanTag = tag.trim();

    if (!cleanTag) return;

    const existingTags = parseTags(tags);

    const alreadyExists = existingTags.some(
      (existingTag) =>
        existingTag.toLowerCase() === cleanTag.toLowerCase()
    );

    if (alreadyExists) {
      setTagInput("");
      return;
    }

    setTags(tagsToString([...existingTags, cleanTag]));
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    const nextTags = parseTags(tags).filter(
      (tag) => tag.toLowerCase() !== tagToRemove.toLowerCase()
    );

    setTags(tagsToString(nextTags));
  }

  function handleTagInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (tagInput.trim()) {
        addTag(tagInput);
      }
    }

    if (
      event.key === "Backspace" &&
      !tagInput &&
      currentTags.length > 0
    ) {
      removeTag(currentTags[currentTags.length - 1]);
    }
  }

  async function savePerson() {
    if (!name.trim()) return;

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("PEOPLE: USER ERROR", userError);
        return;
      }

      const calculatedShio = birthDate
        ? getShioFromBirthDate(birthDate)
        : shio;

      const cleanTags = parseTags(tags);

      const { data, error } = await supabase
        .from("people")
        .insert({
          user_id: user.id,
          name: name.trim(),
          birth_date: birthDate || null,
          shio: calculatedShio || null,
          blood_type: bloodType || null,
          address: address.trim() || null,
          mbti: mbti || null,
          characteristics: characteristics.trim() || null,
          tags:
            cleanTags.length > 0
              ? tagsToString(cleanTags)
              : null,
        })
        .select(
          "id, name, birth_date, mbti, characteristics, tags, shio, blood_type, address, created_at"
        )
        .single();

      if (error) {
        console.error("PEOPLE: SAVE ERROR", error);
        return;
      }

      if (data) {
        setPeople((currentPeople) => [
          data,
          ...currentPeople,
        ]);
      }

      setName("");
      setBirthDate("");
      setShio("");
      setBloodType("");
      setAddress("");
      setMbti("");
      setCharacteristics("");
      setTags("");
      setTagInput("");
      setShowTagSuggestions(false);
      setShowForm(false);

      /*
       * Refresh suggestion list setelah save.
       * Jadi tag baru langsung masuk ke daftar reusable.
       */
      await loadAvailableTags();
    } finally {
      setSaving(false);
    }
  }

  async function deletePerson(person: Person) {
    const confirmed = window.confirm(
      `Hapus "${person.name}"?\n\nData person ini akan dihapus dari People Archive.`
    );

    if (!confirmed) return;

    setDeletingPersonId(person.id);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("PEOPLE: USER ERROR", userError);
        return;
      }

      /*
       * Hapus moments terlebih dahulu supaya relasi
       * person_moments tidak menghalangi penghapusan
       * person jika foreign key tidak menggunakan
       * ON DELETE CASCADE.
       */
      const { error: momentsError } = await supabase
        .from("person_moments")
        .delete()
        .eq("person_id", person.id)
        .eq("user_id", user.id);

      if (momentsError) {
        console.error(
          "PEOPLE: MOMENTS DELETE ERROR",
          momentsError
        );
      }

      const { error } = await supabase
        .from("people")
        .delete()
        .eq("id", person.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("PEOPLE: DELETE ERROR", error);
        return;
      }

      setPeople((currentPeople) =>
        currentPeople.filter(
          (item) => item.id !== person.id
        )
      );
    } finally {
      setDeletingPersonId(null);
    }
  }

  const filteredPeople = useMemo(() => {
    const filtered = people.filter((person) => {
      const zodiac = getZodiac(person.birth_date);

      /*
       * Person lama mungkin shio-nya NULL.
       * Jadi tetap hitung fallback dari birth_date.
       */
      const calculatedShio =
        person.shio ||
        getShioFromBirthDate(person.birth_date);

      const matchesMbti =
        !filterMbti ||
        person.mbti === filterMbti;

      const matchesZodiac =
        !filterZodiac ||
        zodiac === filterZodiac;

      const matchesShio =
        !filterShio ||
        calculatedShio === filterShio;

      const matchesBloodType =
        !filterBloodType ||
        person.blood_type === filterBloodType;

      return (
        matchesMbti &&
        matchesZodiac &&
        matchesShio &&
        matchesBloodType
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "az") {
        return a.name.localeCompare(
          b.name,
          undefined,
          {
            sensitivity: "base",
          }
        );
      }

      const aTime = new Date(
        a.created_at
      ).getTime();

      const bTime = new Date(
        b.created_at
      ).getTime();

      if (sortOrder === "oldest") {
        return aTime - bTime;
      }

      return bTime - aTime;
    });
  }, [
    people,
    filterMbti,
    filterZodiac,
    filterShio,
    filterBloodType,
    sortOrder,
  ]);

  const hasFilters = Boolean(
    filterMbti ||
      filterZodiac ||
      filterShio ||
      filterBloodType
  );

  function clearFilters() {
    setFilterMbti("");
    setFilterZodiac("");
    setFilterShio("");
    setFilterBloodType("");
  }

  return (
    <section>
      {/* HEADER */}
      <div className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Archive / People
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#3f382f]">
              People
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746a5e]">
              People who became part of your story.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="rounded-xl bg-[#8b6f5a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
          >
            + Add Person
          </button>
        </div>
      </div>

      {/* FILTERS */}
      {!loading && people.length > 0 && (
        <div className="mt-6 rounded-2xl bg-[#f7f2ea] p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            {/* MBTI */}
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                MBTI
              </label>

              <select
                value={filterMbti}
                onChange={(event) =>
                  setFilterMbti(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              >
                <option value="">
                  All MBTI
                </option>

                {MBTI_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* ZODIAC */}
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Zodiac
              </label>

              <select
                value={filterZodiac}
                onChange={(event) =>
                  setFilterZodiac(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              >
                <option value="">
                  All Zodiac
                </option>

                {ZODIAC_TYPES.map(
                  (zodiac) => (
                    <option
                      key={zodiac}
                      value={zodiac}
                    >
                      {getZodiacSymbol(
                        zodiac
                      )}{" "}
                      {zodiac}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SHIO */}
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Shio
              </label>

              <select
                value={filterShio}
                onChange={(event) =>
                  setFilterShio(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              >
                <option value="">
                  All Shio
                </option>

                {SHIO_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {getShioSymbol(
                        type
                      )}{" "}
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* BLOOD TYPE */}
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Blood Type
              </label>

              <select
                value={filterBloodType}
                onChange={(event) =>
                  setFilterBloodType(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              >
                <option value="">
                  All Blood Types
                </option>

                {BLOOD_TYPES.map(
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
            </div>

            {/* SORT */}
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-[#8a7e70]">
                Sort
              </label>

              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              >
                <option value="newest">
                  Terbaru
                </option>

                <option value="oldest">
                  Terlama
                </option>

                <option value="az">
                  A–Z
                </option>
              </select>
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-xl border border-[#d8cec0] px-4 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8]"
            >
              Clear filters
            </button>
          )}

          <p className="mt-3 text-xs text-[#8a7e70]">
            Showing{" "}
            {filteredPeople.length} of{" "}
            {people.length} people
          </p>
        </div>
      )}

      {/* ADD PERSON FORM */}
      {showForm && (
        <div className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              New person
            </p>

            <h3 className="mt-2 text-xl font-bold text-[#3f382f]">
              Add someone to your archive
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#746a5e]">
              Start with the basic information. You can add more details later.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {/* NAME */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Their name"
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            {/* PHOTO */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Photo
              </label>

              <div className="mt-2 flex h-32 items-center justify-center rounded-xl border border-dashed border-[#d8cec0] bg-[#ebe3d8]">
                <div className="text-center">
                  <div className="text-3xl">
                    📷
                  </div>

                  <p className="mt-2 text-xs text-[#8a7e70]">
                    Photo upload will come later
                  </p>
                </div>
              </div>
            </div>

            {/* BIRTH DATE */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Birth date
              </label>

              <input
                type="date"
                value={birthDate}
                onChange={(event) =>
                  handleBirthDateChange(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              />

              {birthDate && (
                <div className="mt-3 rounded-xl bg-[#ebe3d8] px-4 py-3 text-xs text-[#746a5e]">
                  <p>
                    Zodiac:{" "}
                    {getZodiacSymbol(
                      getZodiac(
                        birthDate
                      )
                    )}{" "}
                    {getZodiac(
                      birthDate
                    )}
                  </p>

                  <p className="mt-1">
                    Shio:{" "}
                    {getShioSymbol(
                      shio
                    )}{" "}
                    {shio}
                  </p>

                  <p className="mt-1">
                    Life Path:{" "}
                    {getLifePathNumber(
                      birthDate
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* SHIO AUTO */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Shio
              </label>

              <div className="mt-2 flex min-h-[48px] items-center rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f]">
                {shio ? (
                  <>
                    <span className="mr-2">
                      {getShioSymbol(
                        shio
                      )}
                    </span>

                    {shio}
                  </>
                ) : (
                  <span className="text-[#a69a8b]">
                    Select birth date first
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-[#8a7e70]">
                Automatically calculated from birth date.
              </p>
            </div>

            {/* BLOOD TYPE */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Blood type
              </label>

              <select
                value={bloodType}
                onChange={(event) =>
                  setBloodType(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              >
                <option value="">
                  Select blood type
                </option>

                {BLOOD_TYPES.map(
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
            </div>

            {/* ADDRESS */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Address
              </label>

              <textarea
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target.value
                  )
                }
                placeholder="Where they live..."
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            {/* MBTI */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                MBTI
              </label>

              <select
                value={mbti}
                onChange={(event) =>
                  setMbti(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8b6f5a]"
              >
                <option value="">
                  Select MBTI
                </option>

                {MBTI_TYPES.map(
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
            </div>

            {/* CHARACTERISTICS */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Characteristics
              </label>

              <textarea
                value={characteristics}
                onChange={(event) =>
                  setCharacteristics(
                    event.target.value
                  )
                }
                placeholder="Kind, funny, quiet, ambitious..."
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
              />
            </div>

            {/* TAGS */}
            <div>
              <label className="text-sm font-medium text-[#3f382f]">
                Tags
              </label>

              {/* SELECTED TAGS */}
              {currentTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentTags.map(
                    (tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-[#8b6f5a] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {tag}

                        <button
                          type="button"
                          onClick={() =>
                            removeTag(
                              tag
                            )
                          }
                          className="ml-1 rounded-full text-white/80 hover:text-white"
                          aria-label={`Remove ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    )
                  )}
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(event) =>
                    setTagInput(
                      event.target.value
                    )
                  }
                  onFocus={() =>
                    setShowTagSuggestions(
                      true
                    )
                  }
                  onKeyDown={
                    handleTagInputKeyDown
                  }
                  placeholder={
                    currentTags.length > 0
                      ? "Add another tag..."
                      : "friend, classmate, important"
                  }
                  className="mt-3 w-full rounded-xl border border-[#d8cec0] bg-[#ebe3d8] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#a69a8b] focus:border-[#8b6f5a]"
                />

                {/* EXISTING TAG SUGGESTIONS */}
                {showTagSuggestions &&
                  filteredTagSuggestions.length >
                    0 && (
                    <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-[#d8cec0] bg-[#f7f2ea] shadow-lg">
                      <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a8c7c]">
                        Existing tags
                      </div>

                      {filteredTagSuggestions.map(
                        (tag) => (
                          <button
                            type="button"
                            key={tag}
                            onMouseDown={(
                              event
                            ) =>
                              event.preventDefault()
                            }
                            onClick={() => {
                              addTag(tag);
                              setShowTagSuggestions(
                                true
                              );
                            }}
                            className="block w-full px-4 py-2.5 text-left text-sm text-[#746a5e] transition hover:bg-[#ebe3d8]"
                          >
                            #{tag}
                          </button>
                        )
                      )}
                    </div>
                  )}
              </div>

              {/* ADD NEW TAG */}
              {tagInput.trim() &&
                !currentTags.some(
                  (tag) =>
                    tag.toLowerCase() ===
                    tagInput
                      .trim()
                      .toLowerCase()
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      addTag(tagInput)
                    }
                    className="mt-2 rounded-lg bg-[#ebe3d8] px-3 py-2 text-xs font-medium text-[#746a5e] transition hover:bg-[#ddd3c6]"
                  >
                    + Add “
                    {tagInput.trim()}”
                  </button>
                )}

              <p className="mt-2 text-xs text-[#8a7e70]">
                Press Enter to add a tag. Existing tags will appear automatically.
              </p>
            </div>
          </div>

          {/* FORM BUTTONS */}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-xl border border-[#d8cec0] px-5 py-2.5 text-sm font-medium text-[#746a5e] transition hover:bg-[#ebe3d8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={savePerson}
              disabled={
                saving ||
                !name.trim()
              }
              className="rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Person"}
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="mt-6 rounded-2xl bg-[#f7f2ea] p-6 shadow-sm">
          <p className="text-sm text-[#746a5e]">
            Loading people...
          </p>
        </div>
      )}

      {/* PEOPLE LIST */}
      {!loading &&
        filteredPeople.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPeople.map(
              (person) => {
                const zodiac =
                  getZodiac(
                    person.birth_date
                  );

                const zodiacSymbol =
                  getZodiacSymbol(
                    zodiac
                  );

                const lifePathNumber =
                  getLifePathNumber(
                    person.birth_date
                  );

                const calculatedShio =
                  person.shio ||
                  getShioFromBirthDate(
                    person.birth_date
                  );

                return (
                  <article
                    key={person.id}
                    className="group relative w-full rounded-2xl bg-[#f7f2ea] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f2ece3]"
                  >
                    {/* TOP */}
                    <div className="flex items-start justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenPerson(
                            person.id
                          )
                        }
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ebe3d8] text-2xl"
                        aria-label={`Open ${person.name}`}
                      >
                        👤
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPerson(
                              person.id
                            )
                          }
                          className="text-sm text-[#b0a496] transition group-hover:translate-x-0.5"
                          aria-label={`Open ${person.name}`}
                        >
                          →
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deletePerson(
                              person
                            )
                          }
                          disabled={
                            deletingPersonId ===
                            person.id
                          }
                          className="rounded-lg p-2 text-[#a98d82] transition hover:bg-[#ebe3d8] hover:text-[#a06f63] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${person.name}`}
                          title="Delete person"
                        >
                          {deletingPersonId ===
                          person.id
                            ? "..."
                            : "🗑️"}
                        </button>
                      </div>
                    </div>

                    {/* NAME */}
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPerson(
                          person.id
                        )
                      }
                      className="mt-4 block w-full text-left"
                    >
                      <h3 className="text-lg font-semibold text-[#3f382f]">
                        {person.name}
                      </h3>
                    </button>

                    {/* BASIC BADGES */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {person.mbti && (
                        <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#8b6f5a]">
                          {person.mbti}
                        </span>
                      )}

                      {zodiac && (
                        <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]">
                          {zodiacSymbol}{" "}
                          {zodiac}
                        </span>
                      )}

                      {calculatedShio && (
                        <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]">
                          {getShioSymbol(
                            calculatedShio
                          )}{" "}
                          {calculatedShio}
                        </span>
                      )}

                      {lifePathNumber !==
                        null && (
                        <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]">
                          🔢{" "}
                          {lifePathNumber}
                        </span>
                      )}

                      {person.blood_type && (
                        <span className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]">
                          🩸{" "}
                          {
                            person.blood_type
                          }
                        </span>
                      )}
                    </div>

                    {/* BIRTH DATE */}
                    {person.birth_date && (
                      <p className="mt-3 text-xs text-[#8a7e70]">
                        🎂{" "}
                        {new Date(
                          `${person.birth_date}T00:00:00`
                        ).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                    )}

                    {/* ADDRESS */}
                    {person.address && (
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#8a7e70]">
                        📍{" "}
                        {person.address}
                      </p>
                    )}

                    {/* CHARACTERISTICS */}
                    {person.characteristics && (
                      <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#746a5e]">
                        {
                          person.characteristics
                        }
                      </p>
                    )}

                    {/* TAGS */}
                    {person.tags && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {parseTags(
                          person.tags
                        ).map(
                          (tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]"
                            >
                              {tag}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}

      {/* FILTER EMPTY */}
      {!loading &&
        people.length > 0 &&
        filteredPeople.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d8cec0] bg-[#eee7dc] p-8 text-center">
            <div className="text-4xl">
              🔎
            </div>

            <h3 className="mt-4 text-lg font-semibold text-[#3f382f]">
              No people found.
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746a5e]">
              No one matches the current filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
            >
              Clear filters
            </button>
          </div>
        )}

      {/* EMPTY STATE */}
      {!loading &&
        people.length === 0 &&
        !showForm && (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d8cec0] bg-[#eee7dc] p-8 text-center">
            <div className="text-4xl">
              👥
            </div>

            <h3 className="mt-4 text-lg font-semibold text-[#3f382f]">
              Your people archive is empty.
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746a5e]">
              Add someone important to your story and start keeping their memories, details, and moments in one place.
            </p>

            <button
              type="button"
              onClick={openForm}
              className="mt-5 rounded-xl bg-[#8b6f5a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#765a46]"
            >
              + Add your first person
            </button>
          </div>
        )}
    </section>
  );
}