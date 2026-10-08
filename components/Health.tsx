"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Sex = "male" | "female";

type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "extra_active";

type HealthData = {
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
};

type FatSecretFood = {
  food_id: string;
  food_name: string;
  food_description: string;
  food_type: string;
  brand_name?: string;
  food_url?: string;
};

type FatSecretServing = {
  serving_id?: string;
  serving_description?: string;
  metric_serving_amount?: string | number;
  metric_serving_unit?: string;
  number_of_units?: string | number;
  measurement_description?: string;
  is_default?: string | number | boolean;
  calories?: string | number;
  carbohydrate?: string | number;
  protein?: string | number;
  fat?: string | number;
};

type NutritionResult = {
  name: string;
  quantity: number;
  unit: string;
  estimated_grams: number;
  confidence: "high" | "medium" | "low";
  note: string;
  matched_food: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  match_confidence: "high" | "medium" | "low";
  serving_description?: string;
  source: "fatsecret";
};

type DailyFoodLog = {
  id: string;
  raw_input: string | null;
  total_calories_kcal: number | null;
  total_protein_g: number | null;
  total_fat_g: number | null;
  total_carbohydrate_g: number | null;
  created_at: string;
  ai_result?: {
    fatsecret_food_entry_id?: string;
    source?: string;
    food_entry_name?: string;
    food_entry_description?: string;
    meal?: string;
  } | null;
};

const defaultHealthData: HealthData = {
  height_cm: null,
  weight_kg: null,
  birth_date: null,
  sex: null,
  activity_level: null,
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
    description:
      "Aktivitas sangat berat / pekerjaan fisik",
    multiplier: 1.9,
  },
];

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

  const month =
    today.getMonth() -
    birth.getMonth();

  if (
    month < 0 ||
    (month === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return Math.max(0, age);
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,!?()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

const numberWords: Record<string, number> = {
  nol: 0,
  satu: 1,
  sebuah: 1,
  sebutir: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
};

const unitNames = [
  "sendok makan",
  "sendok teh",
  "kilogram",
  "centong",
  "mangkuk",
  "mangkok",
  "piring",
  "gelas",
  "cangkir",
  "botol",
  "bungkus",
  "potong",
  "butir",
  "lembar",
  "sendok",
  "sdm",
  "sdt",
  "gram",
  "kg",
  "ons",
  "buah",
  "iris",
  "porsi",
  "serving",
  "portion",
  "cup",
  "ml",
  "liter",
  "litre",
  "l",
  "g",
];

function normalizeUnit(value: string) {
  const unit = normalizeText(value);

  const aliases: Record<string, string> = {
    grams: "g",
    gram: "g",
    kilogram: "kg",
    kilograms: "kg",
    liter: "l",
    litre: "l",
    milliliter: "ml",
    portion: "porsi",
    serving: "porsi",
    cups: "cup",
    glass: "gelas",
    tbsp: "sdm",
    tablespoon: "sdm",
    tsp: "sdt",
    teaspoon: "sdt",
    slices: "potong",
    slice: "potong",
    pieces: "buah",
    piece: "buah",
    mangkok: "mangkuk",
  };

  return aliases[unit] ?? unit;
}

function parseNumber(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(",", ".")
    .trim();

  const numeric = Number(normalized);

  return Number.isFinite(numeric)
    ? numeric
    : numberWords[normalized] ?? 1;
}

function parseFoodEntry(input: string) {
  const text = input.trim();

  const unitPattern = unitNames
    .map((x) =>
      x.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )
    )
    .sort((a, b) => b.length - a.length)
    .join("|");

  const numberPattern =
    "(?:\\d+(?:[.,]\\d+)?|nol|satu|sebuah|sebutir|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)";

  const endRegex = new RegExp(
    `(?:^|\\s)(${numberPattern})\\s+(${unitPattern})\\s*$`,
    "i"
  );

  const startRegex = new RegExp(
    `^(${numberPattern})\\s+(${unitPattern})\\s+(.+)$`,
    "i"
  );

  const start = text.match(startRegex);

  if (start) {
    return {
      name: start[3].trim(),
      quantity: parseNumber(start[1]),
      unit: normalizeUnit(start[2]),
    };
  }

  const end = text.match(endRegex);

  if (end) {
    const name = text
      .slice(0, end.index ?? text.length)
      .trim();

    return {
      name,
      quantity: parseNumber(end[1]),
      unit: normalizeUnit(end[2]),
    };
  }

  const numberOnly = text.match(
    new RegExp(
      `^(${numberPattern})\\s+(.+)$`,
      "i"
    )
  );

  if (numberOnly) {
    return {
      name: numberOnly[2].trim(),
      quantity: parseNumber(numberOnly[1]),
      unit: "porsi",
    };
  }

  return {
    name: text,
    quantity: 1,
    unit: "porsi",
  };
}

function splitFoodInput(text: string) {
  return text
    .split(
      /\s*\+\s*|\s*,\s*|\s+dan\s+/i
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeServings(value: unknown) {
  if (!value) return [];

  return Array.isArray(value)
    ? (value as FatSecretServing[])
    : [value as FatSecretServing];
}

function isDefaultServing(
  serving: FatSecretServing
) {
  return (
    serving.is_default === true ||
    serving.is_default === 1 ||
    serving.is_default === "1"
  );
}

function chooseServing(
  servings: FatSecretServing[],
  requestedUnit: string
) {
  if (!servings.length) return null;

  const unit = normalizeUnit(requestedUnit);

  if (unit === "g") {
    const gram = servings.find(
      (serving) =>
        String(
          serving.metric_serving_unit ?? ""
        ).toLowerCase() === "g"
    );

    if (gram) return gram;
  }

  if (unit === "ml") {
    const ml = servings.find(
      (serving) =>
        String(
          serving.metric_serving_unit ?? ""
        ).toLowerCase() === "ml"
    );

    if (ml) return ml;
  }

  if (
    unit === "kg" ||
    unit === "l"
  ) {
    const metricUnit =
      unit === "kg" ? "g" : "ml";

    const metric = servings.find(
      (serving) =>
        String(
          serving.metric_serving_unit ?? ""
        ).toLowerCase() === metricUnit
    );

    if (metric) return metric;
  }

  if (unit !== "porsi") {
    const match = servings.find(
      (serving) => {
        const measurement =
          normalizeText(
            String(
              serving.measurement_description ??
                ""
            )
          );

        const description =
          normalizeText(
            String(
              serving.serving_description ??
                ""
            )
          );

        return (
          measurement.includes(unit) ||
          description.includes(unit)
        );
      }
    );

    if (match) return match;
  }

  return (
    servings.find(isDefaultServing) ??
    servings[0]
  );
}

function calculateServingMultiplier(
  quantity: number,
  requestedUnit: string,
  serving: FatSecretServing
) {
  const unit =
    normalizeUnit(requestedUnit);

  const metricAmount = Number(
    serving.metric_serving_amount
  );

  const numberOfUnits = Number(
    serving.number_of_units
  );

  if (
    unit === "g" &&
    metricAmount > 0
  ) {
    return quantity / metricAmount;
  }

  if (
    unit === "kg" &&
    metricAmount > 0
  ) {
    return (
      (quantity * 1000) /
      metricAmount
    );
  }

  if (
    unit === "ml" &&
    metricAmount > 0
  ) {
    return quantity / metricAmount;
  }

  if (
    unit === "l" &&
    metricAmount > 0
  ) {
    return (
      (quantity * 1000) /
      metricAmount
    );
  }

  if (
    Number.isFinite(numberOfUnits) &&
    numberOfUnits > 0
  ) {
    return quantity / numberOfUnits;
  }

  return quantity;
}

function getLocalDateString(
  date = new Date()
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalDayRange(
  date = new Date()
) {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export default function Health() {
  const [health, setHealth] =
    useState<HealthData>(
      defaultHealthData
    );

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

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // =========================
  // FOOD LOG
  // =========================

  const [foodInput, setFoodInput] =
    useState("");

  const [foodLoading, setFoodLoading] =
    useState(false);

  const [foodError, setFoodError] =
    useState("");

  const [foodAnalysis, setFoodAnalysis] =
    useState<{ note: string } | null>(
      null
    );

  const [nutritionResults, setNutritionResults] =
    useState<NutritionResult[]>([]);

  const [foodSearch, setFoodSearch] =
    useState("");

  const [foodSearchResults, setFoodSearchResults] =
    useState<FatSecretFood[]>([]);

  const [foodSearchLoading, setFoodSearchLoading] =
    useState(false);

  const [foodSearchError, setFoodSearchError] =
    useState("");

  const [nutritionTotals, setNutritionTotals] =
    useState({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

  // =========================
  // DAILY FOOD
  // =========================

  const [dailyFoodLogs, setDailyFoodLogs] =
    useState<DailyFoodLog[]>([]);

  const [dailyFoodLoading, setDailyFoodLoading] =
    useState(true);

  const [dailyFoodSyncing, setDailyFoodSyncing] =
    useState(false);

  const [dailyFoodError, setDailyFoodError] =
    useState("");

  const [dailyFoodMessage, setDailyFoodMessage] =
    useState("");

  // =========================
  // LOAD HEALTH
  // =========================

  useEffect(() => {
    async function loadHealth() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "Kamu harus login untuk menggunakan Health."
        );

        setLoading(false);
        return;
      }

      const {
        data,
        error: fetchError,
      } = await supabase
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
        const next: HealthData = {
          height_cm:
            data.height_cm == null
              ? null
              : Number(data.height_cm),

          weight_kg:
            data.weight_kg == null
              ? null
              : Number(data.weight_kg),

          birth_date:
            data.birth_date || null,

          sex:
            data.sex === "male" ||
            data.sex === "female"
              ? data.sex
              : null,

          activity_level:
            activityOptions.some(
              (item) =>
                item.value ===
                data.activity_level
            )
              ? data.activity_level
              : null,
        };

        setHealth(next);

        setHeightInput(
          next.height_cm == null
            ? ""
            : String(next.height_cm)
        );

        setWeightInput(
          next.weight_kg == null
            ? ""
            : String(next.weight_kg)
        );

        setBirthDateInput(
          next.birth_date || ""
        );

        setSexInput(
          next.sex || ""
        );

        setActivityInput(
          next.activity_level || ""
        );
      }

      setLoading(false);
    }

    loadHealth();
  }, []);

  // =========================
  // BODY CALCULATIONS
  // =========================

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

  const age = calculateAge(
    birthDateInput || null
  );

  const bmi = useMemo(() => {
    if (
      !validHeight ||
      !validWeight
    ) {
      return null;
    }

    const meters = height / 100;

    return (
      weight /
      (meters * meters)
    );
  }, [
    height,
    weight,
    validHeight,
    validWeight,
  ]);

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
      weight,
      height,
      age,
      sexInput,
      validHeight,
      validWeight,
    ]
  );

  const tdee = useMemo(() => {
    if (
      bmr === null ||
      !activityInput
    ) {
      return null;
    }

    const option =
      activityOptions.find(
        (item) =>
          item.value ===
          activityInput
      );

    return option
      ? bmr * option.multiplier
      : null;
  }, [
    bmr,
    activityInput,
  ]);

  const bmiStatus =
    getBmiStatus(bmi);

  // =========================
  // SAVE HEALTH
  // =========================

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

    const supabase =
      createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setError(
        "Kamu harus login terlebih dahulu."
      );

      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      height_cm: parsedHeight,
      weight_kg: parsedWeight,
      birth_date:
        birthDateInput || null,
      sex:
        sexInput || null,
      activity_level:
        activityInput || null,
      updated_at:
        new Date().toISOString(),
    };

    const {
      error: saveError,
    } = await supabase
      .from("health_profiles")
      .upsert(
        payload,
        {
          onConflict:
            "user_id",
        }
      );

    if (saveError) {
      console.error(
        "HEALTH SAVE ERROR:",
        saveError
      );

      setError(
        "Data Health gagal disimpan."
      );

      setSaving(false);
      return;
    }

    setHealth({
      height_cm:
        parsedHeight,

      weight_kg:
        parsedWeight,

      birth_date:
        payload.birth_date,

      sex:
        payload.sex as Sex | null,

      activity_level:
        payload.activity_level as
          | ActivityLevel
          | null,
    });

    setMessage(
      "Data Health berhasil disimpan."
    );

    setSaving(false);

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );
  }

  // =========================
  // FATSECRET SEARCH
  // =========================

  async function searchFatSecretFood() {
    const query =
      foodSearch.trim();

    if (!query) {
      setFoodSearchResults([]);
      return;
    }

    setFoodSearchLoading(true);
    setFoodSearchError("");

    try {
      const response =
        await fetch(
          `/api/fatsecret/foods/search?q=${encodeURIComponent(
            query
          )}&max_results=20`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Gagal mencari makanan."
        );
      }

      const raw =
        data?.data?.foods
          ?.food ?? [];

      setFoodSearchResults(
        Array.isArray(raw)
          ? raw
          : [raw]
      );
    } catch (err) {
      console.error(
        "FATSECRET SEARCH ERROR:",
        err
      );

      setFoodSearchResults([]);

      setFoodSearchError(
        err instanceof Error
          ? err.message
          : "Gagal mencari makanan."
      );
    } finally {
      setFoodSearchLoading(false);
    }
  }

  // =========================
  // FATSECRET FOOD GET
  // =========================

  async function getFatSecretFood(
    foodId: string
  ) {
    const response =
      await fetch(
        `/api/fatsecret/foods/get?food_id=${encodeURIComponent(
          foodId
        )}`
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Gagal mengambil detail makanan."
      );
    }

    return data?.data?.food;
  }

  // =========================
  // ANALYZE FOOD
  // =========================

  async function analyzeFood() {
    const text =
      foodInput.trim();

    if (!text) return;

    setFoodLoading(true);
    setFoodError("");
    setFoodAnalysis(null);
    setNutritionResults([]);

    setNutritionTotals({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Kamu harus login untuk menggunakan Food Log."
        );
      }

      const entries =
        splitFoodInput(text);

      if (!entries.length) {
        throw new Error(
          "Makanan belum bisa dikenali."
        );
      }

      const results:
        NutritionResult[] = [];

      for (const entry of entries) {
        const parsed =
          parseFoodEntry(entry);

        const searchResponse =
          await fetch(
            `/api/fatsecret/foods/search?q=${encodeURIComponent(
              parsed.name
            )}&max_results=10`
          );

        const searchData =
          await searchResponse.json();

        if (!searchResponse.ok) {
          throw new Error(
            searchData?.error ||
              `Gagal mencari ${parsed.name}.`
          );
        }

        const rawFoods =
          searchData?.data
            ?.foods?.food ?? [];

        const foods:
          FatSecretFood[] =
          Array.isArray(rawFoods)
            ? rawFoods
            : [rawFoods];

        if (!foods.length) {
          results.push({
            name: parsed.name,
            quantity:
              parsed.quantity,
            unit: parsed.unit,
            estimated_grams: 0,
            confidence: "low",
            note:
              "Makanan tidak ditemukan di FatSecret.",
            matched_food: null,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            match_confidence: "low",
            source: "fatsecret",
          });

          continue;
        }

        const normalizedInput =
          normalizeText(
            parsed.name
          );

        const exact =
          foods.find(
            (food) =>
              normalizeText(
                food.food_name
              ) ===
              normalizedInput
          ) ?? foods[0];

        const matchConfidence:
          | "high"
          | "medium" =
          normalizeText(
            exact.food_name
          ) === normalizedInput
            ? "high"
            : "medium";

        const details =
          await getFatSecretFood(
            exact.food_id
          );

        const servings =
          normalizeServings(
            details?.servings
              ?.serving ??
              details?.serving
          );

        const serving =
          chooseServing(
            servings,
            parsed.unit
          );

        if (!serving) {
          results.push({
            name: parsed.name,
            quantity:
              parsed.quantity,
            unit: parsed.unit,
            estimated_grams: 0,
            confidence: "low",
            note:
              "Serving FatSecret tidak tersedia.",
            matched_food:
              exact.food_name,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            match_confidence: "low",
            source: "fatsecret",
          });

          continue;
        }

        const multiplier =
          calculateServingMultiplier(
            parsed.quantity,
            parsed.unit,
            serving
          );

        const calories =
          Number(
            serving.calories ?? 0
          ) * multiplier;

        const protein =
          Number(
            serving.protein ?? 0
          ) * multiplier;

        const fat =
          Number(
            serving.fat ?? 0
          ) * multiplier;

        const carbs =
          Number(
            serving.carbohydrate ?? 0
          ) * multiplier;

        const metricAmount =
          Number(
            serving.metric_serving_amount
          );

        const estimatedGrams =
          Number.isFinite(
            metricAmount
          ) &&
          metricAmount > 0
            ? metricAmount *
              multiplier
            : 0;

        results.push({
          name: parsed.name,
          quantity:
            parsed.quantity,
          unit: parsed.unit,
          estimated_grams:
            estimatedGrams,
          confidence:
            matchConfidence,
          note: "",
          matched_food:
            exact.food_name,
          calories,
          protein,
          fat,
          carbs,
          match_confidence:
            matchConfidence,
          serving_description:
            serving.serving_description,
          source: "fatsecret",
        });
      }

      setNutritionResults(
        results
      );

      const totals =
        results.reduce(
          (total, item) => ({
            calories:
              total.calories +
              item.calories,

            protein:
              total.protein +
              item.protein,

            carbs:
              total.carbs +
              item.carbs,

            fat:
              total.fat +
              item.fat,
          }),
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }
        );

      setNutritionTotals(
        totals
      );

      setFoodAnalysis({
        note:
          "Nilai gizi dihitung dari serving FatSecret yang dipilih berdasarkan porsi input.",
      });

      const {
        error: logError,
      } = await supabase
        .from("food_logs")
        .insert({
          user_id: user.id,
          raw_input: text,

          ai_result: {
            source: "fatsecret",
            nutrition_results:
              results,
          },

          total_calories_kcal:
            totals.calories,

          total_protein_g:
            totals.protein,

          total_fat_g:
            totals.fat,

          total_carbohydrate_g:
            totals.carbs,

          confidence: "medium",

          note:
            "Food log created from FatSecret search.",
        });

      if (logError) {
        console.error(
          "FOOD LOG SAVE ERROR:",
          logError
        );

        setFoodError(
          "Makanan berhasil dianalisis, tetapi belum tersimpan ke Food Log."
        );
      } else {
        await loadDailyFoodLogs();
      }
    } catch (err) {
      console.error(
        "FOOD ANALYSIS ERROR:",
        err
      );

      setFoodError(
        err instanceof Error
          ? err.message
          : "Gagal menganalisis makanan."
      );
    } finally {
      setFoodLoading(false);
    }
  }

  // =========================
  // LOAD TODAY FOOD LOG
  // =========================

  async function loadDailyFoodLogs() {
    setDailyFoodLoading(true);
    setDailyFoodError("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Kamu harus login untuk melihat Food Log."
        );
      }

      const range =
        getLocalDayRange();

      const {
        data,
        error: logsError,
      } = await supabase
        .from("food_logs")
        .select(
          "id, raw_input, total_calories_kcal, total_protein_g, total_fat_g, total_carbohydrate_g, created_at, ai_result"
        )
        .eq(
          "user_id",
          user.id
        )
        .gte(
          "created_at",
          range.start
        )
        .lt(
          "created_at",
          range.end
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (logsError) {
        console.error(
          "DAILY FOOD LOG ERROR:",
          logsError
        );

        throw new Error(
          "Food Log yang sudah ada belum bisa diperiksa."
        );
      }

      setDailyFoodLogs(
        (data ??
          []) as DailyFoodLog[]
      );
    } catch (err) {
      setDailyFoodLogs([]);

      setDailyFoodError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil Food Log hari ini."
      );
    } finally {
      setDailyFoodLoading(false);
    }
  }

  // =========================
  // SYNC FATSECRET DIARY
  // =========================

  async function syncFatSecretFoodDiary() {
    setDailyFoodSyncing(true);
    setDailyFoodError("");
    setDailyFoodMessage("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Kamu harus login terlebih dahulu."
        );
      }

      const response =
        await fetch(
          `/api/fatsecret/food-entries?date=${getLocalDateString()}`,
          {
            cache: "no-store",
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Gagal mengambil Food Diary FatSecret."
        );
      }

      const rawEntries =
        payload?.data
          ?.food_entries
          ?.food_entry ?? [];

      const entries =
        Array.isArray(rawEntries)
          ? rawEntries
          : [rawEntries];

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("food_logs")
        .select(
          "id, ai_result"
        )
        .eq(
          "user_id",
          user.id
        );

      if (existingError) {
        console.error(
          "FOOD LOG CHECK ERROR:",
          existingError
        );

        throw new Error(
          "Food Log yang sudah ada belum bisa diperiksa."
        );
      }

      const existingIds =
        new Set(
          (existing ?? [])
            .map(
              (row: any) =>
                row?.ai_result
                  ?.fatsecret_food_entry_id
            )
            .filter(Boolean)
        );

      const newEntries =
        entries.filter(
          (entry: any) =>
            entry?.food_entry_id &&
            !existingIds.has(
              String(
                entry.food_entry_id
              )
            )
        );

      if (!newEntries.length) {
        setDailyFoodMessage(
          entries.length
            ? "Food Diary sudah tersinkron. Tidak ada entry baru."
            : "Belum ada makanan di FatSecret Food Diary hari ini."
        );

        await loadDailyFoodLogs();
        return;
      }

      const rows =
        newEntries.map(
          (entry: any) => ({
            user_id: user.id,

            raw_input:
              entry.food_entry_description ||
              entry.food_entry_name ||
              "FatSecret Food Diary",

            ai_result: {
              source: "fatsecret",

              fatsecret_food_entry_id:
                String(
                  entry.food_entry_id
                ),

              food_entry_name:
                entry.food_entry_name ??
                null,

              food_entry_description:
                entry.food_entry_description ??
                null,

              meal:
                entry.meal ??
                null,

              food_id:
                entry.food_id ??
                null,

              serving_id:
                entry.serving_id ??
                null,

              number_of_units:
                entry.number_of_units ??
                null,

              calories:
                entry.calories ??
                0,

              protein:
                entry.protein ??
                0,

              fat:
                entry.fat ??
                0,

              carbohydrate:
                entry.carbohydrate ??
                0,
            },

            total_calories_kcal:
              Number(
                entry.calories ?? 0
              ),

            total_protein_g:
              Number(
                entry.protein ?? 0
              ),

            total_fat_g:
              Number(
                entry.fat ?? 0
              ),

            total_carbohydrate_g:
              Number(
                entry.carbohydrate ?? 0
              ),

            confidence: "high",

            note:
              "Synced from FatSecret Food Diary.",
          })
        );

      const {
        error: insertError,
      } = await supabase
        .from("food_logs")
        .insert(rows);

      if (insertError) {
        console.error(
          "FATSECRET SYNC INSERT ERROR:",
          insertError
        );

        throw new Error(
          "Entry FatSecret gagal disimpan ke Food Log Holozoe."
        );
      }

      setDailyFoodMessage(
        `${newEntries.length} entry FatSecret berhasil disinkronkan.`
      );

      await loadDailyFoodLogs();
    } catch (err) {
      console.error(
        "FATSECRET DIARY SYNC ERROR:",
        err
      );

      setDailyFoodError(
        err instanceof Error
          ? err.message
          : "Gagal menyinkronkan FatSecret Food Diary."
      );
    } finally {
      setDailyFoodSyncing(false);
    }
  }

  useEffect(() => {
    loadDailyFoodLogs();
  }, []);

  // =========================
  // DAILY TOTALS
  // =========================

  const dailyNutrition =
    useMemo(
      () =>
        dailyFoodLogs.reduce(
          (total, item) => ({
            calories:
              total.calories +
              Number(
                item.total_calories_kcal ??
                  0
              ),

            protein:
              total.protein +
              Number(
                item.total_protein_g ??
                  0
              ),

            carbs:
              total.carbs +
              Number(
                item.total_carbohydrate_g ??
                  0
              ),

            fat:
              total.fat +
              Number(
                item.total_fat_g ??
                  0
              ),
          }),
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }
        ),
      [dailyFoodLogs]
    );

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

  const calorieTarget =
    formattedTdee;

  const calorieProgress =
    calorieTarget &&
    calorieTarget > 0
      ? Math.min(
          100,
          (dailyNutrition.calories /
            calorieTarget) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">

      {/* =========================================
          HERO
      ========================================= */}

      <section className="rounded-3xl bg-white/60 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] opacity-45">
              HEALTH
            </p>

            <h2 className="mt-1 text-3xl font-bold tracking-tight">
              Your Body
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-55">
              A simple overview of your body
              metrics, daily energy, and
              nutrition.
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-widest opacity-45">
              Today
            </p>

            <p className="mt-1 font-semibold">
              {new Date().toLocaleDateString(
                "id-ID",
                {
                  day: "numeric",
                  month: "long",
                }
              )}
            </p>
          </div>
        </div>
      </section>

      {/* =========================================
          BODY PROFILE
      ========================================= */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-45">
            BODY PROFILE
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Basic Information
          </h3>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              Height
            </p>

            <p className="mt-1 text-xl font-bold">
              {validHeight
                ? height
                : "—"}
            </p>

            <p className="text-xs opacity-45">
              cm
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              Weight
            </p>

            <p className="mt-1 text-xl font-bold">
              {validWeight
                ? weight
                : "—"}
            </p>

            <p className="text-xs opacity-45">
              kg
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              Age
            </p>

            <p className="mt-1 text-xl font-bold">
              {age ?? "—"}
            </p>

            <p className="text-xs opacity-45">
              years
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              Sex
            </p>

            <p className="mt-1 text-xl font-bold">
              {sexInput
                ? sexInput ===
                  "male"
                  ? "Male"
                  : "Female"
                : "—"}
            </p>
          </div>

          <div className="col-span-2 rounded-2xl bg-[#f5f0e8] p-4 sm:col-span-1">
            <p className="text-xs opacity-45">
              Activity
            </p>

            <p className="mt-1 text-sm font-bold leading-5">
              {activityOptions.find(
                (item) =>
                  item.value ===
                  activityInput
              )?.label ?? "—"}
            </p>
          </div>
        </div>

        <details
          className="mt-5 rounded-2xl border border-[#d8cec0] bg-[#f8f3eb]"
          open={!health.height_cm}
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
            Edit body profile
          </summary>

          <div className="border-t border-[#d8cec0] p-4 sm:p-5">
            {loading ? (
              <p className="text-sm opacity-55">
                Loading health data...
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">

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
                      value={heightInput}
                      onChange={(e) =>
                        setHeightInput(
                          e.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-[#d8cec0] bg-white/70 px-4 py-3 pr-14 text-sm outline-none focus:border-[#a99b8a]"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs opacity-40">
                      cm
                    </span>
                  </div>
                </label>

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
                      value={weightInput}
                      onChange={(e) =>
                        setWeightInput(
                          e.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-[#d8cec0] bg-white/70 px-4 py-3 pr-14 text-sm outline-none focus:border-[#a99b8a]"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs opacity-40">
                      kg
                    </span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Birth date
                  </span>

                  <input
                    type="date"
                    value={birthDateInput}
                    onChange={(e) =>
                      setBirthDateInput(
                        e.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-[#d8cec0] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#a99b8a]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Sex
                  </span>

                  <select
                    value={sexInput}
                    onChange={(e) =>
                      setSexInput(
                        e.target.value as
                          | ""
                          | Sex
                      )
                    }
                    className="w-full rounded-2xl border border-[#d8cec0] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#a99b8a]"
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

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium">
                    Activity level
                  </span>

                  <select
                    value={activityInput}
                    onChange={(e) =>
                      setActivityInput(
                        e.target.value as
                          | ""
                          | ActivityLevel
                      )
                    }
                    className="w-full rounded-2xl border border-[#d8cec0] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[#a99b8a]"
                  >
                    <option value="">
                      Select activity level
                    </option>

                    {activityOptions.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}{" "}
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
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-[#dec5bd] bg-[#f7ebe7] px-4 py-3 text-sm text-[#7a5147]">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-2xl border border-[#c8d7c5] bg-[#eef5eb] px-4 py-3 text-sm text-[#53654f]">
                {message}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={saveHealth}
                disabled={
                  loading ||
                  saving
                }
                className="rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f382f] disabled:opacity-40"
              >
                {saving
                  ? "Saving..."
                  : "Save Health"}
              </button>
            </div>
          </div>
        </details>
      </section>

      {/* =========================================
          DAILY NUTRITION
      ========================================= */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>
            <p className="text-xs uppercase tracking-widest opacity-45">
              TODAY
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Daily Nutrition
            </h3>
          </div>

          <button
            type="button"
            onClick={
              syncFatSecretFoodDiary
            }
            disabled={
              dailyFoodSyncing
            }
            className="rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f382f] disabled:opacity-40"
          >
            {dailyFoodSyncing
              ? "Syncing..."
              : "Sync FatSecret"}
          </button>
        </div>

        <p className="mt-2 text-sm opacity-55">
          Data di bawah berasal dari
          Food Log Holozoe yang
          disinkronkan dengan FatSecret
          Food Diary.
        </p>

        {dailyFoodError && (
          <div className="mt-4 rounded-2xl border border-[#dec5bd] bg-[#f7ebe7] px-4 py-3 text-sm text-[#7a5147]">
            {dailyFoodError}
          </div>
        )}

        {dailyFoodMessage && (
          <div className="mt-4 rounded-2xl border border-[#c8d7c5] bg-[#eef5eb] px-4 py-3 text-sm text-[#53654f]">
            {dailyFoodMessage}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              Consumed
            </p>

            <p className="mt-1 text-3xl font-bold">
              {Math.round(
                dailyNutrition.calories
              )}
            </p>

            <p className="mt-1 text-xs opacity-45">
              kcal today
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              TDEE
            </p>

            <p className="mt-1 text-3xl font-bold">
              {calorieTarget ??
                "—"}
            </p>

            <p className="mt-1 text-xs opacity-45">
              kcal/day
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              Remaining
            </p>

            <p className="mt-1 text-3xl font-bold">
              {calorieTarget !==
              null
                ? Math.max(
                    0,
                    calorieTarget -
                      Math.round(
                        dailyNutrition.calories
                      )
                  )
                : "—"}
            </p>

            <p className="mt-1 text-xs opacity-45">
              kcal
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-45">
              Entries
            </p>

            <p className="mt-1 text-3xl font-bold">
              {dailyFoodLogs.length}
            </p>

            <p className="mt-1 text-xs opacity-45">
              logged today
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs opacity-55">
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

          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#ded6ca]">
            <div
              className="h-full rounded-full bg-[#4f473e] transition-all"
              style={{
                width: `${calorieProgress}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">

          <div className="rounded-2xl border border-[#ddd3c5] bg-white/40 p-4">
            <p className="text-xs opacity-45">
              Protein
            </p>

            <p className="mt-1 text-2xl font-bold">
              {dailyNutrition.protein.toFixed(
                1
              )}{" "}
              g
            </p>
          </div>

          <div className="rounded-2xl border border-[#ddd3c5] bg-white/40 p-4">
            <p className="text-xs opacity-45">
              Carbs
            </p>

            <p className="mt-1 text-2xl font-bold">
              {dailyNutrition.carbs.toFixed(
                1
              )}{" "}
              g
            </p>
          </div>

          <div className="rounded-2xl border border-[#ddd3c5] bg-white/40 p-4">
            <p className="text-xs opacity-45">
              Fat
            </p>

            <p className="mt-1 text-2xl font-bold">
              {dailyNutrition.fat.toFixed(
                1
              )}{" "}
              g
            </p>
          </div>
        </div>
      </section>

      {/* =========================================
          BODY METRICS
      ========================================= */}

      <section>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest opacity-45">
            BODY METRICS
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Your Numbers
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-45">
              IMT
            </p>

            <p className="mt-2 text-4xl font-bold">
              {formattedBmi}
            </p>

            <p className="mt-2 text-sm font-semibold">
              {bmiStatus.label}
            </p>

            <p className="mt-1 text-xs leading-5 opacity-50">
              {
                bmiStatus.description
              }
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-45">
              AGE
            </p>

            <p className="mt-2 text-4xl font-bold">
              {age ?? "—"}
            </p>

            <p className="mt-2 text-xs leading-5 opacity-50">
              Calculated from your
              birth date.
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-45">
              BMR
            </p>

            <p className="mt-2 text-4xl font-bold">
              {formattedBmr ??
                "—"}
            </p>

            <p className="mt-2 text-xs leading-5 opacity-50">
              Estimated energy needed
              at complete rest.
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-45">
              TDEE
            </p>

            <p className="mt-2 text-4xl font-bold">
              {formattedTdee ??
                "—"}
            </p>

            <p className="mt-2 text-xs leading-5 opacity-50">
              Estimated daily energy
              expenditure.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================
          DAILY ENERGY
      ========================================= */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <p className="text-xs uppercase tracking-widest opacity-45">
          DAILY ENERGY
        </p>

        <h3 className="mt-1 text-xl font-bold">
          Estimated Calorie Needs
        </h3>

        {tdee !== null ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-45">
                Maintain
              </p>

              <p className="mt-1 text-2xl font-bold">
                {Math.round(tdee)}
              </p>

              <p className="text-xs opacity-45">
                kcal/day
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-45">
                Mild deficit
              </p>

              <p className="mt-1 text-2xl font-bold">
                {Math.round(
                  tdee * 0.9
                )}
              </p>

              <p className="text-xs opacity-45">
                ~10% below maintenance
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-45">
                Mild surplus
              </p>

              <p className="mt-1 text-2xl font-bold">
                {Math.round(
                  tdee * 1.1
                )}
              </p>

              <p className="text-xs opacity-45">
                ~10% above maintenance
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4 text-sm leading-6 opacity-60">
            Lengkapi data tubuh untuk
            menghitung estimasi
            kebutuhan energi.
          </div>
        )}

        <p className="mt-4 text-xs leading-5 opacity-40">
          Angka ini merupakan estimasi,
          bukan diagnosis atau target
          medis personal.
        </p>
      </section>

      {/* =========================================
          FOOD LOG
      ========================================= */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-45">
              NUTRITION
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Food Log
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-55">
              Search FatSecret untuk
              memilih makanan, atau
              masukkan makanan dengan
              porsi sehari-hari.
            </p>
          </div>

          <span className="rounded-full bg-[#ddd4c7] px-3 py-1 text-xs font-semibold">
            FatSecret
          </span>
        </div>

        {/* SEARCH */}

        <div className="mt-5">

          <div className="flex gap-2">

            <input
              type="text"
              value={foodSearch}
              onChange={(e) => {
                setFoodSearch(
                  e.target.value
                );

                setFoodSearchResults(
                  []
                );

                setFoodSearchError(
                  ""
                );
              }}
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  searchFatSecretFood();
                }
              }}
              placeholder="Search food..."
              className="min-w-0 flex-1 rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none focus:border-[#a99b8a]"
            />

            <button
              type="button"
              onClick={
                searchFatSecretFood
              }
              disabled={
                foodSearchLoading ||
                !foodSearch.trim()
              }
              className="shrink-0 rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {foodSearchLoading
                ? "Searching..."
                : "Search"}
            </button>
          </div>

          {foodSearchError && (
            <div className="mt-3 rounded-2xl border border-[#dec5bd] bg-[#f7ebe7] px-4 py-3 text-sm text-[#7a5147]">
              {foodSearchError}
            </div>
          )}

          {foodSearchResults.length >
            0 && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">

              {foodSearchResults.map(
                (food) => (
                  <button
                    key={
                      food.food_id
                    }
                    type="button"
                    onClick={() => {
                      setFoodInput(
                        food.food_name
                      );

                      setFoodSearch(
                        food.food_name
                      );

                      setFoodSearchResults(
                        []
                      );
                    }}
                    className="rounded-2xl bg-[#f5f0e8] p-4 text-left transition hover:bg-[#ebe3d8]"
                  >
                    <p className="font-semibold">
                      {
                        food.food_name
                      }
                    </p>

                    {food.brand_name && (
                      <p className="mt-1 text-xs opacity-50">
                        {
                          food.brand_name
                        }
                      </p>
                    )}

                    <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-60">
                      {
                        food.food_description
                      }
                    </p>
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* ANALYZE INPUT */}

        <div className="mt-5 rounded-2xl bg-[#f8f3eb] p-4">

          <textarea
            value={foodInput}
            onChange={(e) =>
              setFoodInput(
                e.target.value
              )
            }
            rows={3}
            placeholder="Contoh: nasi putih 2 centong + ayam goreng 1 potong + teh manis 1 gelas"
            className="w-full resize-none rounded-2xl border border-[#d8cec0] bg-white/60 px-4 py-3 text-sm leading-6 outline-none focus:border-[#a99b8a]"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs leading-5 opacity-50">
              Sertakan makanan dan
              perkiraan porsi supaya
              perhitungan lebih akurat.
            </p>

            <button
              type="button"
              onClick={
                analyzeFood
              }
              disabled={
                foodLoading ||
                !foodInput.trim()
              }
              className="shrink-0 rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {foodLoading
                ? "Analyzing..."
                : "Analyze Food"}
            </button>
          </div>

          {foodError && (
            <div className="mt-4 rounded-2xl border border-[#dec5bd] bg-[#f7ebe7] px-4 py-3 text-sm text-[#7a5147]">
              {foodError}
            </div>
          )}
        </div>
      </section>

      {/* =========================================
          ANALYSIS
      ========================================= */}

      {foodAnalysis && (
        <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">

          <p className="text-xs uppercase tracking-widest opacity-45">
            ANALYSIS
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Detected Foods
          </h3>

          <div className="mt-5 space-y-3">

            {nutritionResults.map(
              (item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-2xl bg-[#f5f0e8] p-4"
                >

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <p className="font-semibold">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs opacity-50">
                        {item.quantity}{" "}
                        {item.unit}

                        {item.estimated_grams >
                          0 &&
                          ` • ~${Math.round(
                            item.estimated_grams
                          )} g`}
                      </p>
                    </div>

                    <div className="sm:text-right">

                      {item.matched_food ? (
                        <>
                          <p className="font-semibold">
                            {Math.round(
                              item.calories
                            )}{" "}
                            kcal
                          </p>

                          <p className="mt-1 text-xs opacity-50">
                            P{" "}
                            {item.protein.toFixed(
                              1
                            )}{" "}
                            g · C{" "}
                            {item.carbs.toFixed(
                              1
                            )}{" "}
                            g · F{" "}
                            {item.fat.toFixed(
                              1
                            )}{" "}
                            g
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-[#8a6257]">
                          Belum ditemukan
                        </p>
                      )}
                    </div>
                  </div>

                  {item.matched_food && (
                    <p className="mt-3 text-xs opacity-40">
                      FatSecret match:{" "}
                      {
                        item.matched_food
                      }
                    </p>
                  )}

                  {item.serving_description && (
                    <p className="mt-2 text-xs opacity-40">
                      Serving:{" "}
                      {
                        item.serving_description
                      }
                    </p>
                  )}
                </div>
              )
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-45">
                Calories
              </p>

              <p className="mt-1 text-xl font-bold">
                {Math.round(
                  nutritionTotals.calories
                )}
              </p>

              <p className="text-xs opacity-45">
                kcal
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-45">
                Protein
              </p>

              <p className="mt-1 text-xl font-bold">
                {nutritionTotals.protein.toFixed(
                  1
                )}{" "}
                g
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-45">
                Carbs
              </p>

              <p className="mt-1 text-xl font-bold">
                {nutritionTotals.carbs.toFixed(
                  1
                )}{" "}
                g
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-45">
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

          <p className="mt-4 text-xs leading-5 opacity-50">
            {foodAnalysis.note}
          </p>
        </section>
      )}

      {/* =========================================
          TODAY'S FOOD LOG
      ========================================= */}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">

        <div className="flex items-end justify-between gap-4">

          <div>
            <p className="text-xs uppercase tracking-widest opacity-45">
              TODAY
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Today's Food Log
            </h3>
          </div>

          <span className="text-xs opacity-45">
            {dailyFoodLogs.length}{" "}
            entries
          </span>
        </div>

        {dailyFoodLoading ? (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-5 text-sm opacity-55">
            Loading today's food...
          </div>
        ) : dailyFoodLogs.length ===
          0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cfc3b4] p-5 text-sm leading-6 opacity-55">
            Belum ada makanan yang
            tercatat hari ini. Tekan{" "}
            <strong>
              Sync FatSecret
            </strong>{" "}
            untuk mengambil Food
            Diary, atau gunakan Food
            Log di atas.
          </div>
        ) : (
          <div className="mt-5 space-y-2">

            {dailyFoodLogs.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl bg-[#f5f0e8] p-4 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="min-w-0">

                    <p className="font-semibold">
                      {
                        item
                          .ai_result
                          ?.food_entry_name ||
                        item.raw_input ||
                        "Food entry"
                      }
                    </p>

                    <p className="mt-1 text-xs opacity-50">
                      {
                        item
                          .ai_result
                          ?.meal ||
                        "Food Log"
                      }{" "}
                      ·{" "}
                      {new Date(
                        item.created_at
                      ).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>

                  <div className="sm:text-right">

                    <p className="font-semibold">
                      {Math.round(
                        Number(
                          item.total_calories_kcal ??
                            0
                        )
                      )}{" "}
                      kcal
                    </p>

                    <p className="mt-1 text-xs opacity-50">
                      P{" "}
                      {Number(
                        item.total_protein_g ??
                          0
                      ).toFixed(
                        1
                      )}{" "}
                      · C{" "}
                      {Number(
                        item.total_carbohydrate_g ??
                          0
                      ).toFixed(
                        1
                      )}{" "}
                      · F{" "}
                      {Number(
                        item.total_fat_g ??
                          0
                      ).toFixed(
                        1
                      )}{" "}
                      g
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <p className="mt-5 text-xs leading-5 opacity-40">
          Food Diary FatSecret yang
          sudah disinkronkan tidak akan
          dibuat ulang sebagai entry baru.
        </p>
      </section>
    </div>
  );
}