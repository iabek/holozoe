
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

function formatDate(date: string) {
  if (!date) return "No date";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayLocal() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function RatingStars({ rating }: { rating: number | null }) {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating ?? 0))));

  return (
    <span className="text-amber-500">
      {value > 0 ? "★".repeat(value) + "☆".repeat(5 - value) : "Not rated"}
      {value > 0 && (
        <span className="ml-2 text-[var(--muted)]">
          {Number(rating).toFixed(1)}/5
        </span>
      )}
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
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);

  const [placeName, setPlaceName] = useState("");
  const [placeCategory, setPlaceCategory] = useState("Restaurant");
  const [placeRating, setPlaceRating] = useState("0");
  const [placeLocation, setPlaceLocation] = useState("");
  const [placeLatitude, setPlaceLatitude] = useState<number | null>(null);
  const [placeLongitude, setPlaceLongitude] = useState<number | null>(null);
  const [placeNotes, setPlaceNotes] = useState("");
  const [placeTags, setPlaceTags] = useState("");

  const [menuName, setMenuName] = useState("");
  const [menuRating, setMenuRating] = useState("0");
  const [menuNotes, setMenuNotes] = useState("");
  const [menuRecommended, setMenuRecommended] = useState(false);

  const [visitDate, setVisitDate] = useState(todayLocal);
  const [visitNotes, setVisitNotes] = useState("");

  const selectedPlaceData =
    places.find((place) => place.id === selectedPlace) ?? null;

  const selectedMenuItems = menuItems.filter(
    (item) => item.place_id === selectedPlace,
  );

  const selectedVisits = visits
    .filter((visit) => visit.place_id === selectedPlace)
    .sort((a, b) => b.visited_at.localeCompare(a.visited_at));

  // Load Places first. Menu/visit failures must not hide saved places.
  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setPlaces([]);
        setMenuItems([]);
        setVisits([]);
        setSelectedPlace(null);
        setError("Please log in to manage your saved places.");
        return;
      }

      const { data: placeData, error: placesError } = await supabase
        .from("places")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (placesError) throw placesError;

      const loadedPlaces = (placeData ?? []) as Place[];
      const ownedIds = new Set(loadedPlaces.map((place) => place.id));

      setPlaces(loadedPlaces);
      setSelectedPlace((current) =>
        current && ownedIds.has(current) ? current : null,
      );

      const [menuResult, visitResult] = await Promise.all([
        supabase
          .from("place_menu_items")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("place_visits")
          .select("*")
          .order("visited_at", { ascending: false }),
      ]);

      if (menuResult.error) {
        console.error("Failed to load menu items:", menuResult.error);
        setMenuItems([]);
      } else {
        setMenuItems(
          ((menuResult.data ?? []) as MenuItem[]).filter((item) =>
            ownedIds.has(item.place_id),
          ),
        );
      }

      if (visitResult.error) {
        console.error("Failed to load visits:", visitResult.error);
        setVisits([]);
      } else {
        setVisits(
          ((visitResult.data ?? []) as PlaceVisit[]).filter((visit) =>
            ownedIds.has(visit.place_id),
          ),
        );
      }
    } catch (err) {
      console.error("Failed to load Places:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  const filteredPlaces = places.filter((place) => {
    const text = search.trim().toLowerCase();

    const matchesSearch =
      !text ||
      place.name.toLowerCase().includes(text) ||
      (place.location ?? "").toLowerCase().includes(text) ||
      (place.notes ?? "").toLowerCase().includes(text) ||
      (place.tags ?? []).some((tag) => tag.toLowerCase().includes(text));

    return (
      matchesSearch &&
      (categoryFilter === "All" || place.category === categoryFilter) &&
      (!favoritesOnly || place.is_favorite)
    );
  });

  function resetPlaceForm() {
    setPlaceName("");
    setPlaceCategory("Restaurant");
    setPlaceRating("0");
    setPlaceLocation("");
    setPlaceLatitude(null);
    setPlaceLongitude(null);
    setPlaceNotes("");
    setPlaceTags("");
    setEditingPlaceId(null);
    setShowPlaceForm(false);
  }

  function openEditPlaceForm(place: Place) {
    setEditingPlaceId(place.id);
    setPlaceName(place.name);
    setPlaceCategory(place.category || "Other");
    setPlaceRating(String(place.rating ?? 0));
    setPlaceLocation(place.location ?? "");
    setPlaceLatitude(place.latitude);
    setPlaceLongitude(place.longitude);
    setPlaceNotes(place.notes ?? "");
    setPlaceTags((place.tags ?? []).join(", "));
    setShowPlaceForm(true);
    setError("");
    setNotice("");
  }

  function handleChooseLocation(result: PlaceSearchResult) {
    setPlaceName(result.name);
    setPlaceLocation(result.address);
    setPlaceLatitude(result.latitude);
    setPlaceLongitude(result.longitude);
    setError("");
    setNotice("Location selected. Complete the form and save your place.");
  }

  async function savePlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = placeName.trim();
    const rating = Number(placeRating);

    if (!name) {
      setError("Please enter a place name.");
      return;
    }

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      setError("Rating must be between 0 and 5.");
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
        name,
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
        const { data, error: updateError } = await supabase
          .from("places")
          .update(payload)
          .eq("id", editingPlaceId)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (updateError) throw updateError;
        if (!data) throw new Error("The place update was not confirmed.");

        setPlaces((current) =>
          current.map((place) =>
            place.id === editingPlaceId ? (data as Place) : place,
          ),
        );
        setNotice("Place updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("places")
          .insert({
            ...payload,
            user_id: user.id,
            is_favorite: false,
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        if (!data) throw new Error("The place save was not confirmed.");

        setPlaces((current) => [
          data as Place,
          ...current.filter((place) => place.id !== data.id),
        ]);
        setNotice("Place saved successfully.");
      }

      resetPlaceForm();
      await loadPlaces();
    } catch (err) {
      console.error("Failed to save place:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(place: Place) {
    setError("");
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("places")
        .update({ is_favorite: !place.is_favorite })
        .eq("id", place.id)
        .eq("user_id", place.user_id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setPlaces((current) =>
        current.map((item) =>
          item.id === place.id ? (data as Place) : item,
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
      const { data, error: deleteError } = await supabase
        .from("places")
        .delete()
        .eq("id", place.id)
        .eq("user_id", place.user_id)
        .select("id");

      if (deleteError) throw deleteError;
      if (!data?.length) {
        throw new Error(
          "Place was not deleted. Check your account and database permissions.",
        );
      }

      setPlaces((current) => current.filter((item) => item.id !== place.id));
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

    if (!selectedPlaceData) return;

    if (!menuName.trim()) {
      setError("Please enter a menu item name.");
      return;
    }

    const rating = Number(menuRating);

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      setError("Menu rating must be between 0 and 5.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from("place_menu_items")
        .insert({
          place_id: selectedPlaceData.id,
          name: menuName.trim(),
          rating,
          notes: menuNotes.trim() || null,
          is_recommended: menuRecommended,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      setMenuItems((current) => [data as MenuItem, ...current]);
      setMenuName("");
      setMenuRating("0");
      setMenuNotes("");
      setMenuRecommended(false);
      setShowMenuForm(false);
      setNotice("Menu item saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleMenuRecommendation(item: MenuItem) {
    setError("");

    try {
      const { data, error: updateError } = await supabase
        .from("place_menu_items")
        .update({ is_recommended: !item.is_recommended })
        .eq("id", item.id)
        .eq("place_id", item.place_id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setMenuItems((current) =>
        current.map((menu) =>
          menu.id === item.id ? (data as MenuItem) : menu,
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteMenuItem(item: MenuItem) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;

    setError("");

    try {
      const { data, error: deleteError } = await supabase
        .from("place_menu_items")
        .delete()
        .eq("id", item.id)
        .eq("place_id", item.place_id)
        .select("id");

      if (deleteError) throw deleteError;
      if (!data?.length) throw new Error("Menu item was not deleted.");

      setMenuItems((current) =>
        current.filter((menu) => menu.id !== item.id),
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

    if (!selectedPlaceData) return;

    if (!visitDate) {
      setError("Please select a visit date.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from("place_visits")
        .insert({
          place_id: selectedPlaceData.id,
          visited_at: visitDate,
          notes: visitNotes.trim() || null,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      setVisits((current) => [data as PlaceVisit, ...current]);
      setVisitDate(todayLocal());
      setVisitNotes("");
      setShowVisitForm(false);
      setNotice("Visit added to your history.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteVisit(visit: PlaceVisit) {
    if (!window.confirm("Delete this visit record?")) return;

    setError("");

    try {
      const { data, error: deleteError } = await supabase
        .from("place_visits")
        .delete()
        .eq("id", visit.id)
        .eq("place_id", visit.place_id)
        .select("id");

      if (deleteError) throw deleteError;
      if (!data?.length) throw new Error("Visit record was not deleted.");

      setVisits((current) =>
        current.filter((item) => item.id !== visit.id),
      );
      setNotice("Visit record deleted.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const averageRating =
    places.length > 0
      ? (
          places.reduce(
            (sum, place) => sum + Number(place.rating ?? 0),
            0,
          ) / places.length
        ).toFixed(1)
      : "0.0";
return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-12 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] transition hover:bg-[var(--surface-hover)]"
            aria-label="Back to Archive"
            title="Back to Archive"
          >
            ←
          </button>
          <div>
            <p className="text-sm text-[var(--muted)]">Archive / Places</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Places</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
              Keep track of places you love, meals you want to remember, and
              experiences from your visits.
            </p>
          </div>
        </div>

        {!selectedPlaceData && (
          <button
            type="button"
            onClick={() => {
              if (showPlaceForm) {
                resetPlaceForm();
              } else {
                resetPlaceForm();
                setShowPlaceForm(true);
              }
            }}
            className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {showPlaceForm ? "Cancel" : "+ Add Place"}
          </button>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="break-words rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="break-words rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      {showPlaceForm && !selectedPlaceData && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-lg font-semibold">
            {editingPlaceId ? "Edit Place" : "Add a New Place"}
          </h2>

          <form onSubmit={savePlace} className="mt-4 space-y-4">
            <PlaceSearch onChoose={handleChooseLocation} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Place name *</span>
                <input
                  required
                  maxLength={120}
                  value={placeName}
                  onChange={(event) => setPlaceName(event.target.value)}
                  placeholder="e.g. Kopi Senja"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Category</span>
                <select
                  value={placeCategory}
                  onChange={(event) => setPlaceCategory(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Rating (0–5)</span>
                <select
                  value={placeRating}
                  onChange={(event) => setPlaceRating(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3"
                >
                  {[0, 1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating === 0 ? "Not rated" : `${rating}/5`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Location / address</span>
                <input
                  value={placeLocation}
                  onChange={(event) => setPlaceLocation(event.target.value)}
                  placeholder="City, address, or area"
                  maxLength={300}
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                />
                {placeLatitude !== null && placeLongitude !== null && (
                  <span className="block text-xs text-[var(--muted)]">
                    Coordinates: {placeLatitude.toFixed(6)},{" "}
                    {placeLongitude.toFixed(6)}
                  </span>
                )}
              </label>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Tags</span>
              <input
                value={placeTags}
                onChange={(event) => setPlaceTags(event.target.value)}
                placeholder="cozy, affordable, date spot"
                className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
              />
              <span className="text-xs text-[var(--muted)]">
                Separate tags with commas.
              </span>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Notes</span>
              <textarea
                value={placeNotes}
                onChange={(event) => setPlaceNotes(event.target.value)}
                placeholder="What do you want to remember about this place?"
                rows={3}
                maxLength={5000}
                className="w-full resize-y rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
              />
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

      {!selectedPlaceData && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Saved Places", value: places.length, icon: "📍" },
              {
                label: "Favorites",
                value: places.filter((place) => place.is_favorite).length,
                icon: "♥",
              },
              {
                label: "Places Visited",
                value: new Set(visits.map((visit) => visit.place_id)).size,
                icon: "🗺️",
              },
              { label: "Average Rating", value: averageRating, icon: "★" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--muted)]">
                    {stat.label}
                  </span>
                  <span>{stat.icon}</span>
                </div>
                <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search places, locations, tags..."
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-transparent px-4 py-3"
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
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
                onClick={() => setFavoritesOnly((current) => !current)}
                aria-pressed={favoritesOnly}
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  favoritesOnly
                    ? "border-pink-400 bg-pink-50 text-pink-700"
                    : "border-[var(--border)]"
                }`}
              >
                ♥ Favorites
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-[var(--border)] p-12 text-center text-sm text-[var(--muted)]">
                Loading your places...
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
                <div className="text-4xl">📍</div>
                <h2 className="mt-4 text-lg font-semibold">
                  {places.length === 0
                    ? "Your places collection starts here"
                    : "No places found"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
                  {places.length === 0
                    ? "Search for a place above or add a place manually."
                    : "Try another search or change your filters."}
                </p>
                {places.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPlaceForm(true)}
                    className="mt-5 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
                  >
                    + Save Your First Place
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPlaces.map((place) => {
                  const visitCount = visits.filter(
                    (visit) => visit.place_id === place.id,
                  ).length;
                  const menuCount = menuItems.filter(
                    (item) => item.place_id === place.id,
                  ).length;

                  return (
                    <article
                      key={place.id}
                      className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPlace(place.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="text-xs font-medium text-[var(--muted)]">
                            {place.category || "Other"}
                          </span>
                          <h2 className="mt-1 break-words text-xl font-semibold">
                            {place.name}
                          </h2>
                        </button>

                        <button
                          type="button"
                          onClick={() => void toggleFavorite(place)}
                          aria-label={
                            place.is_favorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          className={`shrink-0 rounded-lg border px-3 py-2 ${
                            place.is_favorite
                              ? "border-pink-300 bg-pink-50 text-pink-600"
                              : "border-[var(--border)]"
                          }`}
                        >
                          {place.is_favorite ? "♥" : "♡"}
                        </button>
                      </div>

                      <p className="mt-3 text-sm">
                        <RatingStars rating={place.rating} />
                      </p>

                      {place.location && (
                        <p className="mt-3 break-words text-sm text-[var(--muted)]">
                          📍 {place.location}
                        </p>
                      )}

                      {place.notes && (
                        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm">
                          {place.notes}
                        </p>
                      )}

                      {(place.tags ?? []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(place.tags ?? []).map((tag, index) => (
                            <span
                              key={`${tag}-${index}`}
                              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]"
                            >
                              #{tag}
                            </span>
                          ))}
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
          </section>
        </>
      )}

      {selectedPlaceData && (
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
              </div>

              <button
                type="button"
                onClick={() => void toggleFavorite(selectedPlaceData)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  selectedPlaceData.is_favorite
                    ? "border-pink-300 bg-pink-50 text-pink-700"
                    : "border-[var(--border)]"
                }`}
              >
                {selectedPlaceData.is_favorite
                  ? "♥ In Favorites"
                  : "♡ Add to Favorites"}
              </button>
            </div>

            {selectedPlaceData.notes && (
              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <h3 className="font-semibold">Notes & Memories</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
                  {selectedPlaceData.notes}
                </p>
              </div>
            )}

            {(selectedPlaceData.tags ?? []).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {(selectedPlaceData.tags ?? []).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openEditPlaceForm(selectedPlaceData)}
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
              >
                Edit Place
              </button>
              <button
                type="button"
                onClick={() => setShowMenuForm((current) => !current)}
                className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white"
              >
                {showMenuForm ? "Cancel Menu" : "+ Add Menu Item"}
              </button>
              <button
                type="button"
                onClick={() => setShowVisitForm((current) => !current)}
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
              >
                {showVisitForm ? "Cancel Visit" : "+ Record Visit"}
              </button>
            </div>
          </div>

          {showPlaceForm && editingPlaceId === selectedPlaceData.id && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="text-lg font-semibold">Edit Place</h3>
              <form onSubmit={savePlace} className="mt-4 space-y-4">
                <PlaceSearch onChoose={handleChooseLocation} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Place name *</span>
                    <input
                      required
                      maxLength={120}
                      value={placeName}
                      onChange={(event) => setPlaceName(event.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Category</span>
                    <select
                      value={placeCategory}
                      onChange={(event) => setPlaceCategory(event.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Rating (0–5)</span>
                    <select
                      value={placeRating}
                      onChange={(event) => setPlaceRating(event.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3"
                    >
                      {[0, 1, 2, 3, 4, 5].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating === 0 ? "Not rated" : `${rating}/5`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Location / address</span>
                    <input
                      value={placeLocation}
                      onChange={(event) => setPlaceLocation(event.target.value)}
                      maxLength={300}
                      className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                    />
                    {placeLatitude !== null && placeLongitude !== null && (
                      <span className="block text-xs text-[var(--muted)]">
                        Coordinates: {placeLatitude.toFixed(6)},{" "}
                        {placeLongitude.toFixed(6)}
                      </span>
                    )}
                  </label>
                </div>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Tags</span>
                  <input
                    value={placeTags}
                    onChange={(event) => setPlaceTags(event.target.value)}
                    placeholder="cozy, affordable, date spot"
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Notes</span>
                  <textarea
                    value={placeNotes}
                    onChange={(event) => setPlaceNotes(event.target.value)}
                    rows={4}
                    maxLength={5000}
                    className="w-full resize-y rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
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

          {showMenuForm && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="text-lg font-semibold">Add Menu Item</h3>
              <form onSubmit={saveMenuItem} className="mt-4 space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Menu item name *</span>
                  <input
                    required
                    maxLength={150}
                    value={menuName}
                    onChange={(event) => setMenuName(event.target.value)}
                    placeholder="e.g. Iced Matcha Latte"
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Rating (0–5)</span>
                  <select
                    value={menuRating}
                    onChange={(event) => setMenuRating(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3"
                  >
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating === 0 ? "Not rated" : `${rating}/5`}
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
                    maxLength={2000}
                    placeholder="Taste, price, portion, or other details"
                    className="w-full resize-y rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={menuRecommended}
                    onChange={(event) =>
                      setMenuRecommended(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Mark as recommended
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Menu Item"}
                </button>
              </form>
            </section>
          )}

          {showVisitForm && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="text-lg font-semibold">Record a Visit</h3>
              <form onSubmit={saveVisit} className="mt-4 space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Visit date *</span>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(event) => setVisitDate(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Visit notes</span>
                  <textarea
                    value={visitNotes}
                    onChange={(event) => setVisitNotes(event.target.value)}
                    rows={3}
                    maxLength={3000}
                    placeholder="Who were you with? What happened? How did it feel?"
                    className="w-full resize-y rounded-xl border border-[var(--border)] bg-transparent px-3 py-3"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Visit"}
                </button>
              </form>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Menu & Recommendations
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Foods and drinks you want to remember.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs">
                  {selectedMenuItems.length} items
                </span>
              </div>

              {selectedMenuItems.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                  No menu items saved yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedMenuItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-[var(--border)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words font-medium">
                            {item.name}
                            {item.is_recommended && (
                              <span className="ml-2 text-amber-500">★</span>
                            )}
                          </h4>
                          <p className="mt-1 text-sm">
                            <RatingStars rating={item.rating} />
                          </p>
                          {item.notes && (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void toggleMenuRecommendation(item)
                            }
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"
                          >
                            {item.is_recommended ? "Unrecommend" : "Recommend"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteMenuItem(item)}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Visit History</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    The dates and memories of your visits.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs">
                  {selectedVisits.length} visits
                </span>
              </div>

              {selectedVisits.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                  No visits recorded yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedVisits.map((visit) => (
                    <article
                      key={visit.id}
                      className="rounded-xl border border-[var(--border)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-medium">
                            {formatDate(visit.visited_at)}
                          </h4>
                          {visit.notes && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                              {visit.notes}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void deleteVisit(visit)}
                          className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </main>
  );
}
