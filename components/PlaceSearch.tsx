
"use client";

import { useEffect, useState } from "react";
import type { PlaceSearchResult } from "@/components/PlacesMap";

type PlaceSearchProps = {
  onChoose: (result: PlaceSearchResult) => void;
};

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
        url.searchParams.set("limit", "6");
        url.searchParams.set("lang", "en");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Search service is unavailable.");
        }

        const data = await response.json();

        const parsed: PlaceSearchResult[] = (data.features ?? [])
          .map((feature: {
            geometry?: { coordinates?: [number, number] };
            properties?: {
              name?: string;
              street?: string;
              housenumber?: string;
              city?: string;
              district?: string;
              locality?: string;
              state?: string;
              country?: string;
            };
          }) => {
            const coordinates = feature.geometry?.coordinates;
            const p = feature.properties;

            if (!coordinates || coordinates.length < 2) return null;

            const address = [
              p?.street,
              p?.housenumber,
              p?.locality,
              p?.city,
              p?.district,
              p?.state,
              p?.country,
            ]
              .filter(Boolean)
              .filter((value, index, array) => array.indexOf(value) === index)
              .join(", ");

            return {
              name: p?.name || address || text,
              address,
              longitude: coordinates[0],
              latitude: coordinates[1],
            };
          })
          .filter(
            (item: PlaceSearchResult | null): item is PlaceSearchResult =>
              item !== null &&
              Number.isFinite(item.latitude) &&
              Number.isFinite(item.longitude),
          );

        setResults(parsed);

        if (parsed.length === 0) {
          setError("No matching places found. Try another search.");
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
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function chooseResult(result: PlaceSearchResult) {
    setQuery(result.name);
    setResults([]);
    onChoose(result);
  }

  return (
    <div className="space-y-2">
      <label className="block space-y-2 text-sm">
        <span className="font-medium">Search a place</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a cafe, restaurant, city..."
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </label>

      <p className="text-xs text-[var(--muted)]">
        Search for at least 3 characters, then select a result to fill in the
        place name, address, and coordinates.
      </p>

      {searching && (
        <p className="text-xs text-[var(--muted)]">Searching locations...</p>
      )}

      {error && (
        <p role="status" className="text-xs text-[var(--muted)]">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
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
