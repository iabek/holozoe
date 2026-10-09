
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

export type MapPlace = {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  category?: string | null;
  is_favorite?: boolean;
};

export type PlaceSearchResult = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type PlacesMapProps = {
  places: MapPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: MapPlace) => void;
  onChooseLocation?: (result: PlaceSearchResult) => void;
};

const createPin = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px #0004"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });

const normalPin = createPin("#8b5cf6");
const favoritePin = createPin("#ec4899");

function MapFocus({
  position,
}: {
  position: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 0.8 });
  }, [map, position]);

  return null;
}

export default function PlacesMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  onChooseLocation,
}: PlacesMapProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [focus, setFocus] = useState<[number, number] | null>(null);

  const mappedPlaces = useMemo(
    () =>
      places.filter(
        (place) =>
          typeof place.latitude === "number" &&
          typeof place.longitude === "number" &&
          Number.isFinite(place.latitude) &&
          Number.isFinite(place.longitude),
      ),
    [places],
  );

  const center: [number, number] =
    mappedPlaces.length > 0
      ? [
          mappedPlaces[0].latitude as number,
          mappedPlaces[0].longitude as number,
        ]
      : [-2.5489, 118.0149];

  useEffect(() => {
    const text = query.trim();

    if (text.length < 3) {
      setResults([]);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      try {
        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", text);
        url.searchParams.set("limit", "6");
        url.searchParams.set("lang", "en");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Search unavailable");

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
              state?: string;
              country?: string;
            };
          }) => {
            const coordinates = feature.geometry?.coordinates;
            const p = feature.properties;

            if (!coordinates) return null;

            const address = [
              p?.street,
              p?.housenumber,
              p?.city,
              p?.district,
              p?.state,
              p?.country,
            ]
              .filter(Boolean)
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
        if (!parsed.length) setSearchError("No matching places found.");
      } catch (error) {
        if (
          error instanceof Error &&
          error.name !== "AbortError"
        ) {
          setSearchError("Search failed. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function chooseResult(result: PlaceSearchResult) {
    setFocus([result.latitude, result.longitude]);
    setQuery(result.name);
    setResults([]);
    onChooseLocation?.(result);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold">Places Map</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search for a place and save its location to your collection.
        </p>
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a cafe, restaurant, city..."
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />

        {searching && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Searching...
          </p>
        )}

        {searchError && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {searchError}
          </p>
        )}

        {results.length > 0 && (
          <div className="absolute inset-x-0 top-full z-[1000] mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
            {results.map((result, index) => (
              <button
                type="button"
                key={`${result.latitude}-${result.longitude}-${index}`}
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

      <div className="relative z-0 overflow-hidden rounded-xl border border-[var(--border)]">
        <MapContainer
          center={center}
          zoom={mappedPlaces.length ? 12 : 5}
          scrollWheelZoom
          style={{ height: 430, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFocus position={focus} />

          {mappedPlaces.map((place) => (
            <Marker
              key={place.id}
              position={[
                place.latitude as number,
                place.longitude as number,
              ]}
              icon={
                place.is_favorite ? favoritePin : normalPin
              }
              eventHandlers={{
                click: () => onSelectPlace?.(place),
              }}
            >
              <Popup>
                <strong>{place.name}</strong>
                {place.category && <p>{place.category}</p>}
                {place.location && <p>{place.location}</p>}
                {place.is_favorite && <p>♥ Favorite</p>}
                {onSelectPlace && (
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place)}
                  >
                    View place
                  </button>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {mappedPlaces.length} saved places mapped · Map data © OpenStreetMap contributors
      </p>

      {mappedPlaces.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          Saved places with coordinates will appear here.
        </p>
      )}

      <p className="text-xs leading-5 text-[var(--muted)]">
        Search results are provided by Photon and may not include every business.
      </p>
    </section>
  );
}
