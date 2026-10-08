"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Sex = "male" | "female";

type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "extra_active";

type FatSecretFoodEntry = {
  food_entry_id: string;
  food_entry_description: string;
  date_int: string | number;
  meal: string;
  food_id: string;
  serving_id: string;
  number_of_units: string | number;
  food_entry_name: string;
  calories: string | number;
  carbohydrate: string | number;
  protein: string | number;
  fat: string | number;
  fiber?: string | number;
  sugar?: string | number;
};

type FoodLog = {
  id: string;
  raw_input: string | null;
  ai_result: Record<string, unknown> | null;
  total_calories_kcal: number | null;
  total_protein_g: number | null;
  total_fat_g: number | null;
  total_carbohydrate_g: number | null;
  created_at: string;
};

type ExistingFoodLog = {
  id: string;
  ai_result: Record<string, unknown> | null;
};

const activityOptions: {
  value: ActivityLevel;
  label: string;
  description: string;
  multiplier: number;
}[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Sedikit aktivitas fisik",
    multiplier: 1.2,
  },
  {
    value: "light",
    label: "Light",
    description: "Olahraga ringan 1–3 hari/minggu",
    multiplier: 1.375,
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Olahraga sedang 3–5 hari/minggu",
    multiplier: 1.55,
  },
  {
    value: "very_active",
    label: "Very Active",
    description: "Olahraga berat 6–7 hari/minggu",
    multiplier: 1.725,
  },
  {
    value: "extra_active",
    label: "Extra Active",
    description: "Aktivitas sangat berat / pekerjaan fisik",
    multiplier: 1.9,
  },
];

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

function calculateAge(birthDate: string | null) {
  if (!birthDate) return null;

  const birth = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

function calculateBmr(
  weight: number | null,
  height: number | null,
  age: number | null,
  sex: Sex | null
) {
  if (
    weight === null ||
    height === null ||
    age === null ||
    !sex
  ) {
    return null;
  }

  if (sex === "male") {
    return (
      10 * weight +
      6.25 * height -
      5 * age +
      5
    );
  }

  return (
    10 * weight +
    6.25 * height -
    5 * age -
    161
  );
}

function getBmiStatus(bmi: number | null) {
  if (bmi === null) {
    return {
      label: "Belum dihitung",
      description:
        "Lengkapi tinggi dan berat badan.",
    };
  }

  if (bmi < 18.5) {
    return {
      label: "Underweight",
      description:
        "IMT berada di bawah rentang normal dewasa.",
    };
  }

  if (bmi < 25) {
    return {
      label: "Normal",
      description:
        "IMT berada dalam rentang normal dewasa.",
    };
  }

  if (bmi < 30) {
    return {
      label: "Overweight",
      description:
        "IMT berada di atas rentang normal dewasa.",
    };
  }

  return {
    label: "Obesity",
    description:
      "IMT berada pada kategori obesitas dewasa.",
  };
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateToFatSecretDate(date: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const timestamp = Date.UTC(
    year,
    month - 1,
    day
  );

  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(
    timestamp / 86400000
  );
}

function asNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getMealLabel(value: unknown) {
  const meal = String(
    value ?? "Other"
  ).toLowerCase();

  if (meal === "breakfast") {
    return "Breakfast";
  }

  if (meal === "lunch") {
    return "Lunch";
  }

  if (meal === "dinner") {
    return "Dinner";
  }

  return "Other";
}

function getEntryFromLog(log: FoodLog) {
  const result = log.ai_result ?? {};

  return {
    id: String(
      result.fatsecret_food_entry_id ??
        log.id
    ),
    name: String(
      result.food_entry_name ??
        log.raw_input ??
        "Food"
    ),
    description: String(
      result.food_entry_description ??
        log.raw_input ??
        ""
    ),
    meal: getMealLabel(result.meal),
    calories: asNumber(
      log.total_calories_kcal
    ),
    protein: asNumber(
      log.total_protein_g
    ),
    carbs: asNumber(
      log.total_carbohydrate_g
    ),
    fat: asNumber(
      log.total_fat_g
    ),
    createdAt: log.created_at,
  };
}

export default function Health() {
  const [heightInput, setHeightInput] =
    useState("");

  const [weightInput, setWeightInput] =
    useState("");

  const [birthDateInput, setBirthDateInput] =
    useState("");

  const [sexInput, setSexInput] =
    useState<"" | Sex>("");

  const [activityInput, setActivityInput] =
    useState<"" | ActivityLevel>("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editingHealth, setEditingHealth] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [foodLogs, setFoodLogs] =
    useState<FoodLog[]>([]);

  const [foodLoading, setFoodLoading] =
    useState(true);

  const [foodSyncing, setFoodSyncing] =
    useState(false);

  const [foodError, setFoodError] =
    useState("");

  const [foodMessage, setFoodMessage] =
    useState("");

  useEffect(() => {
    async function loadHealth() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Kamu harus login untuk menggunakan Health."
        );

        setLoading(false);
        return;
      }

      const {
        data,
        error: fetchError,
      } =
        await supabase
          .from("health_profiles")
          .select(
            "height_cm, weight_kg, birth_date, sex, activity_level"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (fetchError) {
        console.error(
          "HEALTH LOAD ERROR:",
          fetchError
        );

        setError(
          "Data Health belum bisa dimuat."
        );

        setLoading(false);
        return;
      }

      if (data) {
        const height =
          data.height_cm !== null
            ? Number(data.height_cm)
            : null;

        const weight =
          data.weight_kg !== null
            ? Number(data.weight_kg)
            : null;

        const birthDate =
          data.birth_date || null;

        const sex: Sex | null =
          data.sex === "male" ||
          data.sex === "female"
            ? data.sex
            : null;

        const activityLevel: ActivityLevel | null =
          activityOptions.some(
            (item) =>
              item.value ===
              data.activity_level
          )
            ? (data.activity_level as ActivityLevel)
            : null;

        setHeightInput(
          height !== null
            ? String(height)
            : ""
        );

        setWeightInput(
          weight !== null
            ? String(weight)
            : ""
        );

        setBirthDateInput(
          birthDate || ""
        );

        setSexInput(
          sex || ""
        );

        setActivityInput(
          activityLevel || ""
        );

        /*
         * Data sudah ada:
         * tampilkan mode compact.
         */
        setEditingHealth(false);
      } else {
        /*
         * Belum ada data:
         * langsung buka form.
         */
        setEditingHealth(true);
      }

      setLoading(false);
    }

    void loadHealth();
  }, []);

  const height =
    Number.parseFloat(heightInput);

  const weight =
    Number.parseFloat(weightInput);

  const validHeight =
    Number.isFinite(height) &&
    height > 0;

  const validWeight =
    Number.isFinite(weight) &&
    weight > 0;

  const bmi = useMemo(() => {
    if (
      !validHeight ||
      !validWeight
    ) {
      return null;
    }

    const heightMeters =
      height / 100;

    return (
      weight /
      (heightMeters * heightMeters)
    );
  }, [
    height,
    weight,
    validHeight,
    validWeight,
  ]);

  const age = calculateAge(
    birthDateInput || null
  );

  const bmr = useMemo(
    () =>
      calculateBmr(
        validWeight
          ? weight
          : null,
        validHeight
          ? height
          : null,
        age,
        sexInput || null
      ),
    [
      validWeight,
      validHeight,
      weight,
      height,
      age,
      sexInput,
    ]
  );

  const selectedActivity =
    activityOptions.find(
      (item) =>
        item.value === activityInput
    );

  const tdee = useMemo(() => {
    if (
      bmr === null ||
      !selectedActivity
    ) {
      return null;
    }

    return (
      bmr *
      selectedActivity.multiplier
    );
  }, [
    bmr,
    selectedActivity,
  ]);

  const bmiStatus =
    getBmiStatus(bmi);

  const formattedBmi =
    bmi !== null
      ? bmi.toFixed(1)
      : "—";

  const formattedBmr =
    bmr !== null
      ? Math.round(bmr)
      : null;

  const formattedTdee =
    tdee !== null
      ? Math.round(tdee)
      : null;

  const selectedActivityLabel =
    selectedActivity?.label ??
    "Not set";

  async function saveHealth() {
    setMessage("");
    setError("");

    const parsedHeight =
      Number.parseFloat(
        heightInput
      );

    const parsedWeight =
      Number.parseFloat(
        weightInput
      );

    if (
      !Number.isFinite(
        parsedHeight
      ) ||
      parsedHeight <= 0
    ) {
      setError(
        "Tinggi badan belum valid."
      );
      return;
    }

    if (
      !Number.isFinite(
        parsedWeight
      ) ||
      parsedWeight <= 0
    ) {
      setError(
        "Berat badan belum valid."
      );
      return;
    }

    setSaving(true);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Kamu harus login terlebih dahulu."
        );
        return;
      }

      const healthData = {
        user_id: user.id,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        birth_date:
          birthDateInput || null,
        sex:
          sexInput || null,
        activity_level:
          activityInput || null,
      };

      const {
        error: upsertError,
      } =
        await supabase
          .from("health_profiles")
          .upsert(
            healthData,
            {
              onConflict:
                "user_id",
            }
          );

      if (upsertError) {
        console.error(
          "HEALTH SAVE ERROR:",
          upsertError
        );

        setError(
          "Data Health belum berhasil disimpan."
        );

        return;
      }

      setMessage(
        "Health data saved."
      );

      /*
       * Setelah berhasil disimpan,
       * tutup form agar tidak makan tempat.
       */
      setEditingHealth(false);
    } finally {
      setSaving(false);
    }
  }

  function startEditingHealth() {
    setMessage("");
    setError("");
    setEditingHealth(true);
  }

  async function loadFoodLogs() {
    setFoodLoading(true);
    setFoodError("");

    const supabase =
      createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      setFoodError(
        "Kamu harus login untuk melihat Food Log."
      );

      setFoodLogs([]);
      setFoodLoading(false);
      return;
    }

    const today =
      getLocalDateString();

    const start = new Date(
      `${today}T00:00:00`
    );

    const end = new Date(start);

    end.setDate(
      end.getDate() + 1
    );

    const {
      data,
      error: fetchError,
    } =
      await supabase
        .from("food_logs")
        .select(
          "id, raw_input, ai_result, total_calories_kcal, total_protein_g, total_fat_g, total_carbohydrate_g, created_at"
        )
        .eq("user_id", user.id)
        .gte(
          "created_at",
          start.toISOString()
        )
        .lt(
          "created_at",
          end.toISOString()
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (fetchError) {
      console.error(
        "FOOD LOG LOAD ERROR:",
        fetchError
      );

      setFoodError(
        "Food Log yang sudah ada belum bisa diperiksa."
      );

      setFoodLogs([]);
    } else {
      const logs =
        (data ?? []) as FoodLog[];

      const syncedLogs =
        logs.filter(
          (log: FoodLog) =>
            log.ai_result?.source ===
            "fatsecret"
        );

      setFoodLogs(
        syncedLogs
      );
    }

    setFoodLoading(false);
  }

  async function syncFatSecretFoodDiary() {
    setFoodSyncing(true);
    setFoodError("");
    setFoodMessage("");

    const supabase =
      createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      setFoodError(
        "Kamu harus login untuk sinkronisasi Food Diary."
      );

      setFoodSyncing(false);
      return;
    }

    const date =
      getLocalDateString();

    const dateInt =
      dateToFatSecretDate(date);

    if (dateInt === null) {
      setFoodError(
        "Tanggal hari ini tidak valid."
      );

      setFoodSyncing(false);
      return;
    }

    try {
      const response =
        await fetch(
          `/api/fatsecret/food-entries?date=${date}`,
          {
            cache: "no-store",
          }
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        payload?.error
      ) {
        throw new Error(
          payload?.error ||
            "Gagal mengambil Food Diary FatSecret."
        );
      }

      const rawEntries =
        payload?.data
          ?.food_entries
          ?.food_entry;

      const entries: FatSecretFoodEntry[] =
        Array.isArray(
          rawEntries
        )
          ? rawEntries
          : rawEntries
            ? [rawEntries]
            : [];

      const {
        data: existingData,
        error: existingError,
      } =
        await supabase
          .from("food_logs")
          .select(
            "id, ai_result"
          )
          .eq(
            "user_id",
            user.id
          );

      if (existingError) {
        throw existingError;
      }

      const existingRows =
        (existingData ?? []) as ExistingFoodLog[];

      const existingIds =
        new Set<string>();

      for (
        const row of existingRows
      ) {
        const foodEntryId =
          row.ai_result
            ?.fatsecret_food_entry_id;

        if (
          foodEntryId !==
            undefined &&
          foodEntryId !== null
        ) {
          existingIds.add(
            String(foodEntryId)
          );
        }
      }

      const newEntries =
        entries.filter(
          (
            entry: FatSecretFoodEntry
          ) =>
            !existingIds.has(
              String(
                entry.food_entry_id
              )
            )
        );

      if (
        newEntries.length > 0
      ) {
        const rows =
          newEntries.map(
            (
              entry: FatSecretFoodEntry
            ) => ({
              user_id: user.id,

              raw_input:
                entry.food_entry_description ||
                entry.food_entry_name,

              ai_result: {
                source:
                  "fatsecret",

                fatsecret_food_entry_id:
                  String(
                    entry.food_entry_id
                  ),

                food_id:
                  String(
                    entry.food_id
                  ),

                serving_id:
                  String(
                    entry.serving_id
                  ),

                food_entry_name:
                  entry.food_entry_name,

                food_entry_description:
                  entry.food_entry_description,

                meal:
                  getMealLabel(
                    entry.meal
                  ),

                number_of_units:
                  entry.number_of_units,

                date_int:
                  dateInt,
              },

              total_calories_kcal:
                asNumber(
                  entry.calories
                ),

              total_protein_g:
                asNumber(
                  entry.protein
                ),

              total_fat_g:
                asNumber(
                  entry.fat
                ),

              total_carbohydrate_g:
                asNumber(
                  entry.carbohydrate
                ),

              confidence:
                "high",

              note:
                "Synced automatically from FatSecret Food Diary.",
            })
          );

        const {
          error: insertError,
        } =
          await supabase
            .from("food_logs")
            .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      setFoodMessage(
        newEntries.length > 0
          ? `${newEntries.length} food ${
              newEntries.length === 1
                ? "entry"
                : "entries"
            } synced from FatSecret.`
          : "Food Diary FatSecret sudah tersinkron."
      );

      await loadFoodLogs();
    } catch (err) {
      console.error(
        "FATSECRET FOOD DIARY SYNC ERROR:",
        err
      );

      setFoodError(
        err instanceof Error
          ? err.message
          : "Gagal menyinkronkan Food Diary FatSecret."
      );
    } finally {
      setFoodSyncing(false);
    }
  }

  useEffect(() => {
    void loadFoodLogs().then(
      () =>
        syncFatSecretFoodDiary()
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayEntries =
    useMemo(
      () =>
        foodLogs.map(
          getEntryFromLog
        ),
      [foodLogs]
    );

  const nutritionTotals =
    useMemo(
      () =>
        todayEntries.reduce(
          (
            total,
            item
          ) => {
            total.calories +=
              item.calories;

            total.protein +=
              item.protein;

            total.carbs +=
              item.carbs;

            total.fat +=
              item.fat;

            return total;
          },
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }
        ),
      [todayEntries]
    );

  const calorieProgress =
    tdee && tdee > 0
      ? Math.min(
          100,
          (
            nutritionTotals.calories /
            tdee
          ) * 100
        )
      : 0;

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <p className="text-xs uppercase tracking-widest opacity-50">
          HEALTH
        </p>

        <h2 className="mt-1 text-2xl font-bold">
          Your Body
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 opacity-60">
          Simpan data dasar tubuhmu untuk
          menghitung IMT, BMR, dan estimasi
          kebutuhan energi harian.
        </p>
      </section>

      {/* =====================================================
          BODY PROFILE
          BASIC INFORMATION + YOUR NUMBERS
          ===================================================== */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">

        {/* SECTION HEADER */}

        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              BODY PROFILE
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Basic Information
            </h3>
          </div>

          {!loading &&
            !editingHealth && (
              <button
                type="button"
                onClick={
                  startEditingHealth
                }
                className="rounded-xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-2 text-sm font-semibold transition hover:bg-[#eee7dc]"
              >
                ✎ Edit
              </button>
            )}

        </div>

        {/* =================================================
            COMPACT VIEW
            ================================================= */}

        {!loading &&
          !editingHealth && (
            <>

              {/* BASIC INFO COMPACT */}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-2xl bg-[#f5f0e8] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider opacity-40">
                    Height
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {validHeight
                      ? `${height} cm`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f0e8] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider opacity-40">
                    Weight
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {validWeight
                      ? `${weight} kg`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f0e8] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider opacity-40">
                    Sex
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {sexInput ===
                    "male"
                      ? "Male"
                      : sexInput ===
                        "female"
                        ? "Female"
                        : "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f0e8] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider opacity-40">
                    Activity
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {selectedActivityLabel}
                  </p>
                </div>

              </div>

              <div className="mt-3 rounded-2xl bg-[#f5f0e8] px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-wider opacity-40">
                    Birth date
                  </p>

                  <p className="text-sm font-semibold">
                    {birthDateInput
                      ? new Date(
                          `${birthDateInput}T00:00:00`
                        ).toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              {/* YOUR NUMBERS */}

              <div className="mt-6 border-t border-[#ded4c7] pt-6">

                <div className="mb-4">
                  <p className="text-xs uppercase tracking-widest opacity-50">
                    YOUR NUMBERS
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    Body Metrics
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                  {/* IMT */}

                  <div className="rounded-2xl bg-[#f5f0e8] p-4">
                    <p className="text-xs uppercase tracking-widest opacity-50">
                      IMT
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-3xl font-bold">
                        {formattedBmi}
                      </span>

                      {bmi !==
                        null && (
                        <span className="pb-1 text-xs opacity-40">
                          kg/m²
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm font-semibold">
                      {
                        bmiStatus.label
                      }
                    </p>

                    <p className="mt-1 text-xs leading-5 opacity-50">
                      {
                        bmiStatus.description
                      }
                    </p>
                  </div>

                  {/* AGE */}

                  <div className="rounded-2xl bg-[#f5f0e8] p-4">
                    <p className="text-xs uppercase tracking-widest opacity-50">
                      AGE
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-3xl font-bold">
                        {age !==
                        null
                          ? age
                          : "—"}
                      </span>

                      {age !==
                        null && (
                        <span className="pb-1 text-xs opacity-40">
                          years
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-5 opacity-50">
                      Calculated from your birth date.
                    </p>
                  </div>

                  {/* BMR */}

                  <div className="rounded-2xl bg-[#f5f0e8] p-4">
                    <p className="text-xs uppercase tracking-widest opacity-50">
                      BMR
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-3xl font-bold">
                        {formattedBmr !==
                        null
                          ? formattedBmr
                          : "—"}
                      </span>

                      {formattedBmr !==
                        null && (
                        <span className="pb-1 text-xs opacity-40">
                          kcal/day
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-5 opacity-50">
                      Energy needed at complete rest.
                    </p>
                  </div>

                  {/* TDEE */}

                  <div className="rounded-2xl bg-[#f5f0e8] p-4">
                    <p className="text-xs uppercase tracking-widest opacity-50">
                      TDEE
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-3xl font-bold">
                        {formattedTdee !==
                        null
                          ? formattedTdee
                          : "—"}
                      </span>

                      {formattedTdee !==
                        null && (
                        <span className="pb-1 text-xs opacity-40">
                          kcal/day
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-5 opacity-50">
                      Estimated daily energy expenditure.
                    </p>
                  </div>

                </div>
              </div>

            </>
          )}

        {/* =================================================
            EDIT MODE
            ================================================= */}

        {!loading &&
          editingHealth && (
            <div className="mt-5">

              <div className="grid gap-4 md:grid-cols-2">

                {/* HEIGHT */}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Height
                  </span>

                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.1"
                      value={
                        heightInput
                      }
                      onChange={(
                        event
                      ) =>
                        setHeightInput(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="e.g. 170"
                      className="w-full rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 pr-16 text-sm outline-none transition focus:border-[#a99b8a]"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs opacity-40">
                      cm
                    </span>
                  </div>
                </label>

                {/* WEIGHT */}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Weight
                  </span>

                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.1"
                      value={
                        weightInput
                      }
                      onChange={(
                        event
                      ) =>
                        setWeightInput(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="e.g. 60"
                      className="w-full rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 pr-16 text-sm outline-none transition focus:border-[#a99b8a]"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs opacity-40">
                      kg
                    </span>
                  </div>
                </label>

                {/* BIRTH DATE */}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Birth date
                  </span>

                  <input
                    type="date"
                    value={
                      birthDateInput
                    }
                    onChange={(
                      event
                    ) =>
                      setBirthDateInput(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none transition focus:border-[#a99b8a]"
                  />
                </label>

                {/* SEX */}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Sex
                  </span>

                  <select
                    value={
                      sexInput
                    }
                    onChange={(
                      event
                    ) =>
                      setSexInput(
                        event
                          .target
                          .value as
                          | ""
                          | Sex
                      )
                    }
                    className="w-full rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none transition focus:border-[#a99b8a]"
                  >
                    <option value="">
                      Select sex
                    </option>

                    <option value="male">
                      Male
                    </option>

                    <option value="female">
                      Female
                    </option>
                  </select>
                </label>

                {/* ACTIVITY */}

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium">
                    Activity level
                  </span>

                  <select
                    value={
                      activityInput
                    }
                    onChange={(
                      event
                    ) =>
                      setActivityInput(
                        event
                          .target
                          .value as
                          | ""
                          | ActivityLevel
                      )
                    }
                    className="w-full rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none transition focus:border-[#a99b8a]"
                  >
                    <option value="">
                      Select activity level
                    </option>

                    {activityOptions.map(
                      (
                        option
                      ) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }{" "}
                          —{" "}
                          {
                            option.description
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-5 rounded-2xl border border-[#dec5bd] bg-[#f7ebe7] px-4 py-3 text-sm text-[#7a5147]">
                  {error}
                </div>
              )}

              {/* MESSAGE */}

              {message && (
                <div className="mt-5 rounded-2xl border border-[#c8d7c5] bg-[#eef5eb] px-4 py-3 text-sm text-[#53654f]">
                  {message}
                </div>
              )}

              {/* SAVE / CANCEL */}

              <div className="mt-5 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() => {
                    if (
                      heightInput ||
                      weightInput ||
                      birthDateInput ||
                      sexInput ||
                      activityInput
                    ) {
                      setEditingHealth(
                        false
                      );
                    }
                  }}
                  disabled={
                    saving
                  }
                  className="rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-5 py-3 text-sm font-semibold transition hover:bg-[#eee7dc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveHealth
                  }
                  disabled={
                    saving
                  }
                  className="rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f382f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving
                    ? "Saving..."
                    : "Save Health"}
                </button>

              </div>

            </div>
          )}

        {/* =================================================
            LOADING
            ================================================= */}

        {loading && (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4 text-sm opacity-60">
            Loading health data...
          </div>
        )}

      </section>

      {/* =====================================================
          ESTIMATED CALORIE NEEDS
          ===================================================== */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">

        <p className="text-xs uppercase tracking-widest opacity-50">
          DAILY ENERGY
        </p>

        <h3 className="mt-1 text-xl font-bold">
          Estimated Calorie Needs
        </h3>

        {tdee !== null ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-50">
                Maintain
              </p>

              <p className="mt-1 text-2xl font-bold">
                {Math.round(
                  tdee
                )}
              </p>

              <p className="mt-1 text-xs opacity-50">
                kcal/day
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-50">
                Mild deficit
              </p>

              <p className="mt-1 text-2xl font-bold">
                {Math.round(
                  tdee * 0.9
                )}
              </p>

              <p className="mt-1 text-xs opacity-50">
                ~10% below maintenance
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-50">
                Mild surplus
              </p>

              <p className="mt-1 text-2xl font-bold">
                {Math.round(
                  tdee * 1.1
                )}
              </p>

              <p className="mt-1 text-xs opacity-50">
                ~10% above maintenance
              </p>
            </div>

          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4 text-sm leading-6 opacity-60">
            Lengkapi tanggal lahir,
            jenis kelamin, tinggi, berat,
            dan activity level untuk
            menghitung estimasi kebutuhan
            energi.
          </div>
        )}

        <p className="mt-4 text-xs leading-5 opacity-40">
          Angka ini merupakan estimasi dan
          bukan diagnosis medis.
        </p>

      </section>

      {/* =====================================================
          DAILY NUTRITION
          ===================================================== */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              NUTRITION
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Daily Nutrition
            </h3>

            <p className="mt-1 text-sm opacity-50">
              Automatically synced from your
              FatSecret Food Diary.
            </p>
          </div>

          <button
            type="button"
            onClick={
              syncFatSecretFoodDiary
            }
            disabled={
              foodSyncing
            }
            className="rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-2.5 text-sm font-semibold transition hover:bg-[#eee7dc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {foodSyncing
              ? "Syncing..."
              : "Sync FatSecret"}
          </button>

        </div>

        {foodError && (
          <div className="mt-4 rounded-2xl border border-[#dec5bd] bg-[#f7ebe7] px-4 py-3 text-sm text-[#7a5147]">
            {foodError}
          </div>
        )}

        {foodMessage && (
          <div className="mt-4 rounded-2xl border border-[#c8d7c5] bg-[#eef5eb] px-4 py-3 text-sm text-[#53654f]">
            {foodMessage}
          </div>
        )}

        {/* SUMMARY */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Consumed
            </p>

            <p className="mt-1 text-2xl font-bold">
              {Math.round(
                nutritionTotals.calories
              )}
            </p>

            <p className="mt-1 text-xs opacity-50">
              kcal
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              TDEE
            </p>

            <p className="mt-1 text-2xl font-bold">
              {formattedTdee ??
                "—"}
            </p>

            <p className="mt-1 text-xs opacity-50">
              kcal/day
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Remaining
            </p>

            <p className="mt-1 text-2xl font-bold">
              {tdee !== null
                ? Math.max(
                    0,
                    Math.round(
                      tdee -
                        nutritionTotals.calories
                    )
                  )
                : "—"}
            </p>

            <p className="mt-1 text-xs opacity-50">
              kcal
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Entries
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                todayEntries.length
              }
            </p>

            <p className="mt-1 text-xs opacity-50">
              today
            </p>
          </div>

        </div>

        {/* CALORIE PROGRESS */}

        <div className="mt-5">

          <div className="mb-2 flex items-center justify-between text-xs opacity-50">
            <span>
              Daily calorie progress
            </span>

            <span>
              {Math.round(
                calorieProgress
              )}
              %
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#e6ddd1]">
            <div
              className="h-full rounded-full bg-[#4f473e] transition-all"
              style={{
                width: `${calorieProgress}%`,
              }}
            />
          </div>

        </div>

        {/* MACROS */}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl border border-[#e0d7cc] p-4">
            <p className="text-xs opacity-50">
              Protein
            </p>

            <p className="mt-1 text-xl font-bold">
              {nutritionTotals.protein.toFixed(
                1
              )}{" "}
              g
            </p>
          </div>

          <div className="rounded-2xl border border-[#e0d7cc] p-4">
            <p className="text-xs opacity-50">
              Carbs
            </p>

            <p className="mt-1 text-xl font-bold">
              {nutritionTotals.carbs.toFixed(
                1
              )}{" "}
              g
            </p>
          </div>

          <div className="rounded-2xl border border-[#e0d7cc] p-4">
            <p className="text-xs opacity-50">
              Fat
            </p>

            <p className="mt-1 text-xl font-bold">
              {nutritionTotals.fat.toFixed(
                1
              )}{" "}
              g
            </p>
          </div>

        </div>

      </section>

      {/* =====================================================
          TODAY'S FOOD LOG
          ===================================================== */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">

        <div className="flex items-start justify-between gap-3">

          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              TODAY
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Today's Food Log
            </h3>
          </div>

          {!foodLoading && (
            <span className="rounded-full bg-[#f5f0e8] px-3 py-1 text-xs opacity-60">
              {
                todayEntries.length
              }{" "}
              entries
            </span>
          )}

        </div>

        {foodLoading ? (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4 text-sm opacity-60">
            Syncing today's food
            diary...
          </div>
        ) : todayEntries.length ===
          0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cfc3b4] p-5 text-sm leading-6 opacity-50">
            Belum ada makanan tercatat
            hari ini di FatSecret.
          </div>
        ) : (
          <div className="mt-5 space-y-3">

            {todayEntries.map(
              (entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl bg-[#f5f0e8] p-4"
                >

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <p className="font-semibold">
                        {entry.name}
                      </p>

                      <p className="mt-1 text-xs opacity-50">
                        {entry.meal} ·{" "}
                        {new Date(
                          entry.createdAt
                        ).toLocaleTimeString(
                          "id-ID",
                          {
                            hour: "2-digit",
                            minute:
                              "2-digit",
                          }
                        )}
                      </p>

                    </div>

                    <div className="text-left sm:text-right">

                      <p className="font-semibold">
                        {Math.round(
                          entry.calories
                        )}{" "}
                        kcal
                      </p>

                      <p className="mt-1 text-xs opacity-50">
                        P{" "}
                        {entry.protein.toFixed(
                          1
                        )}{" "}
                        g · C{" "}
                        {entry.carbs.toFixed(
                          1
                        )}{" "}
                        g · F{" "}
                        {entry.fat.toFixed(
                          1
                        )}{" "}
                        g
                      </p>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </section>

    </div>
  );
}