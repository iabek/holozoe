
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PlaceSearch, { type PlaceSearchResult } from "@/components/PlaceSearch";

type Place = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  rating: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  is_favorite: boolean;
  tags: string[] | null;
  created_at: string;
};

type MenuItem = {
  id: string;
  place_id: string;
  name: string;
  rating: number | null;
  notes: string | null;
  is_recommended: boolean;
  created_at: string;
};

type PlaceVisit = {
  id: string;
  place_id: string;
  visited_at: string;
  notes: string | null;
  created_at: string;
};

type PlacesProps = {
  onBack: () => void;
};

const CATEGORIES = [
  "Restaurant",
  "Cafe",
  "Dessert",
  "Shopping",
  "Nature",
  "Entertainment",
  "Study Spot",
  "Travel",
  "Other",
];

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "An unexpected error occurred.";
}

function getGoogleMapsUrl(place: {
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  if (
    place.latitude !== null &&
    place.longitude !== null
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
  }

  if (place.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${place.name} ${place.location}`,
    )}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    place.name,
  )}`;
}

function RatingStars({ rating }: { rating: number | null }) {
  const value = Math.max(0, Math.min(5, rating ?? 0));

  return (
    <span className="tracking-wide text-amber-500">
      {"★".repeat(value)}
      <span className="text-[var(--border)]">
        {"★".repeat(5 - value)}
      </span>
    </span>
  );
}

export default function Places({ onBack }: PlacesProps) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [places, setPlaces] = useState<Place[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [visits, setVisits] = useState<PlaceVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [favoriteFilter, setFavoriteFilter] = useState(false);

  const [placeName, setPlaceName] = useState("");
  const [placeCategory, setPlaceCategory] = useState("Restaurant");
  const [rating, setRating] = useState(0);
  const [placeLocation, setPlaceLocation] = useState("");
  const [placeLatitude, setPlaceLatitude] = useState<number | null>(null);
  const [placeLongitude, setPlaceLongitude] = useState<number | null>(null);
  const [placeNotes, setPlaceNotes] = useState("");
  const [placeTags, setPlaceTags] = useState("");

  const [showMenuForm, setShowMenuForm] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuRating, setMenuRating] = useState("0");
  const [menuNotes, setMenuNotes] = useState("");
  const [menuRecommended, setMenuRecommended] = useState(false);

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [visitNotes, setVisitNotes] = useState("");

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      const [
        { data: placeData, error: placeError },
        { data: menuData, error: menuError },
        { data: visitData, error: visitError },
      ] = await Promise.all([
        supabase
          .from("places")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("place_menu_items")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("place_visits")
          .select("*")
          .order("visited_at", { ascending: false }),
      ]);

      if (placeError) throw placeError;
      if (menuError) throw menuError;
      if (visitError) throw visitError;

      setPlaces((placeData ?? []) as Place[]);
      setMenuItems((menuData ?? []) as MenuItem[]);
      setVisits((visitData ?? []) as PlaceVisit[]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  function resetPlaceForm() {
    setShowPlaceForm(false);
    setEditingPlaceId(null);
    setPlaceName("");
    setPlaceCategory("Restaurant");
    setRating(0);
    setPlaceLocation("");
    setPlaceLatitude(null);
    setPlaceLongitude(null);
    setPlaceNotes("");
    setPlaceTags("");
  }

  function handleChooseLocation(result: PlaceSearchResult) {
    setPlaceName(result.name);
    setPlaceLocation(result.address);
    setPlaceLatitude(result.latitude);
    setPlaceLongitude(result.longitude);
  }

  function openEditPlaceForm(place: Place) {
    setEditingPlaceId(place.id);
    setPlaceName(place.name);
    setPlaceCategory(place.category || "Other");
    setRating(place.rating ?? 0);
    setPlaceLocation(place.location ?? "");
    setPlaceLatitude(place.latitude);
    setPlaceLongitude(place.longitude);
    setPlaceNotes(place.notes ?? "");
    setPlaceTags((place.tags ?? []).join(", "));
    setShowPlaceForm(true);
    setSelectedPlace(null);
    setError("");
    setNotice("");
  }

  async function savePlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!placeName.trim()) {
      setError("Please enter a place name.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please log in first.");

      const payload = {
        name: placeName.trim(),
        category: placeCategory,
        rating,
        location: placeLocation.trim() || null,
        latitude: placeLatitude,
        longitude: placeLongitude,
        notes: placeNotes.trim() || null,
        tags: placeTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      if (editingPlaceId) {
        const { error: updateError } = await supabase
          .from("places")
          .update(payload)
          .eq("id", editingPlaceId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
        setNotice("Place updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("places")
          .insert({
            ...payload,
            user_id: user.id,
            is_favorite: false,
          });

        if (insertError) throw insertError;
        setNotice("Place saved successfully.");
      }

      resetPlaceForm();
      await loadPlaces();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(place: Place) {
    setError("");
    setNotice("");

    try {
      const { error: updateError } = await supabase
        .from("places")
        .update({ is_favorite: !place.is_favorite })
        .eq("id", place.id)
        .eq("user_id", place.user_id);

      if (updateError) throw updateError;

      setPlaces((current) =>
        current.map((item) =>
          item.id === place.id
            ? { ...item, is_favorite: !item.is_favorite }
            : item,
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deletePlace(place: Place) {
    if (
      !window.confirm(
        `Delete "${place.name}" and its saved menu items and visits?`,
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const { error: deleteError } = await supabase
        .from("places")
        .delete()
        .eq("id", place.id)
        .eq("user_id", place.user_id);

      if (deleteError) throw deleteError;

      setPlaces((current) =>
        current.filter((item) => item.id !== place.id),
      );
      setMenuItems((current) =>
        current.filter((item) => item.place_id !== place.id),
      );
      setVisits((current) =>
        current.filter((visit) => visit.place_id !== place.id),
      );

      if (selectedPlace === place.id) setSelectedPlace(null);
      setNotice("Place deleted.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function saveMenuItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const selectedPlaceData = places.find(
      (place) => place.id === selectedPlace,
    );

    if (!selectedPlaceData) return;

    if (!menuName.trim()) {
      setError("Please enter a menu item name.");
      return;
    }

    const parsedRating = Number(menuRating);

    try {
      const { error: insertError } = await supabase
        .from("place_menu_items")
        .insert({
          place_id: selectedPlaceData.id,
          name: menuName.trim(),
          rating: Number.isFinite(parsedRating) ? parsedRating : 0,
          notes: menuNotes.trim() || null,
          is_recommended: menuRecommended,
        });

      if (insertError) throw insertError;

      setMenuName("");
      setMenuRating("0");
      setMenuNotes("");
      setMenuRecommended(false);
      setShowMenuForm(false);
      setNotice("Menu item saved successfully.");
      await loadPlaces();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteMenuItem(menu: MenuItem) {
    if (!window.confirm(`Delete "${menu.name}"?`)) return;

    try {
      const { error: deleteError } = await supabase
        .from("place_menu_items")
        .delete()
        .eq("id", menu.id);

      if (deleteError) throw deleteError;

      setMenuItems((current) =>
        current.filter((item) => item.id !== menu.id),
      );
      setNotice("Menu item deleted.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function saveVisit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const selectedPlaceData = places.find(
      (place) => place.id === selectedPlace,
    );

    if (!selectedPlaceData) return;

    try {
      const { error: insertError } = await supabase
        .from("place_visits")
        .insert({
          place_id: selectedPlaceData.id,
          visited_at: visitDate,
          notes: visitNotes.trim() || null,
        });

      if (insertError) throw insertError;

      setVisitDate(new Date().toISOString().slice(0, 10));
      setVisitNotes("");
      setShowVisitForm(false);
      setNotice("Visit saved successfully.");
      await loadPlaces();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteVisit(visit: PlaceVisit) {
    if (!window.confirm("Delete this visit record?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("place_visits")
        .delete()
        .eq("id", visit.id);

      if (deleteError) throw deleteError;

      setVisits((current) =>
        current.filter((item) => item.id !== visit.id),
      );
      setNotice("Visit deleted.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const filteredPlaces = places.filter((place) => {
    const query = searchQuery.trim().toLowerCase();

    const matchesQuery =
      !query ||
      place.name.toLowerCase().includes(query) ||
      (place.location ?? "").toLowerCase().includes(query) ||
      (place.notes ?? "").toLowerCase().includes(query) ||
      (place.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(query),
      );

    const matchesCategory =
      categoryFilter === "All" ||
      place.category === categoryFilter;

    const matchesFavorite =
      !favoriteFilter || place.is_favorite;

    return matchesQuery && matchesCategory && matchesFavorite;
  });

  const selectedPlaceData = places.find(
    (place) => place.id === selectedPlace,
  );

  const selectedMenuItems = selectedPlaceData
    ? menuItems.filter(
        (item) => item.place_id === selectedPlaceData.id,
      )
    : [];

  const selectedVisits = selectedPlaceData
    ? visits.filter(
        (visit) => visit.place_id === selectedPlaceData.id,
      )
    : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={() => {
            resetPlaceForm();
            setShowPlaceForm(true);
            setSelectedPlace(null);
            setError("");
            setNotice("");
          }}
          className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Add Place
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      )}

      {showPlaceForm && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
          <h2 className="mb-5 text-xl font-bold">
            {editingPlaceId ? "Edit Place" : "Add a Place"}
          </h2>

          <form onSubmit={savePlace} className="space-y-5">
            <PlaceSearch onChoose={handleChooseLocation} />

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Place name *</span>
              <input
                value={placeName}
                onChange={(event) => setPlaceName(event.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                placeholder="Place name"
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Category</span>
              <select
                value={placeCategory}
                onChange={(event) => setPlaceCategory(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2 text-sm">
              <span className="font-medium">Rating</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`Rate ${value} stars`}
                    className={`text-2xl ${
                      value <= rating
                        ? "text-amber-500"
                        : "text-[var(--border)]"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Address</span>
              <input
                value={placeLocation}
                onChange={(event) => setPlaceLocation(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                placeholder="Address or location"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Latitude</span>
                <input
                  type="number"
                  step="any"
                  value={placeLatitude ?? ""}
                  onChange={(event) =>
                    setPlaceLatitude(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="font-medium">Longitude</span>
                <input
                  type="number"
                  step="any"
                  value={placeLongitude ?? ""}
                  onChange={(event) =>
                    setPlaceLongitude(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Notes</span>
              <textarea
                value={placeNotes}
                onChange={(event) => setPlaceNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                placeholder="Your notes about this place"
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Tags</span>
              <input
                value={placeTags}
                onChange={(event) => setPlaceTags(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                placeholder="study, quiet, affordable"
              />
              <span className="text-xs text-[var(--muted)]">
                Separate tags with commas.
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingPlaceId
                    ? "Save Changes"
                    : "Save Place"}
              </button>

              <button
                type="button"
                onClick={resetPlaceForm}
                className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          Loading places...
        </div>
      ) : selectedPlaceData ? (
        <section className="space-y-6">
          <button
            type="button"
            onClick={() => {
              setSelectedPlace(null);
              setShowMenuForm(false);
              setShowVisitForm(false);
              setShowPlaceForm(false);
              setError("");
              setNotice("");
            }}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
          >
            ← All Places
          </button>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-sm text-[var(--muted)]">
                  {selectedPlaceData.category || "Other"}
                </span>

                <h2 className="mt-2 break-words text-3xl font-bold">
                  {selectedPlaceData.name}
                </h2>

                {selectedPlaceData.location && (
                  <p className="mt-3 break-words text-sm text-[var(--muted)]">
                    📍 {selectedPlaceData.location}
                  </p>
                )}

                <a
                  href={getGoogleMapsUrl(selectedPlaceData)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-sm font-medium text-[var(--primary)] underline underline-offset-4"
                >
                  Open in Google Maps ↗
                </a>

                <p className="mt-3 text-sm">
                  <RatingStars rating={selectedPlaceData.rating} />
                </p>

                {selectedPlaceData.latitude !== null &&
                  selectedPlaceData.longitude !== null && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Coordinates: {selectedPlaceData.latitude.toFixed(6)},{" "}
                      {selectedPlaceData.longitude.toFixed(6)}
                    </p>
                  )}

                {selectedPlaceData.notes && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
                    {selectedPlaceData.notes}
                  </p>
                )}

                {(selectedPlaceData.tags ?? []).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(selectedPlaceData.tags ?? []).map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void toggleFavorite(selectedPlaceData)}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  {selectedPlaceData.is_favorite ? "♥ Favorite" : "♡ Favorite"}
                </button>

                <button
                  type="button"
                  onClick={() => openEditPlaceForm(selectedPlaceData)}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => void deletePlace(selectedPlaceData)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Menu Items</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Save dishes or items you want to try here.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMenuForm((value) => !value);
                  setError("");
                  setNotice("");
                }}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                {showMenuForm ? "Cancel" : "+ Add Menu"}
              </button>
            </div>

            {showMenuForm && (
              <form onSubmit={saveMenuItem} className="mt-5 space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Menu name *</span>
                  <input
                    value={menuName}
                    onChange={(event) => setMenuName(event.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Rating</span>
                  <select
                    value={menuRating}
                    onChange={(event) => setMenuRating(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  >
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value === 0 ? "Not rated" : `${value} / 5`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Notes</span>
                  <textarea
                    value={menuNotes}
                    onChange={(event) => setMenuNotes(event.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={menuRecommended}
                    onChange={(event) =>
                      setMenuRecommended(event.target.checked)
                    }
                  />
                  Recommend this menu item
                </label>

                <button
                  type="submit"
                  className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
                >
                  Save Menu Item
                </button>
              </form>
            )}

            <div className="mt-5 space-y-3">
              {selectedMenuItems.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No menu items saved yet.
                </p>
              ) : (
                selectedMenuItems.map((menu) => (
                  <article
                    key={menu.id}
                    className="rounded-xl border border-[var(--border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{menu.name}</h4>
                        {menu.rating !== null && menu.rating > 0 && (
                          <p className="mt-1 text-sm">
                            <RatingStars rating={menu.rating} />
                          </p>
                        )}
                        {menu.is_recommended && (
                          <p className="mt-2 text-xs text-amber-600">
                            ⭐ Recommended
                          </p>
                        )}
                        {menu.notes && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
                            {menu.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void deleteMenuItem(menu)}
                        className="text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Visit History</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Keep track of your visits to this place.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowVisitForm((value) => !value);
                  setError("");
                  setNotice("");
                }}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                {showVisitForm ? "Cancel" : "+ Record Visit"}
              </button>
            </div>

            {showVisitForm && (
              <form onSubmit={saveVisit} className="mt-5 space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Visit date *</span>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(event) => setVisitDate(event.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Notes</span>
                  <textarea
                    value={visitNotes}
                    onChange={(event) => setVisitNotes(event.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                    placeholder="What was your experience?"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
                >
                  Save Visit
                </button>
              </form>
            )}

            <div className="mt-5 space-y-3">
              {selectedVisits.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No visits recorded yet.
                </p>
              ) : (
                selectedVisits.map((visit) => (
                  <article
                    key={visit.id}
                    className="rounded-xl border border-[var(--border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {new Date(
                            `${visit.visited_at.slice(0, 10)}T12:00:00`,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        {visit.notes && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
                            {visit.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void deleteVisit(visit)}
                        className="text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search places..."
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFavoriteFilter((value) => !value)}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  favoriteFilter
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-[var(--border)]"
                }`}
              >
                {favoriteFilter ? "♥ Favorites" : "♡ Favorites"}
              </button>
            </div>
          </section>

          {filteredPlaces.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] p-10 text-center">
              <p className="font-medium">No places found.</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Search for a place above or add a place manually.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlaces.map((place) => {
                const menuCount = menuItems.filter(
                  (menu) => menu.place_id === place.id,
                ).length;

                const visitCount = visits.filter(
                  (visit) => visit.place_id === place.id,
                ).length;

                const recommendedItems = menuItems.filter(
                  (menu) =>
                    menu.place_id === place.id &&
                    menu.is_recommended,
                );

                return (
                  <article
                    key={place.id}
                    className="flex min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-hover)] text-xl">
                        📍
                      </div>

                      <button
                        type="button"
                        onClick={() => void toggleFavorite(place)}
                        aria-label={
                          place.is_favorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        className="rounded-lg px-2 py-1 text-xl text-amber-500"
                      >
                        {place.is_favorite ? "♥" : "♡"}
                      </button>
                    </div>

                    <h3 className="mt-4 break-words text-lg font-semibold">
                      {place.name}
                    </h3>

                    <span className="mt-2 inline-block self-start rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-xs text-[var(--muted)]">
                      {place.category || "Other"}
                    </span>

                    {place.location && (
                      <p className="mt-3 break-words text-sm text-[var(--muted)]">
                        📍 {place.location}
                      </p>
                    )}

                    <a
                      href={getGoogleMapsUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex self-start text-xs font-medium text-[var(--primary)] underline underline-offset-4"
                    >
                      Open in Google Maps ↗
                    </a>

                    <div className="mt-3 text-sm">
                      <RatingStars rating={place.rating} />
                    </div>

                    {place.notes && (
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
                        {place.notes}
                      </p>
                    )}

                    {(place.tags ?? []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(place.tags ?? []).slice(0, 3).map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            className="rounded-full bg-[var(--surface-hover)] px-2 py-1 text-xs text-[var(--muted)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {recommendedItems.length > 0 && (
                      <div className="mt-4 rounded-xl bg-[var(--surface-hover)] p-3">
                        <p className="text-xs uppercase tracking-widest text-[var(--muted)]">
                          ⭐ Recommended
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {recommendedItems
                            .slice(0, 2)
                            .map((menu) => menu.name)
                            .join(" · ")}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      <span className="rounded-full bg-[var(--surface-hover)] px-2.5 py-1">
                        🍽️ {menuCount} menu items
                      </span>
                      <span className="rounded-full bg-[var(--surface-hover)] px-2.5 py-1">
                        🗓️ {visitCount} visits
                      </span>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      <button
                        type="button"
                        onClick={() => setSelectedPlace(place.id)}
                        className="flex-1 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white"
                      >
                        View Details
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditPlaceForm(place)}
                        className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void deletePlace(place)}
                        className="rounded-xl border border-red-200 px-3 py-2.5 text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
