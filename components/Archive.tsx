"use client";

import { useState } from "react";
import PlaceSearch from "@/components/PlaceSearch";
import type { PlaceSearchResult } from "@/components/PlacesMap";

type ArchiveFolder = {
  icon: string;
  name: string;
  description: string;
};

type ArchiveProps = {
  onNavigate: (page: string) => void;
};

type MenuItem = {
  id: string;
  name: string;
  rating: number;
  notes: string;
  recommended: boolean;
};

type PlaceVisit = {
  id: string;
  date: string;
  notes: string;
};

type SavedPlace = {
  id: string;
  name: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  notes: string;
  tags: string[];
  favorite: boolean;
  menus: MenuItem[];
  visits: PlaceVisit[];
};

const folders: ArchiveFolder[] = [
  {
    icon: "👥",
    name: "People",
    description: "People who became part of your story.",
  },
  {
    icon: "📸",
    name: "Memories",
    description: "Moments worth keeping.",
  },
  {
    icon: "🎬",
    name: "Movies & Series",
    description: "Films and series you want to remember.",
  },
  {
    icon: "📚",
    name: "Books",
    description: "Books, quotes, and things you've read.",
  },
  {
    icon: "🎵",
    name: "Music",
    description: "Songs, albums, and memories attached to them.",
  },
  {
    icon: "📍",
    name: "Places",
    description:
      "Places you've visited and experiences you want to remember.",
  },
];

const inputClass =
  "w-full rounded-xl border border-[#d8cec0] bg-white/80 px-3 py-2.5 text-sm text-[#3f382f] outline-none placeholder:text-[#aaa092] focus:border-[#9c8973]";

const labelClass = "mb-1.5 block text-sm font-medium text-[#5f5346]";

export default function Archive({ onNavigate }: ArchiveProps) {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const [places, setPlaces] = useState<SavedPlace[]>([]);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    null
  );

  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [placeName, setPlaceName] = useState("");
  const [placeCategory, setPlaceCategory] = useState("Restaurant");
  const [placeLocation, setPlaceLocation] = useState("");
  const [placeLatitude, setPlaceLatitude] = useState<number | null>(null);
  const [placeLongitude, setPlaceLongitude] = useState<number | null>(null);
  const [placeRating, setPlaceRating] = useState("5");
  const [placeNotes, setPlaceNotes] = useState("");
  const [placeTags, setPlaceTags] = useState("");

  const [menuName, setMenuName] = useState("");
  const [menuRating, setMenuRating] = useState("5");
  const [menuNotes, setMenuNotes] = useState("");
  const [menuRecommended, setMenuRecommended] = useState(true);

  const [visitDate, setVisitDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [visitNotes, setVisitNotes] = useState("");

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ?? null;

  const categories = [
    "Restaurant",
    "Cafe",
    "Nature",
    "Tourist Attraction",
    "Shopping",
    "Accommodation",
    "Study Spot",
    "Other",
  ];

  const filteredPlaces = places.filter((place) => {
    const matchesSearch = [
      place.name,
      place.location,
      place.category,
      place.notes,
      ...place.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    return (
      matchesSearch &&
      (categoryFilter === "All" || place.category === categoryFilter) &&
      (!favoritesOnly || place.favorite)
    );
  });

  function handleFolderClick(name: string) {
    if (name === "People") {
      onNavigate("People");
      return;
    }

    if (name === "Places") {
      setSelectedPlaceId(null);
      setActiveFolder("Places");
      return;
    }

    setActiveFolder(name);
  }

  function handleChooseLocation(result: PlaceSearchResult) {
    setPlaceName(result.name);
    setPlaceLocation(result.address);
    setPlaceLatitude(result.latitude);
    setPlaceLongitude(result.longitude);
  }

  function resetPlaceForm() {
    setPlaceName("");
    setPlaceCategory("Restaurant");
    setPlaceLocation("");
    setPlaceLatitude(null);
    setPlaceLongitude(null);
    setPlaceRating("5");
    setPlaceNotes("");
    setPlaceTags("");
  }

  function addPlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!placeName.trim()) return;

    const place: SavedPlace = {
      id: crypto.randomUUID(),
      name: placeName.trim(),
      category: placeCategory,
      location: placeLocation.trim(),
      latitude: placeLatitude,
      longitude: placeLongitude,
      rating: Number(placeRating),
      notes: placeNotes.trim(),
      tags: placeTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      favorite: false,
      menus: [],
      visits: [],
    };

    setPlaces((current) => [place, ...current]);
    setSelectedPlaceId(place.id);
    setShowPlaceForm(false);
    resetPlaceForm();
  }

  function addMenuItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlace || !menuName.trim()) return;

    setPlaces((current) =>
      current.map((place) =>
        place.id === selectedPlace.id
          ? {
              ...place,
              menus: [
                {
                  id: crypto.randomUUID(),
                  name: menuName.trim(),
                  rating: Number(menuRating),
                  notes: menuNotes.trim(),
                  recommended: menuRecommended,
                },
                ...place.menus,
              ],
            }
          : place
      )
    );

    setMenuName("");
    setMenuRating("5");
    setMenuNotes("");
    setMenuRecommended(true);
    setShowMenuForm(false);
  }

  function addVisit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlace || !visitDate) return;

    setPlaces((current) =>
      current.map((place) =>
        place.id === selectedPlace.id
          ? {
              ...place,
              visits: [
                {
                  id: crypto.randomUUID(),
                  date: visitDate,
                  notes: visitNotes.trim(),
                },
                ...place.visits,
              ],
            }
          : place
      )
    );

    setVisitNotes("");
    setShowVisitForm(false);
  }

  function updateFavorite(placeId: string) {
    setPlaces((current) =>
      current.map((place) =>
        place.id === placeId
          ? { ...place, favorite: !place.favorite }
          : place
      )
    );
  }

  function deletePlace(placeId: string) {
    const place = places.find((item) => item.id === placeId);

    if (!place) return;

    if (window.confirm(`Delete ${place.name}?`)) {
      setPlaces((current) =>
        current.filter((item) => item.id !== placeId)
      );
      setSelectedPlaceId(null);
      setShowMenuForm(false);
      setShowVisitForm(false);
    }
  }

  function deleteMenu(menuId: string) {
    if (!selectedPlace) return;

    setPlaces((current) =>
      current.map((place) =>
        place.id === selectedPlace.id
          ? {
              ...place,
              menus: place.menus.filter((menu) => menu.id !== menuId),
            }
          : place
      )
    );
  }

  function deleteVisit(visitId: string) {
    if (!selectedPlace) return;

    setPlaces((current) =>
      current.map((place) =>
        place.id === selectedPlace.id
          ? {
              ...place,
              visits: place.visits.filter((visit) => visit.id !== visitId),
            }
          : place
      )
    );
  }

  function renderStars(rating: number) {
    return (
      <span className="tracking-wide text-[#b18a4d]">
        {"★".repeat(rating)}
        <span className="text-[#d8cec0]">
          {"★".repeat(5 - rating)}
        </span>
      </span>
    );
  }

  function formatDate(date: string) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getMapUrl(place: SavedPlace) {
    if (place.latitude !== null && place.longitude !== null) {
      return `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
    }

    if (place.location) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name} ${place.location}`
      )}`;
    }

    return null;
  }

  return (
    <section>
      {activeFolder === null ? (
        <>
          <div className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              Archive
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#3f382f]">
              Things worth keeping.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746a5e]">
              A place for the people, memories, and pieces of your life that
              you want to keep with you.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <button
                key={folder.name}
                type="button"
                onClick={() => handleFolderClick(folder.name)}
                className="group rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f2ece3]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ebe3d8] text-2xl">
                    {folder.icon}
                  </div>

                  <span className="text-sm text-[#b0a496] transition group-hover:translate-x-0.5">
                    →
                  </span>
                </div>

                <h3 className="mt-5 font-semibold text-[#3f382f]">
                  {folder.name}
                </h3>

                <p className="mt-1 text-sm leading-5 text-[#746a5e]">
                  {folder.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-[#d8cec0] bg-[#eee7dc] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
              More to come
            </p>

            <p className="mt-2 text-sm leading-6 text-[#746a5e]">
              Your archive can grow as your life grows. New folders can be
              added whenever they become meaningful.
            </p>
          </div>
        </>
      ) : activeFolder === "Places" ? (
        <>
          <div className="rounded-2xl bg-[#f7f2ea] p-5 shadow-sm sm:p-8">
            <button
              type="button"
              onClick={() => {
                setActiveFolder(null);
                setSelectedPlaceId(null);
              }}
              className="mb-5 text-sm text-[#817362] hover:text-[#3f382f]"
            >
              ← Back to Archive
            </button>

            {selectedPlace ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
                      Archive / Places
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-[#3f382f]">
                      {selectedPlace.name}
                    </h2>

                    <p className="mt-2 text-sm text-[#746a5e]">
                      {selectedPlace.category}
                      {selectedPlace.location
                        ? ` · ${selectedPlace.location}`
                        : ""}
                    </p>

                    <div className="mt-2">
                      {renderStars(selectedPlace.rating)}
                    </div>

                    {getMapUrl(selectedPlace) && (
                      <a
                        href={getMapUrl(selectedPlace)!}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm text-[#8f806d] underline underline-offset-4 hover:text-[#5f5346]"
                      >
                        📍 Open in Google Maps
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateFavorite(selectedPlace.id)}
                      className="rounded-xl border border-[#d8cec0] px-3 py-2 text-sm hover:bg-[#eee7dc]"
                    >
                      {selectedPlace.favorite ? "♥ Saved" : "♡ Favorite"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePlace(selectedPlace.id)}
                      className="rounded-xl border border-[#d8cec0] px-3 py-2 text-sm text-[#9b5f54] hover:bg-[#f3e5e0]"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selectedPlace.notes && (
                  <div className="mt-5 rounded-xl bg-white/60 p-4">
                    <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
                      Experience notes
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f5346]">
                      {selectedPlace.notes}
                    </p>
                  </div>
                )}

                {selectedPlace.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedPlace.tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-full bg-[#ebe3d8] px-3 py-1 text-xs text-[#746a5e]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-[#3f382f]">
                      Menu & Recommendations
                    </h3>

                    <button
                      type="button"
                      onClick={() => setShowMenuForm(!showMenuForm)}
                      className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm hover:bg-[#d1c5b5]"
                    >
                      {showMenuForm ? "Cancel" : "+ Add menu"}
                    </button>
                  </div>

                  {showMenuForm && (
                    <form
                      onSubmit={addMenuItem}
                      className="mt-4 space-y-4 rounded-xl border border-[#d8cec0] bg-white/60 p-4"
                    >
                      <div>
                        <label className={labelClass}>Menu name *</label>
                        <input
                          required
                          value={menuName}
                          onChange={(event) => setMenuName(event.target.value)}
                          className={inputClass}
                          placeholder="e.g. Matcha Latte"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Rating</label>
                        <select
                          value={menuRating}
                          onChange={(event) => setMenuRating(event.target.value)}
                          className={inputClass}
                        >
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} / 5
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Notes</label>
                        <textarea
                          value={menuNotes}
                          onChange={(event) => setMenuNotes(event.target.value)}
                          className={inputClass}
                          rows={2}
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm text-[#5f5346]">
                        <input
                          type="checkbox"
                          checked={menuRecommended}
                          onChange={(event) =>
                            setMenuRecommended(event.target.checked)
                          }
                          className="accent-[#8f806d]"
                        />
                        Mark as recommended
                      </label>

                      <button
                        type="submit"
                        className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm text-white hover:bg-[#776956]"
                      >
                        Save menu
                      </button>
                    </form>
                  )}

                  <div className="mt-4 space-y-3">
                    {selectedPlace.menus.length === 0 ? (
                      <p className="rounded-xl bg-white/50 p-4 text-sm text-[#8a7e70]">
                        No menu items yet.
                      </p>
                    ) : (
                      selectedPlace.menus.map((menu) => (
                        <div
                          key={menu.id}
                          className="rounded-xl bg-white/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-[#3f382f]">
                                {menu.name}
                                {menu.recommended ? " ⭐" : ""}
                              </p>

                              <div className="mt-1">
                                {renderStars(menu.rating)}
                              </div>

                              {menu.notes && (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-[#746a5e]">
                                  {menu.notes}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteMenu(menu.id)}
                              className="text-xs text-[#9b5f54] hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-[#3f382f]">
                        Visit History
                      </h3>

                      <p className="mt-1 text-sm text-[#746a5e]">
                        {selectedPlace.visits.length} visits recorded
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowVisitForm(!showVisitForm)}
                      className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm hover:bg-[#d1c5b5]"
                    >
                      {showVisitForm ? "Cancel" : "+ Record visit"}
                    </button>
                  </div>

                  {showVisitForm && (
                    <form
                      onSubmit={addVisit}
                      className="mt-4 space-y-4 rounded-xl border border-[#d8cec0] bg-white/60 p-4"
                    >
                      <div>
                        <label className={labelClass}>Visit date *</label>
                        <input
                          required
                          type="date"
                          value={visitDate}
                          onChange={(event) => setVisitDate(event.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Experience</label>
                        <textarea
                          value={visitNotes}
                          onChange={(event) => setVisitNotes(event.target.value)}
                          className={inputClass}
                          rows={3}
                          placeholder="What happened during this visit?"
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-[#8f806d] px-4 py-2 text-sm text-white hover:bg-[#776956]"
                      >
                        Save visit
                      </button>
                    </form>
                  )}

                  <div className="mt-4 space-y-3">
                    {selectedPlace.visits.length === 0 ? (
                      <p className="rounded-xl bg-white/50 p-4 text-sm text-[#8a7e70]">
                        No visits recorded yet.
                      </p>
                    ) : (
                      selectedPlace.visits.map((visit) => (
                        <div
                          key={visit.id}
                          className="rounded-xl bg-white/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-[#3f382f]">
                              {formatDate(visit.date)}
                            </p>

                            <button
                              type="button"
                              onClick={() => deleteVisit(visit.id)}
                              className="text-xs text-[#9b5f54] hover:underline"
                            >
                              Delete
                            </button>
                          </div>

                          {visit.notes && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#746a5e]">
                              {visit.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
                  Archive / Places
                </p>

                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#3f382f] sm:text-3xl">
                      Places I've Been.
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#746a5e]">
                      Keep your favorite places, remember the experience, and
                      never forget what you loved there.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPlaceForm(!showPlaceForm)}
                    className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm text-white hover:bg-[#776956]"
                  >
                    {showPlaceForm ? "Cancel" : "+ Add a place"}
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#eee7dc] p-4">
                    <p className="text-xs text-[#8a7e70]">Places saved</p>
                    <p className="mt-1 text-2xl font-bold text-[#3f382f]">
                      {places.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#eee7dc] p-4">
                    <p className="text-xs text-[#8a7e70]">Favorites</p>
                    <p className="mt-1 text-2xl font-bold text-[#3f382f]">
                      {places.filter((place) => place.favorite).length}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl bg-[#eee7dc] p-4 sm:col-span-1">
                    <p className="text-xs text-[#8a7e70]">Visits recorded</p>
                    <p className="mt-1 text-2xl font-bold text-[#3f382f]">
                      {places.reduce(
                        (total, place) => total + place.visits.length,
                        0
                      )}
                    </p>
                  </div>
                </div>

                {showPlaceForm && (
                  <form
                    onSubmit={addPlace}
                    className="mt-5 space-y-4 rounded-2xl border border-[#d8cec0] bg-white/60 p-4 sm:p-5"
                  >
                    <h3 className="text-lg font-semibold text-[#3f382f]">
                      Add a new place
                    </h3>

                    {/* LOCATION SEARCH */}
                    <div>
                      <label className={labelClass}>
                        Search for a place
                      </label>

                      <p className="mb-3 text-xs leading-5 text-[#8a7e70]">
                        Search for a real place, then select a result to
                        automatically fill in its name and location.
                      </p>

                      <PlaceSearch onChoose={handleChooseLocation} />

                      {placeLatitude !== null &&
                        placeLongitude !== null && (
                          <p className="mt-2 text-xs text-[#6c8063]">
                            ✓ Location selected · Coordinates saved
                          </p>
                        )}
                    </div>

                    <div>
                      <label className={labelClass}>Place name *</label>
                      <input
                        required
                        value={placeName}
                        onChange={(event) => setPlaceName(event.target.value)}
                        className={inputClass}
                        placeholder="e.g. Kopi Toko Djawa"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Category</label>
                        <select
                          value={placeCategory}
                          onChange={(event) =>
                            setPlaceCategory(event.target.value)
                          }
                          className={inputClass}
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Rating</label>
                        <select
                          value={placeRating}
                          onChange={(event) =>
                            setPlaceRating(event.target.value)
                          }
                          className={inputClass}
                        >
                          {[5, 4, 3, 2, 1, 0].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating === 0 ? "Not rated" : `${rating} / 5`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Location</label>
                      <input
                        value={placeLocation}
                        onChange={(event) => {
                          setPlaceLocation(event.target.value);
                          setPlaceLatitude(null);
                          setPlaceLongitude(null);
                        }}
                        className={inputClass}
                        placeholder="City, address, or area"
                      />
                      <p className="mt-1 text-xs text-[#8a7e70]">
                        You can edit the address manually if needed.
                      </p>
                    </div>

                    <div>
                      <label className={labelClass}>Experience notes</label>
                      <textarea
                        value={placeNotes}
                        onChange={(event) => setPlaceNotes(event.target.value)}
                        className={inputClass}
                        rows={3}
                        placeholder="What makes this place special?"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Tags</label>
                      <input
                        value={placeTags}
                        onChange={(event) => setPlaceTags(event.target.value)}
                        className={inputClass}
                        placeholder="cozy, date spot, affordable"
                      />
                      <p className="mt-1 text-xs text-[#8a7e70]">
                        Separate tags with commas.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm text-white hover:bg-[#776956]"
                    >
                      Save place
                    </button>
                  </form>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search places, tags, or notes..."
                    className={inputClass}
                  />

                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="All">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="mt-3 inline-flex items-center gap-2 text-sm text-[#746a5e]">
                  <input
                    type="checkbox"
                    checked={favoritesOnly}
                    onChange={(event) =>
                      setFavoritesOnly(event.target.checked)
                    }
                    className="accent-[#8f806d]"
                  />
                  Show favorites only
                </label>

                <div className="mt-5">
                  {filteredPlaces.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#d8cec0] bg-white/40 px-5 py-12 text-center">
                      <div className="text-4xl">📍</div>

                      <h3 className="mt-3 font-semibold text-[#3f382f]">
                        {places.length === 0
                          ? "Your Places archive starts here."
                          : "No places found."}
                      </h3>

                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746a5e]">
                        {places.length === 0
                          ? "Save places you've visited, record your experience, and keep your favorite menu items."
                          : "Try another search or change your filters."}
                      </p>

                      {places.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPlaceForm(true)}
                          className="mt-5 rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm text-white hover:bg-[#776956]"
                        >
                          + Add your first place
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredPlaces.map((place) => (
                        <article
                          key={place.id}
                          className="flex min-w-0 flex-col rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f2ece3]"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ebe3d8] text-xl">
                              📍
                            </div>

                            <button
                              type="button"
                              onClick={() => updateFavorite(place.id)}
                              className="rounded-lg px-2 py-1 text-xl text-[#a78a67] hover:bg-[#ebe3d8]"
                              aria-label="Toggle favorite"
                            >
                              {place.favorite ? "♥" : "♡"}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedPlaceId(place.id)}
                            className="mt-4 text-left"
                          >
                            <h3 className="break-words font-semibold text-[#3f382f]">
                              {place.name}
                            </h3>

                            <span className="mt-2 inline-block rounded-full bg-[#ebe3d8] px-2.5 py-1 text-xs text-[#746a5e]">
                              {place.category}
                            </span>
                          </button>

                          {place.location && (
                            <p className="mt-3 break-words text-sm text-[#746a5e]">
                              📌 {place.location}
                            </p>
                          )}

                          {getMapUrl(place) && (
                            <a
                              href={getMapUrl(place)!}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-xs text-[#8f806d] underline underline-offset-4 hover:text-[#5f5346]"
                            >
                              Open in Google Maps ↗
                            </a>
                          )}

                          <div className="mt-3 text-sm">
                            {renderStars(place.rating)}
                          </div>

                          {place.notes && (
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-5 text-[#746a5e]">
                              {place.notes}
                            </p>
                          )}

                          {place.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {place.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={`${tag}-${index}`}
                                  className="rounded-full bg-white/70 px-2 py-1 text-xs text-[#817362]"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {place.menus.some((menu) => menu.recommended) && (
                            <div className="mt-4 rounded-xl bg-[#eee7dc] p-3">
                              <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
                                ⭐ Recommended
                              </p>

                              <p className="mt-1 text-sm font-medium text-[#5f5346]">
                                {place.menus
                                  .filter((menu) => menu.recommended)
                                  .map((menu) => menu.name)
                                  .slice(0, 2)
                                  .join(" · ")}
                              </p>
                            </div>
                          )}

                          <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#d8cec0] pt-4">
                            <span className="text-xs text-[#8a7e70]">
                              {place.visits.length}{" "}
                              {place.visits.length === 1 ? "visit" : "visits"}
                            </span>

                            <button
                              type="button"
                              onClick={() => setSelectedPlaceId(place.id)}
                              className="rounded-xl bg-[#ddd4c7] px-3 py-2 text-sm font-medium text-[#3f382f] hover:bg-[#d1c5b5]"
                            >
                              View details →
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            className="mb-5 text-sm text-[#817362] hover:text-[#3f382f]"
          >
            ← Back to Archive
          </button>

          <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
            Archive / {activeFolder}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-[#3f382f]">
            {activeFolder}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#746a5e]">
            This collection is ready for its next feature.
          </p>
        </div>
      )}
    </section>
  );
}