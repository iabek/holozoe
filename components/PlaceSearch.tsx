
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

type NominatimResult = {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  category?: string;
  addresstype?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

type Candidate = {
  result: PlaceSearchResult;
  score: number;
  type?: string;
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

function getAddress(
  p: NonNullable<PhotonFeature["properties"]>,
) {
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

function getNominatimAddress(item: NominatimResult) {
  const a = item.address;

  if (!a) return item.display_name || "";

  return [
    [a.road, a.house_number].filter(Boolean).join(" "),
    a.neighbourhood,
    a.suburb,
    a.city || a.town || a.village || a.municipality,
    a.county,
    a.state,
    a.country,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");
}

function scoreResult(
  result: PlaceSearchResult,
  query: string,
  type?: string,
) {
  const q = normalize(query);
  const name = normalize(result.name);
  const address = normalize(result.address);
  const combined = `${name} ${address}`;
  const words = q.split(" ").filter(Boolean);

  let score = 0;

  if (name === q) score += 120;
  else if (name.startsWith(q)) score += 90;
  else if (name.includes(q)) score += 65;

  if (words.length > 1 && words.every((word) => name.includes(word))) {
    score += 55;
  }

  const nameMatches = words.filter((word) => name.includes(word)).length;
  const addressMatches = words.filter((word) =>
    address.includes(word),
  ).length;

  score += nameMatches * 15;
  score += addressMatches * 10;

  if (words.every((word) => combined.includes(word))) {
    score += 35;
  }

  if (nameMatches === 0) score -= 35;

  if (type === "house" || type === "street") {
    score -= 15;
  }

  return score;
}

function parsePhoton(features: PhotonFeature[], query: string): Candidate[] {
  return features.flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    const p = feature.properties;

    if (
      !coordinates ||
      coordinates.length < 2 ||
      !p ||
      !Number.isFinite(coordinates[0]) ||
      !Number.isFinite(coordinates[1])
    ) {
      return [];
    }

    const address = getAddress(p);
    const result: PlaceSearchResult = {
      name: p.name || address || query,
      address,
      longitude: coordinates[0],
      latitude: coordinates[1],
    };

    return [{
      result,
      score: scoreResult(result, query, p.type),
      type: p.type,
    }];
  });
}

function parseNominatim(
  items: NominatimResult[],
  query: string,
): Candidate[] {
  return items.flatMap((item) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !item.display_name
    ) {
      return [];
    }

    const address = getNominatimAddress(item);
    const result: PlaceSearchResult = {
      name: item.name || address || item.display_name || query,
      address: address || item.display_name,
      latitude,
      longitude,
    };

    return [{
      result,
      score: scoreResult(
        result,
        query,
        item.type || item.addresstype,
      ),
      type: item.type,
    }];
  });
}

function mergeResults(candidates: Candidate[]) {
  const seen = new Set<string>();

  return candidates
    .sort((a, b) => b.score - a.score)
    .filter(({ result }) => {
      const key = [
        normalize(result.name),
        result.latitude.toFixed(4),
        result.longitude.toFixed(4),
      ].join("|");

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map(({ result }) => result);
}

async function searchPhoton(
  query: string,
  signal: AbortSignal,
): Promise<Candidate[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");
  url.searchParams.set("lang", "en");

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error("Photon search failed");
  }

  const data: { features?: PhotonFeature[] } = await response.json();
  return parsePhoton(data.features ?? [], query);
}

async function searchNominatim(
  query: string,
  signal: AbortSignal,
): Promise<Candidate[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("accept-language", "en");

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Nominatim search failed");
  }

  const data: NominatimResult[] = await response.json();
  return parseNominatim(data, query);
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
      setResults([]);

      try {
        let candidates: Candidate[] = [];

        // Provider pertama: Photon.
        try {
          candidates = await searchPhoton(text, controller.signal);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
        }

        if (controller.signal.aborted) return;

        // Fallback: Nominatim jika Photon gagal atau hasilnya sedikit.
        // Beri jeda debounce sebelum request kedua untuk mengurangi beban API.
        if (candidates.length < 5) {
          try {
            const fallback = await searchNominatim(
              text,
              controller.signal,
            );
            candidates = [...candidates, ...fallback];
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
              return;
            }
          }
        }

        if (controller.signal.aborted) return;

        const uniqueResults = mergeResults(candidates);
        setResults(uniqueResults);

        if (uniqueResults.length === 0) {
          setError(
            "No matching places found. Try a shorter name, city, or full address.",
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not search right now. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 700);

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
        Search places worldwide. Choose a result to fill in the
        name, address, and coordinates automatically.
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

      <p className="text-xs text-[var(--muted)]">
        Location data © OpenStreetMap contributors.
      </p>
    </div>
  );
}
