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

function calculateAge(
  birthDate: string | null
) {
  if (!birthDate) return null;

  const birth = new Date(
    `${birthDate}T00:00:00`
  );

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
    (
      monthDifference === 0 &&
      today.getDate() < birth.getDate()
    )
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

function getBmiStatus(
  bmi: number | null
) {
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

  /*
   * Mifflin-St Jeor
   */

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

  const [foodInput, setFoodInput] =
    useState("");

  useEffect(() => {
    async function loadHealth() {
      setLoading(true);
      setError("");

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

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
      (heightMeters *
        heightMeters)
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

    const { error: saveError } =
      await supabase
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
      new Event(
        "life-game-updated"
      )
    );
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
                    event.target.value as
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
                      key={option.value}
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

        {/* STATUS */}

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

      {/* BODY SUMMARY */}

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
          {/* BMI */}

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

          {/* AGE */}

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

          {/* BMR */}

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

          {/* TDEE */}

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
              sehari-hari. Nanti sistem akan
              mengenali makanan dan memperkirakan
              kandungan gizinya berdasarkan
              database pangan Indonesia.
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
              disabled={!foodInput.trim()}
              className="shrink-0 rounded-2xl bg-[#4f473e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3f382f] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Analyze Food
            </button>
          </div>
        </div>
      </section>

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
              —
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
              —
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
              —
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
              —
            </p>

            <p className="mt-1 text-xs opacity-50">
              g
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-[#cfc3b4] p-4 text-sm leading-6 opacity-50">
          Food analysis belum diaktifkan pada
          tahap ini. Setelah database pangan
          dimasukkan, hasil akan menampilkan
          calories, protein, carbohydrate, dan
          fat per makanan serta total harian.
        </div>
      </section>
    </div>
  );
}