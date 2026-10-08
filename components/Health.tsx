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

type FoodItem = {
  name: string;
  quantity: number;
  unit: string;
  estimated_grams: number;
  confidence: "high" | "medium" | "low";
  note: string;
};

type FoodAnalysis = {
  items: FoodItem[];
  overall_confidence: "high" | "medium" | "low";
  note: string;
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

type NutritionResult = FoodItem & {
  matched_food: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  match_confidence: "high" | "medium" | "low";
  serving_description?: string;
  source: "fatsecret";
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
    description: "Aktivitas sangat berat / pekerjaan fisik",
    multiplier: 1.9,
  },
];

function calculateAge(birthDate: string | null) {
  if (!birthDate) return null;

  const birth = new Date(`${birthDate}T00:00:00`);

  if (Number.isNaN(birth.getTime())) return null;

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

function parseNumber(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(",", ".")
    .trim();

  const numeric = Number(normalized);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const numberWords: Record<string, number> = {
    nol: 0,
    satu: 1,
    sebuah: 1,
    sebutir: 1,
    satuan: 1,
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

  return numberWords[normalized] ?? null;
}

function splitFoodInput(text: string) {
  return text
    .split(/\s*\+\s*|\s*,\s*|\s+\bdan\b\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFoodEntry(text: string) {
  const numberPattern =
    "(\\d+(?:[.,]\\d+)?|nol|satu|sebuah|sebutir|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)";

  const unitPattern =
    "(gram|grams|g|kg|kilogram|kilograms|ml|milliliter|liter|litre|l|porsi|portion|serving|cup|cups|gelas|glass|sendok makan|sdm|tablespoon|tbsp|sendok teh|sdt|teaspoon|tsp|potong|slice|slices|buah|butir|piece|pieces|centong|mangkuk|mangkok|bowl|scoop)";

  let quantity = 1;
  let unit = "serving";
  let foodName = text.trim();

  const afterNameRegex = new RegExp(
    `${numberPattern}\\s*${unitPattern}\\b`,
    "i"
  );

  const beforeNameRegex = new RegExp(
    `^\\s*${numberPattern}\\s*${unitPattern}\\s+`,
    "i"
  );

  const beforeOnlyNumberRegex = new RegExp(
    `^\\s*${numberPattern}\\s+`,
    "i"
  );

  const afterNameMatch =
    foodName.match(afterNameRegex);

  if (afterNameMatch) {
    const parsedQuantity = parseNumber(
      afterNameMatch[1]
    );

    if (parsedQuantity !== null) {
      quantity = parsedQuantity;
    }

    unit = afterNameMatch[2];
    foodName = foodName
      .replace(afterNameMatch[0], "")
      .trim();
  } else {
    const beforeMatch =
      foodName.match(beforeNameRegex);

    if (beforeMatch) {
      const parsedQuantity = parseNumber(
        beforeMatch[1]
      );

      if (parsedQuantity !== null) {
        quantity = parsedQuantity;
      }

      unit = beforeMatch[2];

      foodName = foodName
        .replace(beforeMatch[0], "")
        .trim();
    } else {
      const numberOnlyMatch =
        foodName.match(beforeOnlyNumberRegex);

      if (numberOnlyMatch) {
        const parsedQuantity = parseNumber(
          numberOnlyMatch[1]
        );

        if (parsedQuantity !== null) {
          quantity = parsedQuantity;
        }

        foodName = foodName
          .replace(numberOnlyMatch[0], "")
          .trim();
      }
    }
  }

  const normalizedUnit =
    normalizeUnit(unit);

  return {
    name: foodName,
    quantity,
    unit: normalizedUnit,
  };
}

function normalizeUnit(unit: string) {
  const value = normalizeText(unit);

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

  return aliases[value] ?? value;
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

function normalizeServings(
  value: unknown
): FatSecretServing[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value as FatSecretServing[];
  }

  return [value as FatSecretServing];
}

function chooseServing(
  servings: FatSecretServing[],
  requestedUnit: string
) {
  if (!servings.length) return null;

  const unit = normalizeUnit(requestedUnit);

  if (unit === "g") {
    const gramServing = servings.find(
      (serving) =>
        normalizeText(
          String(
            serving.metric_serving_unit ?? ""
          )
        ) === "g" &&
        normalizeText(
          String(
            serving.measurement_description ??
              ""
          )
        ) === "g"
    );

    if (gramServing) return gramServing;

    const hundredGramServing =
      servings.find((serving) => {
        const amount = Number(
          serving.metric_serving_amount
        );

        return (
          Number.isFinite(amount) &&
          Math.abs(amount - 100) < 0.5 &&
          String(
            serving.metric_serving_unit ?? ""
          ).toLowerCase() === "g"
        );
      });

    if (hundredGramServing) {
      return hundredGramServing;
    }
  }

  if (unit === "ml") {
    const mlServing = servings.find(
      (serving) =>
        String(
          serving.metric_serving_unit ?? ""
        ).toLowerCase() === "ml"
    );

    if (mlServing) return mlServing;
  }

  if (unit === "kg") {
    const gramServing = servings.find(
      (serving) =>
        String(
          serving.metric_serving_unit ?? ""
        ).toLowerCase() === "g"
    );

    if (gramServing) return gramServing;
  }

  if (unit === "l") {
    const mlServing = servings.find(
      (serving) =>
        String(
          serving.metric_serving_unit ?? ""
        ).toLowerCase() === "ml"
    );

    if (mlServing) return mlServing;
  }

  if (unit !== "porsi") {
    const exactMeasurement =
      servings.find((serving) => {
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
      });

    if (exactMeasurement) {
      return exactMeasurement;
    }
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
  const unit = normalizeUnit(requestedUnit);

  const metricAmount = Number(
    serving.metric_serving_amount
  );

  const numberOfUnits = Number(
    serving.number_of_units
  );

  if (
    unit === "g" &&
    Number.isFinite(metricAmount) &&
    metricAmount > 0
  ) {
    return quantity / metricAmount;
  }

  if (
    unit === "kg" &&
    Number.isFinite(metricAmount) &&
    metricAmount > 0
  ) {
    return (quantity * 1000) / metricAmount;
  }

  if (
    unit === "ml" &&
    Number.isFinite(metricAmount) &&
    metricAmount > 0
  ) {
    return quantity / metricAmount;
  }

  if (
    unit === "l" &&
    Number.isFinite(metricAmount) &&
    metricAmount > 0
  ) {
    return (quantity * 1000) / metricAmount;
  }

  if (
    Number.isFinite(numberOfUnits) &&
    numberOfUnits > 0
  ) {
    return quantity / numberOfUnits;
  }

  return quantity;
}

export default function Health() {
  const [health, setHealth] =
    useState<HealthData>(defaultHealthData);

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

  const [foodInput, setFoodInput] =
    useState("");

  const [foodLoading, setFoodLoading] =
    useState(false);

  const [foodError, setFoodError] =
    useState("");

  const [foodAnalysis, setFoodAnalysis] =
    useState<FoodAnalysis | null>(null);

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
        const nextData: HealthData = {
          height_cm:
            data.height_cm !== null
              ? Number(data.height_cm)
              : null,
          weight_kg:
            data.weight_kg !== null
              ? Number(data.weight_kg)
              : null,
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

        setHealth(nextData);

        setHeightInput(
          nextData.height_cm !== null
            ? String(nextData.height_cm)
            : ""
        );

        setWeightInput(
          nextData.weight_kg !== null
            ? String(nextData.weight_kg)
            : ""
        );

        setBirthDateInput(
          nextData.birth_date || ""
        );

        setSexInput(
          nextData.sex || ""
        );

        setActivityInput(
          nextData.activity_level || ""
        );
      }

      setLoading(false);
    }

    loadHealth();
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

  const bmr = useMemo(() => {
    return calculateBmr(
      validWeight ? weight : null,
      validHeight ? height : null,
      age,
      sexInput || null
    );
  }, [
    validWeight,
    validHeight,
    weight,
    height,
    age,
    sexInput,
  ]);

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

  async function saveHealth() {
    setMessage("");
    setError("");

    const parsedHeight =
      Number.parseFloat(heightInput);

    const parsedWeight =
      Number.parseFloat(weightInput);

    if (
      !Number.isFinite(parsedHeight) ||
      parsedHeight <= 0
    ) {
      setError(
        "Tinggi badan belum valid."
      );
      return;
    }

    if (
      !Number.isFinite(parsedWeight) ||
      parsedWeight <= 0
    ) {
      setError(
        "Berat badan belum valid."
      );
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      .upsert(payload, {
        onConflict: "user_id",
      });

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
      height_cm: parsedHeight,
      weight_kg: parsedWeight,
      birth_date:
        birthDateInput || null,
      sex:
        sexInput || null,
      activity_level:
        activityInput || null,
    });

    setMessage(
      "Data Health berhasil disimpan."
    );

    setSaving(false);

    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

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
      const response = await fetch(
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

      const foods =
        data?.data?.foods?.food ?? [];

      setFoodSearchResults(
        Array.isArray(foods)
          ? foods
          : [foods]
      );
    } catch (error) {
      console.error(
        "FATSECRET SEARCH ERROR:",
        error
      );

      setFoodSearchResults([]);

      setFoodSearchError(
        error instanceof Error
          ? error.message
          : "Gagal mencari makanan."
      );
    } finally {
      setFoodSearchLoading(false);
    }
  }

  async function getFatSecretFood(
    foodId: string
  ) {
    const response = await fetch(
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
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      const results: NutritionResult[] =
        [];

      const analysisItems: FoodItem[] =
        [];

      for (const entry of entries) {
        const parsed =
          parseFoodEntry(entry);

        if (!parsed.name) {
          continue;
        }

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
          searchData?.data?.foods?.food ??
          [];

        const foods: FatSecretFood[] =
          Array.isArray(rawFoods)
            ? rawFoods
            : [rawFoods];

        if (!foods.length) {
          results.push({
            name: parsed.name,
            quantity: parsed.quantity,
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

          analysisItems.push({
            name: parsed.name,
            quantity: parsed.quantity,
            unit: parsed.unit,
            estimated_grams: 0,
            confidence: "low",
            note:
              "Makanan tidak ditemukan di FatSecret.",
          });

          continue;
        }

        const normalizedInput =
          normalizeText(parsed.name);

        const exactFood =
          foods.find(
            (food) =>
              normalizeText(
                food.food_name
              ) === normalizedInput
          ) ?? foods[0];

        const matchConfidence =
          normalizeText(
            exactFood.food_name
          ) === normalizedInput
            ? "high"
            : "medium";

        const foodDetails =
          await getFatSecretFood(
            exactFood.food_id
          );

        const servings =
          normalizeServings(
            foodDetails?.servings?.serving
          );

        if (!servings.length) {
          results.push({
            name: parsed.name,
            quantity: parsed.quantity,
            unit: parsed.unit,
            estimated_grams: 0,
            confidence: "low",
            note:
              "Makanan ditemukan, tetapi FatSecret tidak menyediakan serving yang bisa digunakan.",
            matched_food:
              exactFood.food_name,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            match_confidence:
              matchConfidence,
            source: "fatsecret",
          });

          analysisItems.push({
            name: parsed.name,
            quantity: parsed.quantity,
            unit: parsed.unit,
            estimated_grams: 0,
            confidence: "low",
            note:
              "Serving FatSecret tidak tersedia.",
          });

          continue;
        }

        const serving =
          chooseServing(
            servings,
            parsed.unit
          );

        if (!serving) {
          throw new Error(
            `Serving untuk ${parsed.name} tidak tersedia.`
          );
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

        let estimatedGrams = 0;

        if (
          Number.isFinite(metricAmount) &&
          metricAmount > 0
        ) {
          estimatedGrams =
            metricAmount *
            multiplier;
        }

        let portionNote =
          `Serving FatSecret: ${
            serving.serving_description ??
            "standard serving"
          }.`;

        if (
          parsed.unit !== "porsi" &&
          parsed.unit !== "g" &&
          parsed.unit !== "kg" &&
          parsed.unit !== "ml" &&
          parsed.unit !== "l"
        ) {
          portionNote =
            `Porsi dipetakan ke serving FatSecret "${serving.serving_description ?? "standard serving"}".`;
        }

        const result: NutritionResult = {
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
          estimated_grams:
            estimatedGrams,
          confidence:
            matchConfidence,
          note: portionNote,
          matched_food:
            exactFood.food_name,
          calories,
          protein,
          fat,
          carbs,
          match_confidence:
            matchConfidence,
          serving_description:
            serving.serving_description,
          source: "fatsecret",
        };

        results.push(result);

        analysisItems.push({
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
          estimated_grams:
            estimatedGrams,
          confidence:
            matchConfidence,
          note: portionNote,
        });
      }

      if (!results.length) {
        throw new Error(
          "Tidak ada makanan yang berhasil dianalisis."
        );
      }

      const overallConfidence =
        results.every(
          (item) =>
            item.match_confidence ===
            "high"
        )
          ? "high"
          : results.some(
                (item) =>
                  item.match_confidence ===
                  "high"
              )
            ? "medium"
            : "low";

      const analysis: FoodAnalysis = {
        items: analysisItems,
        overall_confidence:
          overallConfidence,
        note:
          "Nilai nutrisi berasal dari FatSecret berdasarkan makanan dan serving yang berhasil dipetakan.",
      };

      setFoodAnalysis(analysis);
      setNutritionResults(results);

      const totals =
        results.reduce(
          (total, item) => {
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
        );

      setNutritionTotals(totals);

      const {
        error: logError,
      } = await supabase
        .from("food_logs")
        .insert({
          user_id: user.id,
          raw_input: text,
          ai_result: {
            source: "fatsecret",
            analysis,
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
          confidence:
            analysis.overall_confidence,
          note:
            analysis.note,
        });

      if (logError) {
        console.error(
          "FOOD LOG SAVE ERROR:",
          logError
        );

        setFoodError(
          "Makanan berhasil dianalisis, tetapi belum tersimpan ke Food Log."
        );
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

  return (
    <div className="space-y-6">
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

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest opacity-50">
            BODY PROFILE
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Basic Information
          </h3>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[#f5f0e8] p-4 text-sm opacity-60">
            Loading health data...
          </div>
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
                  onChange={(event) =>
                    setHeightInput(
                      event.target.value
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
                  onChange={(event) =>
                    setWeightInput(
                      event.target.value
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

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Birth date
              </span>

              <input
                type="date"
                value={birthDateInput}
                onChange={(event) =>
                  setBirthDateInput(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none transition focus:border-[#a99b8a]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Sex
              </span>

              <select
                value={sexInput}
                onChange={(event) =>
                  setSexInput(
                    event.target
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

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium">
                Activity level
              </span>

              <select
                value={activityInput}
                onChange={(event) =>
                  setActivityInput(
                    event.target
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
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label} —{" "}
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
          <div className="mt-5 rounded-2xl border border-[#dec5bd] bg-[#f7ebe7] px-4 py-3 text-sm text-[#7a5147]">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-[#c8d7c5] bg-[#eef5eb] px-4 py-3 text-sm text-[#53654f]">
            {message}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={saveHealth}
            disabled={
              loading || saving
            }
            className="rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f382f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving
              ? "Saving..."
              : "Save Health"}
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest opacity-50">
            BODY METRICS
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Your Numbers
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-50">
              IMT
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">
                {formattedBmi}
              </span>

              {bmi !== null && (
                <span className="pb-1 text-xs opacity-40">
                  kg/m²
                </span>
              )}
            </div>

            <p className="mt-3 text-sm font-semibold">
              {bmiStatus.label}
            </p>

            <p className="mt-1 text-xs leading-5 opacity-50">
              {
                bmiStatus.description
              }
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-50">
              AGE
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">
                {age !== null
                  ? age
                  : "—"}
              </span>

              {age !== null && (
                <span className="pb-1 text-xs opacity-40">
                  years
                </span>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 opacity-50">
              Calculated from your birth
              date.
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-50">
              BMR
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">
                {formattedBmr !== null
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

            <p className="mt-3 text-xs leading-5 opacity-50">
              Estimated energy needed at
              complete rest.
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-50">
              TDEE
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">
                {formattedTdee !== null
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

            <p className="mt-3 text-xs leading-5 opacity-50">
              Estimated daily energy
              expenditure.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50">
            DAILY ENERGY
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Estimated Calorie Needs
          </h3>
        </div>

        {tdee !== null ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5f0e8] p-4">
              <p className="text-xs opacity-50">
                Maintain
              </p>

              <p className="mt-1 text-2xl font-bold">
                {Math.round(tdee)}
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
          Angka ini merupakan estimasi,
          bukan diagnosis atau target
          medis personal.
        </p>
      </section>

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              NUTRITION
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Food Log
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-60">
              Tulis makananmu dengan bahasa
              sehari-hari. Sistem akan mencari
              makanan tersebut di FatSecret,
              mengambil serving yang paling
              sesuai, lalu menghitung nilai
              gizinya.
            </p>
          </div>

          <span className="rounded-full bg-[#ddd4c7] px-3 py-1 text-xs font-semibold">
            FatSecret Nutrition
          </span>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">
            Search Food
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={foodSearch}
              onChange={(event) => {
                setFoodSearch(
                  event.target.value
                );
                setFoodSearchResults([]);
                setFoodSearchError("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  searchFatSecretFood();
                }
              }}
              placeholder="Cari makanan, misalnya nasi putih"
              className="min-w-0 flex-1 rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none transition focus:border-[#a99b8a]"
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
              className="shrink-0 rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f382f] disabled:cursor-not-allowed disabled:opacity-40"
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
            <div className="mt-3 space-y-2">
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
                    className="w-full rounded-2xl bg-[#f5f0e8] p-4 text-left transition hover:bg-[#ebe3d8]"
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

                    <p className="mt-1 text-xs leading-5 opacity-60">
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

        <div className="mt-5">
          <textarea
            value={foodInput}
            onChange={(event) =>
              setFoodInput(
                event.target.value
              )
            }
            rows={4}
            placeholder="Contoh: nasi putih 2 centong + ayam goreng 1 potong + teh manis 1 gelas"
            className="w-full resize-none rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#a99b8a]"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 opacity-50">
              Sertakan jenis makanan dan
              perkiraan jumlah/porsi agar
              estimasi lebih akurat. Kamu
              boleh mengetik dengan bahasa
              sehari-hari.
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
              className="shrink-0 rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f382f] disabled:cursor-not-allowed disabled:opacity-40"
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

      {foodAnalysis && (
        <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              ANALYSIS
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Detected Foods
            </h3>
          </div>

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

                    <div className="text-left sm:text-right">
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
                      {item.matched_food}
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

                  {item.note && (
                    <p className="mt-2 text-xs leading-5 opacity-50">
                      {item.note}
                    </p>
                  )}
                </div>
              )
            )}
          </div>

          {foodAnalysis.note && (
            <p className="mt-4 text-xs leading-5 opacity-50">
              {foodAnalysis.note}
            </p>
          )}
        </section>
      )}

      <section className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50">
            TODAY
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Nutrition Summary
          </h3>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Calories
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
              Protein
            </p>

            <p className="mt-1 text-2xl font-bold">
              {nutritionTotals.protein.toFixed(
                1
              )}
            </p>

            <p className="mt-1 text-xs opacity-50">
              g
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Carbs
            </p>

            <p className="mt-1 text-2xl font-bold">
              {nutritionTotals.carbs.toFixed(
                1
              )}
            </p>

            <p className="mt-1 text-xs opacity-50">
              g
            </p>
          </div>

          <div className="rounded-2xl bg-[#f5f0e8] p-4">
            <p className="text-xs opacity-50">
              Fat
            </p>

            <p className="mt-1 text-2xl font-bold">
              {nutritionTotals.fat.toFixed(
                1
              )}
            </p>

            <p className="mt-1 text-xs opacity-50">
              g
            </p>
          </div>
        </div>

        {!foodAnalysis && (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cfc3b4] p-4 text-sm leading-6 opacity-50">
            Belum ada makanan yang
            dianalisis hari ini.
          </div>
        )}

        {foodAnalysis && (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cfc3b4] p-4 text-sm leading-6 opacity-50">
            Hasil ini merupakan estimasi
            berdasarkan serving FatSecret
            yang paling sesuai dengan porsi
            yang kamu masukkan.
          </div>
        )}
      </section>
    </div>
  );
}