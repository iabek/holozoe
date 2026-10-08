import { NextResponse } from "next/server";

type KnownFood = {
  name: string;
  aliases?: string[] | null;
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

/**
 * =========================================================
 * LOCAL FOOD PARSER
 * =========================================================
 *
 * Parser ini TIDAK menggunakan AI/API berbayar.
 *
 * Tugas parser:
 * 1. Membaca input makanan dari user.
 * 2. Memisahkan beberapa makanan.
 * 3. Mengenali jumlah dan satuan.
 * 4. Menggunakan daftar makanan TKPI dari database.
 * 5. Mengembalikan makanan yang tidak ditemukan juga,
 *    supaya tidak hilang diam-diam dari hasil analisis.
 *
 * Nilai nutrisi TIDAK dihitung di sini.
 * Nutrisi tetap diambil dari tabel nutrition_foods.
 */

// =========================================================
// ANGKA DALAM BAHASA INDONESIA
// =========================================================

const numberWords: Record<string, number> = {
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  setengah: 0.5,
  seperempat: 0.25,
  sepertiga: 0.33,
};

// =========================================================
// KONVERSI SATUAN → GRAM
// =========================================================

const unitToGrams: Record<string, number> = {
  gram: 1,
  g: 1,
  kilogram: 1000,
  kg: 1000,
  ons: 100,
  centong: 100,
  sendok: 15,
  "sendok makan": 15,
  sdm: 15,
  "sendok teh": 5,
  sdt: 5,
  mangkuk: 250,
  bowl: 250,
  piring: 250,
  gelas: 250,
  cangkir: 200,
  botol: 500,
  potong: 75,
  iris: 30,
  buah: 100,
  butir: 50,
  lembar: 30,
  bungkus: 250,
  porsi: 250,
};

const unitNames = [
  "sendok makan",
  "sendok teh",
  "kilogram",
  "centong",
  "mangkuk",
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
  "bowl",
  "g",
];

// =========================================================
// SEMANTIC ALIAS
// =========================================================
//
// Ini hanya untuk istilah sehari-hari yang umum.
// Nilai nutrisi tetap berasal dari database TKPI.
// =========================================================

const semanticAliases: Record<string, string[]> = {
  omelet: ["telur ayam dadar", "telur dadar"],
  omelette: ["telur ayam dadar", "telur dadar"],
  telor: ["telur"],
  "telor ayam": ["telur ayam"],
};

// =========================================================
// CLEAN / NORMALIZE
// =========================================================

function cleanText(text: string) {
  return text
    .toLowerCase()
    .replace(/[.!?;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Menormalkan nama TKPI agar nama seperti:
 *
 * Telur ayam, dadar, KZGPI-1990 masakan
 *
 * tetap dapat dikenali sebagai:
 *
 * telur ayam dadar
 */
function normalizeFoodName(value: string) {
  return cleanText(value)
    .replace(/\b(?:kzgpi|kzgmi|dabm)-?\d{4}\b/gi, " ")
    .replace(/\b(segar|masakan|matang)\b/gi, " ")
    .replace(/[,:/()[\]{}-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// PARSE NUMBER
// =========================================================

function parseNumber(value: string | undefined) {
  if (!value) return null;

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(",", ".");

  const numeric = Number(normalized);

  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return numberWords[normalized] ?? null;
}

// =========================================================
// DETECT UNIT
// =========================================================

function detectUnit(text: string) {
  const sortedUnits = [...unitNames].sort(
    (a, b) => b.length - a.length
  );

  for (const unit of sortedUnits) {
    const escaped = unit.replace(/ /g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");

    if (regex.test(text)) {
      return unit;
    }
  }

  return null;
}

// =========================================================
// DETECT QUANTITY
// =========================================================

function detectQuantity(text: string) {
  const numericMatch = text.match(/\b(\d+(?:[.,]\d+)?)\b/);

  if (numericMatch) {
    return parseNumber(numericMatch[1]);
  }

  for (const word of Object.keys(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, "i");

    if (regex.test(text)) {
      return numberWords[word];
    }
  }

  return null;
}

// =========================================================
// EXTRACT FOOD PHRASE
// =========================================================

function extractFoodPhrase(text: string) {
  let name = text;

  // Hapus angka numerik.
  name = name.replace(/\b\d+(?:[.,]\d+)?\b/g, " ");

  // Hapus angka dalam bentuk kata.
  for (const word of Object.keys(numberWords)) {
    name = name.replace(
      new RegExp(`\\b${word}\\b`, "gi"),
      " "
    );
  }

  // Hapus satuan.
  for (const unit of unitNames) {
    name = name.replace(
      new RegExp(`\\b${unit.replace(/ /g, "\\s+")}\\b`, "gi"),
      " "
    );
  }

  // Kata pengantar umum.
  name = name.replace(
    /\b(makan|minum|aku|saya|sebanyak|dengan)\b/gi,
    " "
  );

  return name
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// ESTIMATE GRAMS
// =========================================================

function estimateGrams(
  quantity: number,
  unit: string,
  foodName: string
) {
  const normalizedUnit = unit.toLowerCase().trim();
  const gramsPerUnit = unitToGrams[normalizedUnit];

  if (gramsPerUnit) {
    return Math.round(quantity * gramsPerUnit);
  }

  const normalizedFood = normalizeFoodName(foodName);

  if (
    normalizedFood.includes("telur") ||
    normalizedFood.includes("telor")
  ) {
    return Math.round(quantity * 50);
  }

  if (
    normalizedFood === "apel" ||
    normalizedFood === "alpukat"
  ) {
    return Math.round(quantity * 100);
  }

  return Math.round(quantity * 100);
}

// =========================================================
// SPLIT EXPLICIT ENTRIES
// =========================================================
//
// nasi + ayam + teh
// nasi, ayam, teh
// nasi dan ayam
//
// semuanya menjadi entry terpisah.
// =========================================================

function splitFoodEntries(text: string) {
  let normalized = cleanText(text);

  normalized = normalized.replace(/\s*\+\s*/g, "|");
  normalized = normalized.replace(/\s*,\s*/g, "|");
  normalized = normalized.replace(/\s+\bdan\b\s+/g, "|");

  return normalized
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

// =========================================================
// DATABASE CANDIDATES
// =========================================================

type FoodCandidate = {
  food: KnownFood;
  searchName: string;
};

function buildCandidates(foods: KnownFood[]) {
  const candidates: FoodCandidate[] = [];

  for (const food of foods) {
    const names = [food.name, ...(food.aliases ?? [])];

    for (const name of names) {
      const normalized = normalizeFoodName(name);

      if (!normalized) continue;

      candidates.push({
        food,
        searchName: normalized,
      });
    }
  }

  // Nama terpanjang diperiksa lebih dahulu.
  return candidates.sort(
    (a, b) => b.searchName.length - a.searchName.length
  );
}

// =========================================================
// FIND EXACT CANDIDATE FROM WORDS
// =========================================================

function findCandidateFromWords(
  words: string[],
  startIndex: number,
  candidates: FoodCandidate[]
) {
  for (const candidate of candidates) {
    const candidateWords = candidate.searchName.split(" ");

    if (
      startIndex + candidateWords.length >
      words.length
    ) {
      continue;
    }

    const currentWords = words.slice(
      startIndex,
      startIndex + candidateWords.length
    );

    if (currentWords.join(" ") === candidate.searchName) {
      return candidate;
    }
  }

  return null;
}

// =========================================================
// SEMANTIC CANDIDATE
// =========================================================

function findSemanticCandidate(
  words: string[],
  startIndex: number,
  candidates: FoodCandidate[]
) {
  // Coba phrase 2-3 kata dahulu.
  for (let length = Math.min(3, words.length - startIndex); length >= 1; length--) {
    const phrase = words
      .slice(startIndex, startIndex + length)
      .join(" ");

    const aliases = semanticAliases[phrase];

    if (!aliases) continue;

    for (const alias of aliases) {
      const normalizedAlias = normalizeFoodName(alias);

      const candidate = candidates.find(
        (item) =>
          item.searchName === normalizedAlias ||
          item.searchName.startsWith(`${normalizedAlias} `)
      );

      if (candidate) {
        return {
          candidate,
          consumedWords: length,
        };
      }
    }
  }

  return null;
}

// =========================================================
// SPLIT COMPOUND FOOD PHRASE
// =========================================================
//
// Contoh:
//
// nasi omelet
//
// → nasi
// → telur ayam, dadar, ...
//
// nasi nugget
//
// → nasi
// → nugget (unmatched)
//
// Jadi kata yang tidak ditemukan TIDAK akan hilang.
// =========================================================

function splitCompoundFoodPhrase(
  phrase: string,
  candidates: FoodCandidate[]
) {
  const normalized = normalizeFoodName(phrase);

  if (!normalized) return [];

  const words = normalized.split(" ");
  const parts: {
    text: string;
    matchedFood: KnownFood | null;
  }[] = [];

  let index = 0;

  while (index < words.length) {
    const exactCandidate = findCandidateFromWords(
      words,
      index,
      candidates
    );

    if (exactCandidate) {
      const candidateWordCount = exactCandidate.searchName.split(" ").length;

      parts.push({
        text: exactCandidate.searchName,
        matchedFood: exactCandidate.food,
      });

      index += candidateWordCount;
      continue;
    }

    const semanticCandidate = findSemanticCandidate(
      words,
      index,
      candidates
    );

    if (semanticCandidate) {
      parts.push({
        text: words
          .slice(
            index,
            index + semanticCandidate.consumedWords
          )
          .join(" "),
        matchedFood: semanticCandidate.candidate.food,
      });

      index += semanticCandidate.consumedWords;
      continue;
    }

    // Tidak ditemukan di TKPI.
    // Tetap masukkan ke hasil.
    parts.push({
      text: words[index],
      matchedFood: null,
    });

    index += 1;
  }

  return parts;
}

// =========================================================
// PARSE ONE ENTRY
// =========================================================

function parseFoodEntry(
  entry: string,
  candidates: FoodCandidate[]
): FoodItem[] {
  const cleaned = cleanText(entry);

  if (!cleaned) return [];

  const quantity = detectQuantity(cleaned);
  const unit = detectUnit(cleaned);
  const foodPhrase = extractFoodPhrase(cleaned);

  if (!foodPhrase) return [];

  const finalQuantity = quantity ?? 1;
  const finalUnit = unit ?? "porsi";

  const parts = splitCompoundFoodPhrase(
    foodPhrase,
    candidates
  );

  if (parts.length === 0) return [];

  const hasExplicitPortion =
    quantity !== null || unit !== null;

  const baseGrams = estimateGrams(
    finalQuantity,
    finalUnit,
    parts[0].matchedFood?.name ?? parts[0].text
  );

  // Jika user menulis "nasi omelet" tanpa porsi,
  // masing-masing makanan dianggap 1 porsi.
  // Jika user memberi satu porsi untuk phrase gabungan,
  // berat dibagi ke bagian-bagian agar tidak double-count.
  const gramsPerPart =
    hasExplicitPortion && parts.length > 1
      ? baseGrams / parts.length
      : baseGrams;

  return parts.map((part) => {
    const foodName =
      part.matchedFood?.name ?? part.text;

    let confidence: "high" | "medium" | "low" = "high";
    let note = "Makanan dan porsi berhasil dikenali.";

    if (!part.matchedFood) {
      confidence = "low";
      note = "Makanan belum ditemukan di database TKPI.";
    } else if (!quantity && !unit) {
      confidence = "medium";
      note =
        "Jumlah dan satuan tidak disebutkan. Sistem menggunakan perkiraan 1 porsi.";
    } else if (!quantity) {
      confidence = "medium";
      note =
        "Jumlah tidak disebutkan. Sistem menggunakan 1 porsi.";
    } else if (!unit) {
      confidence = "medium";
      note =
        "Satuan tidak disebutkan. Berat makanan diperkirakan.";
    }

    if (parts.length > 1 && hasExplicitPortion) {
      note =
        part.matchedFood
          ? "Makanan dikenali sebagai bagian dari input gabungan; porsi dibagi agar tidak dihitung ganda."
          : "Bagian makanan ini belum ditemukan di database TKPI.";
    }

    return {
      name: foodName,
      quantity:
        hasExplicitPortion && parts.length > 1
          ? finalQuantity / parts.length
          : finalQuantity,
      unit: finalUnit,
      estimated_grams: Math.round(gramsPerPart),
      confidence,
      note,
    };
  });
}

// =========================================================
// PARSE ALL
// =========================================================

function parseFoodText(
  text: string,
  knownFoods: KnownFood[]
): FoodAnalysis {
  const candidates = buildCandidates(knownFoods);
  const entries = splitFoodEntries(text);
  const items: FoodItem[] = [];

  for (const entry of entries) {
    items.push(...parseFoodEntry(entry, candidates));
  }

  let overallConfidence: "high" | "medium" | "low" = "high";

  if (items.length === 0) {
    overallConfidence = "low";
  } else if (
    items.some((item) => item.confidence === "low")
  ) {
    overallConfidence = "low";
  } else if (
    items.some((item) => item.confidence === "medium")
  ) {
    overallConfidence = "medium";
  }

  return {
    items,
    overall_confidence: overallConfidence,
    note:
      items.length > 0
        ? "Makanan dikenali menggunakan parser lokal HOLOZOE. Nilai nutrisi tetap diambil dari database TKPI."
        : "Sistem belum dapat mengenali makanan dari input tersebut.",
  };
}

// =========================================================
// API
// =========================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const text = body?.text;
    const knownFoods = Array.isArray(body?.knownFoods)
      ? body.knownFoods
      : [];

    if (
      typeof text !== "string" ||
      !text.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Input makanan kosong.",
        },
        { status: 400 }
      );
    }

    const result = parseFoodText(
      text,
      knownFoods
    );

    if (result.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "HOLOZOE belum dapat mengenali makanan dari input tersebut.",
        },
        { status: 422 }
      );
    }

    console.log(
      "FOOD LOCAL PARSER SUCCESS:",
      JSON.stringify(result, null, 2)
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "FOOD LOCAL PARSER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Terjadi kesalahan saat membaca input makanan.",
      },
      { status: 500 }
    );
  }
}
