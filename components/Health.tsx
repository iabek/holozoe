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



type NutritionFood = {

  id: string;

  name: string;

  aliases: string[] | null;

  serving_grams: number | null;

  calories_kcal: number | null;

  protein_g: number | null;

  fat_g: number | null;

  carbohydrate_g: number | null;

  source: string;

};



type NutritionResult = FoodItem & {

  matched_food: string | null;

  calories: number;

  protein: number;

  fat: number;

  carbs: number;

  match_confidence: "high" | "medium" | "low";

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



function normalizeFoodName(value: string) {

  return value

    .toLowerCase()

    .trim()

    .replace(/[.,!?()[\]{}]/g, "")

    .replace(/\s+/g, " ");

}



function findFoodMatch(

  item: FoodItem,

  foods: NutritionFood[]

) {

  const input = normalizeFoodName(item.name);



  if (!input) return null;



  // Exact name

  const exactName = foods.find(

    (food) =>

      normalizeFoodName(food.name) === input

  );



  if (exactName) return exactName;



  // Exact alias

  const exactAlias = foods.find((food) =>

    (food.aliases ?? []).some(

      (alias) =>

        normalizeFoodName(alias) === input

    )

  );



  if (exactAlias) return exactAlias;



  // Input contains database name

  const containsName = foods.find((food) => {

    const name = normalizeFoodName(food.name);



    return (

      input.includes(name) ||

      name.includes(input)

    );

  });



  if (containsName) return containsName;



  // Input contains alias

  const containsAlias = foods.find((food) =>

    (food.aliases ?? []).some((alias) => {

      const normalizedAlias =

        normalizeFoodName(alias);



      return (

        input.includes(normalizedAlias) ||

        normalizedAlias.includes(input)

      );

    })

  );



  return containsAlias ?? null;

}



function estimatePortionMultiplier(

  item: FoodItem,

  servingGrams: number

) {

  if (

    !Number.isFinite(item.estimated_grams) ||

    item.estimated_grams <= 0

  ) {

    return null;

  }



  if (

    !Number.isFinite(servingGrams) ||

    servingGrams <= 0

  ) {

    return null;

  }



  return item.estimated_grams / servingGrams;

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

  // FOOD AI

  // =========================



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



  const [nutritionTotals, setNutritionTotals] =

    useState({

      calories: 0,

      protein: 0,

      carbs: 0,

      fat: 0,

    });



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



  const age =

    calculateAge(

      birthDateInput || null

    );



  const bmr = useMemo(() => {

    return calculateBmr(

      validWeight

        ? weight

        : null,



      validHeight

        ? height

        : null,



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



  // =========================

  // SAVE HEALTH

  // =========================



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

      .upsert(

        payload,

        {

          onConflict: "user_id",

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



  // =========================

  // ANALYZE FOOD

  // =========================



  async function analyzeFood() {
    const text = foodInput.trim();

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
      // =====================================================
      // STEP 1: LOGIN USER
      // =====================================================

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Kamu harus login untuk menggunakan Food Log."
        );
      }

      // =====================================================
      // STEP 2: LOAD DATABASE TKPI
      // =====================================================

      const {
        data: foods,
        error: foodsError,
      } = await supabase
        .from("nutrition_foods")
        .select(
          "id, name, aliases, serving_grams, calories_kcal, protein_g, fat_g, carbohydrate_g, source"
        );

      if (foodsError) {
        console.error(
          "NUTRITION DATABASE ERROR:",
          foodsError
        );

        throw new Error(
          "Database pangan belum bisa dibaca."
        );
      }

      const nutritionFoods =
        (foods ?? []) as NutritionFood[];

      if (nutritionFoods.length === 0) {
        throw new Error(
          "Database pangan masih kosong."
        );
      }

      // =====================================================
      // STEP 3: KIRIM DICTIONARY TKPI KE LOCAL PARSER
      // =====================================================
      // Parser hanya membutuhkan nama + aliases.
      // Nilai nutrisi tetap diambil dari database di bawah.

      const knownFoods = nutritionFoods.map(
        (food) => ({
          name: food.name,
          aliases: food.aliases ?? [],
        })
      );

      const response = await fetch(
        "/api/health/food",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            knownFoods,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Food parser gagal menganalisis makanan."
        );
      }

      const analysis =
        data?.result as FoodAnalysis;

      if (
        !analysis ||
        !Array.isArray(analysis.items)
      ) {
        throw new Error(
          "Format hasil Food parser tidak valid."
        );
      }

      setFoodAnalysis(analysis);

      // =====================================================
      // STEP 4: MATCH PARSER → DATABASE TKPI
      // =====================================================

      const results: NutritionResult[] =
        analysis.items.map((item) => {
          const matched = findFoodMatch(
            item,
            nutritionFoods
          );

          if (!matched) {
            return {
              ...item,
              matched_food: null,
              calories: 0,
              protein: 0,
              fat: 0,
              carbs: 0,
              match_confidence: "low",
            };
          }

          const servingGrams = Number(
            matched.serving_grams ?? 100
          );

          const multiplier =
            estimatePortionMultiplier(
              item,
              servingGrams
            );

          if (multiplier === null) {
            return {
              ...item,
              matched_food: matched.name,
              calories: 0,
              protein: 0,
              fat: 0,
              carbs: 0,
              match_confidence: "low",
            };
          }

          const calories =
            Number(
              matched.calories_kcal ?? 0
            ) * multiplier;

          const protein =
            Number(
              matched.protein_g ?? 0
            ) * multiplier;

          const fat =
            Number(
              matched.fat_g ?? 0
            ) * multiplier;

          const carbs =
            Number(
              matched.carbohydrate_g ?? 0
            ) * multiplier;

          return {
            ...item,
            matched_food: matched.name,
            calories,
            protein,
            fat,
            carbs,
            match_confidence:
              item.confidence === "high"
                ? "high"
                : item.confidence === "medium"
                  ? "medium"
                  : "low",
          };
        });

      setNutritionResults(results);

      // =====================================================
      // STEP 5: TOTAL NUTRISI INPUT INI
      // =====================================================

      const totals = results.reduce(
        (total, item) => {
          total.calories += item.calories;
          total.protein += item.protein;
          total.carbs += item.carbs;
          total.fat += item.fat;

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

      // =====================================================
      // STEP 6: SAVE FOOD LOG
      // =====================================================

      const { error: logError } =
        await supabase
          .from("food_logs")
          .insert({
            user_id: user.id,
            raw_input: text,
            ai_result: {
              analysis,
              nutrition_results: results,
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
            note: analysis.note,
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

      {/* INTRO */}



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



      {/* PROFILE */}



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



            {/* BIRTH DATE */}



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



            {/* SEX */}



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



            {/* ACTIVITY */}



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



      {/* BODY METRICS */}



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

              {bmiStatus.description}

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



      {/* ENERGY GUIDE */}



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

            Lengkapi tanggal lahir, jenis

            kelamin, tinggi, berat, dan

            activity level untuk menghitung

            estimasi kebutuhan energi.

          </div>

        )}



        <p className="mt-4 text-xs leading-5 opacity-40">

          Angka ini merupakan estimasi, bukan

          diagnosis atau target medis personal.

        </p>

      </section>



      {/* FOOD AI */}



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

              sehari-hari. Sistem akan mengenali

              makanan dan porsinya, lalu mengambil

              nilai gizinya dari database pangan.

            </p>

          </div>



          <span className="rounded-full bg-[#ddd4c7] px-3 py-1 text-xs font-semibold">

            AI Nutrition

          </span>

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

              estimasi lebih akurat. Kamu boleh

              mengetik dengan bahasa sehari-hari.

            </p>



            <button

              type="button"

              onClick={analyzeFood}

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



      {/* AI RESULT */}



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

                            )}

                            g · C{" "}

                            {item.carbs.toFixed(

                              1

                            )}

                            g · F{" "}

                            {item.fat.toFixed(

                              1

                            )}

                            g

                          </p>

                        </>

                      ) : (

                        <p className="text-sm font-medium text-[#8a6257]">

                          Belum ditemukan

                          di database

                        </p>

                      )}

                    </div>

                  </div>



                  {item.matched_food && (

                    <p className="mt-3 text-xs opacity-40">

                      Database match:{" "}

                      {item.matched_food}

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



      {/* DAILY NUTRITION */}



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

            Belum ada makanan yang dianalisis

            hari ini.

          </div>

        )}



        {foodAnalysis && (

          <div className="mt-5 rounded-2xl border border-dashed border-[#cfc3b4] p-4 text-sm leading-6 opacity-50">

            Hasil ini merupakan estimasi berdasarkan

            porsi yang kamu masukkan dan data pangan

            yang tersedia di database.

          </div>

        )}

      </section>

    </div>

  );

}