"use client";

import { useEffect, useState } from "react";
import type { PlaceSearchResult } from "@/components/PlacesMap";

type PlaceSearchProps = {
  onChoose: (result: PlaceSearchResult) => void;
};

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    locality?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAddress(p: NonNullable<PhotonFeature["properties"]>) {
  return [
    p.street && p.housenumber
      ? `${p.street} ${p.housenumber}`
      : p.street || p.housenumber,
    p.locality,
    p.city,
    p.district,
    p.state,
    p.country,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");
}

function scoreResult(
  result: PlaceSearchResult,
  properties: NonNullable<PhotonFeature["properties"]>,
  query: string,
) {
  const q = normalize(query);
  const name = normalize(result.name);
  const address = normalize(result.address);
  const words = q.split(" ").filter(Boolean);

  let score = 0;

  // Prioritaskan kecocokan nama bisnis/tempat.
  if (name === q) score += 120;
  else if (name.startsWith(q)) score += 90;
  else if (name.includes(q)) score += 65;

  // Pencarian beberapa kata, misalnya "Inaka Coffee".
  if (words.length > 1 && words.every((word) => name.includes(word))) {
    score += 55;
  }

  // Jika pengguna mengetik nama dan kota, cocokkan keduanya.
  const addressWords = words.filter((word) => address.includes(word));
  score += addressWords.length * 12;

  // Nama yang tidak mengandung satu pun kata pencarian
  // jangan mengalahkan hasil yang lebih relevan.
  if (!words.some((word) => name.includes(word))) {
    score -= 20;
  }

  // Prioritaskan hasil bisnis/tempat, bukan sekadar alamat.
  if (properties.type === "house" || properties.type === "street") {
    score -= 15;
  }

  return score;
}

export default function PlaceSearch({ onChoose }: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const text = query.trim();

    if (text.length < 3) {
      setResults([]);
      setError("");
      setSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError("");

      try {
        const url = new URL("https://photon.komoot.io/api/");

        url.searchParams.set("q", text);

        // Ambil lebih banyak kandidat sebelum mengurutkan.
        url.searchParams.set("limit", "20");
        url.searchParams.set("lang", "en");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Location search service is unavailable.");
        }

        const data: { features?: PhotonFeature[] } =
          await response.json();

        const parsed = (data.features ?? [])
          .map((feature) => {
            const coordinates = feature.geometry?.coordinates;
            const p = feature.properties;

            if (!coordinates || coordinates.length < 2 || !p) {
              return null;
            }

            const address = getAddress(p);

            const result: PlaceSearchResult = {
              name: p.name || address || text,
              address,
              longitude: coordinates[0],
              latitude: coordinates[1],
            };

            return {
              result,
              score: scoreResult(result, p, text),
            };
          })
          .filter(
            (
              item,
            ): item is {
              result: PlaceSearchResult;
              score: number;
            } =>
              item !== null &&
              Number.isFinite(item.result.latitude) &&
              Number.isFinite(item.result.longitude),
          );

        // Urutkan berdasarkan kecocokan, bukan urutan dari API saja.
        parsed.sort((a, b) => b.score - a.score);

        // Hilangkan hasil duplikat pada koordinat yang sama.
        const seen = new Set<string>();

        const uniqueResults = parsed
          .filter(({ result }) => {
            const key =
              `${result.latitude.toFixed(5)},` +
              `${result.longitude.toFixed(5)}`;

            if (seen.has(key)) return false;

            seen.add(key);
            return true;
          })
          .slice(0, 8)
          .map(({ result }) => result);

        if (!controller.signal.aborted) {
          setResults(uniqueResults);

          if (uniqueResults.length === 0) {
            setError(
              "No matching places found. Try another name or spelling.",
            );
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Could not search right now. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function chooseResult(result: PlaceSearchResult) {
    setQuery(result.name);
    setResults([]);
    setError("");
    onChoose(result);
  }

  return (
    <div className="relative space-y-2">
      <label className="block space-y-2 text-sm">
        <span className="font-medium">🔎 Search a place</span>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a cafe, restaurant, city..."
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </label>

      <p className="text-xs text-[var(--muted)]">
        Search for places worldwide. Choose a result to fill in
        the name, address, and coordinates automatically.
      </p>

      {searching && (
        <p role="status" className="text-sm text-[var(--muted)]">
          Searching locations...
        </p>
      )}

      {error && (
        <p role="status" className="text-sm text-[var(--muted)]">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          {results.map((result, index) => (
            <button
              key={`${result.latitude}-${result.longitude}-${index}`}
              type="button"
              onClick={() => chooseResult(result)}
              className="block w-full border-b border-[var(--border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--surface-hover)]"
            >
              <span className="block text-sm font-medium">
                📍 {result.name}
              </span>

              {result.address && (
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  {result.address}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}