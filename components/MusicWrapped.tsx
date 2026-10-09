"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

type MusicEntry = {
  id: string;
  user_id: string;
  track_name: string;
  artist_name: string;
  album_name: string | null;
  track_id: string | null;
  track_uri: string | null;
  played_at: string;
  duration_ms: number | null;
  source: "spotify" | "manual" | "import";
};

type Period = "week" | "month" | "year";

type SpotifyHistoryItem = {
  trackName?: string;
  master_metadata_track_name?: string | null;
  artistName?: string;
  master_metadata_album_artist_name?: string | null;
  albumName?: string | null;
  master_metadata_album_album_name?: string | null;
  endTime?: string;
  ts?: string;
  msPlayed?: number;
  ms_played?: number;
  spotify_track_uri?: string | null;
};

const COLORS = {
  background: "#f7f2ea",
  card: "#fffdf8",
  border: "#e5dacb",
  text: "#3f382f",
  muted: "#8a7e70",
  accent: "#92775d",
  accentLight: "#e8ddce",
  green: "#71866a",
  pink: "#d8a8a0",
};

function getPeriodStart(period: Period) {
  const now = new Date();
  const start = new Date(now);

  if (period === "week") {
    const day = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  }

  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return start;
}

function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} mnt`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getTopItems(
  entries: MusicEntry[],
  getName: (entry: MusicEntry) => string
) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const name = getName(entry).trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function parseSpotifyHistory(data: unknown): SpotifyHistoryItem[] {
  if (!Array.isArray(data)) {
    throw new Error("Format file tidak dikenali. Gunakan file riwayat Spotify.");
  }

  return data.filter(
    (item): item is SpotifyHistoryItem =>
      typeof item === "object" && item !== null
  );
}

export default function MusicWrapped() {
  const [entries, setEntries] = useState<MusicEntry[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [playedAt, setPlayedAt] = useState(() =>
    formatDateTimeLocal(new Date())
  );
  const [durationMinutes, setDurationMinutes] = useState("3");

  const supabase = useMemo(() => createClient(), []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setEntries([]);
        setErrorMessage("Sesi login tidak ditemukan. Silakan login kembali.");
        return;
      }

      const { data, error } = await supabase
        .from("music_listening_history")
        .select("*")
        .eq("user_id", user.id)
        .order("played_at", { ascending: false });

      if (error) throw error;

      setEntries((data ?? []) as MusicEntry[]);
    } catch (error) {
      console.error("MUSIC HISTORY ERROR:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Riwayat musik gagal dimuat."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const periodEntries = useMemo(() => {
    const start = getPeriodStart(period).getTime();

    return entries.filter(
      (entry) => new Date(entry.played_at).getTime() >= start
    );
  }, [entries, period]);

  const topTracks = useMemo(
    () => getTopItems(periodEntries, (entry) => entry.track_name),
    [periodEntries]
  );

  const topArtists = useMemo(
    () => getTopItems(periodEntries, (entry) => entry.artist_name),
    [periodEntries]
  );

  const totalListeningMs = periodEntries.reduce(
    (total, entry) => total + Math.max(0, entry.duration_ms ?? 0),
    0
  );

  const uniqueTracks = new Set(
    periodEntries.map((entry) => entry.track_name.trim().toLowerCase())
  ).size;

  const uniqueArtists = new Set(
    periodEntries.map((entry) => entry.artist_name.trim().toLowerCase())
  ).size;

  async function addTrack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Silakan login kembali.");

      const duration = Number(durationMinutes);

      if (!Number.isFinite(duration) || duration < 0) {
        throw new Error("Durasi lagu tidak valid.");
      }

      const { error } = await supabase
        .from("music_listening_history")
        .insert({
          user_id: user.id,
          track_name: trackName.trim(),
          artist_name: artistName.trim(),
          album_name: albumName.trim() || null,
          played_at: new Date(playedAt).toISOString(),
          duration_ms: Math.round(duration * 60000),
          source: "manual",
        });

      if (error) throw error;

      setTrackName("");
      setArtistName("");
      setAlbumName("");
      setDurationMinutes("3");
      setPlayedAt(formatDateTimeLocal(new Date()));
      setShowForm(false);
      setSuccessMessage("Lagu berhasil ditambahkan ke Music Wrapped! 🎵");

      await loadHistory();
    } catch (error) {
      console.error("ADD MUSIC ERROR:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Lagu gagal disimpan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function importSpotifyFile(file: File) {
    setImporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const text = await file.text();
      const parsed = parseSpotifyHistory(JSON.parse(text));

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Silakan login kembali.");

      const rows = parsed
        .map((item) => {
          const track = (
            item.trackName ?? item.master_metadata_track_name ?? ""
          ).trim();

          const artist = (
            item.artistName ??
            item.master_metadata_album_artist_name ??
            ""
          ).trim();

          const album = (
            item.albumName ??
            item.master_metadata_album_album_name ??
            ""
          ).trim();

          const timestamp = item.endTime ?? item.ts;
          const playedAtDate = timestamp ? new Date(timestamp) : null;
          const duration = Number(item.msPlayed ?? item.ms_played ?? 0);

          if (
            !track ||
            !artist ||
            !playedAtDate ||
            Number.isNaN(playedAtDate.getTime())
          ) {
            return null;
          }

          return {
            user_id: user.id,
            track_name: track,
            artist_name: artist,
            album_name: album || null,
            track_id: item.spotify_track_uri
              ? item.spotify_track_uri.split(":").pop() ?? null
              : null,
            track_uri: item.spotify_track_uri ?? null,
            played_at: playedAtDate.toISOString(),
            duration_ms:
              Number.isFinite(duration) && duration >= 0 ? duration : null,
            source: "import" as const,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length === 0) {
        throw new Error(
          "Tidak ada lagu yang bisa dibaca. Pastikan file merupakan riwayat streaming Spotify dalam format JSON."
        );
      }

      let imported = 0;

      // Insert in batches to avoid oversized requests.
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from("music_listening_history")
          .insert(batch);

        if (error) throw error;
        imported += batch.length;
      }

      setSuccessMessage(
        `${imported.toLocaleString("id-ID")} riwayat pemutaran berhasil diimpor.`
      );

      await loadHistory();
    } catch (error) {
      console.error("SPOTIFY IMPORT ERROR:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "File Spotify gagal diimpor."
      );
    } finally {
      setImporting(false);
    }
  }

  async function deleteTrack(id: string) {
    const confirmed = window.confirm("Hapus riwayat pemutaran ini?");
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("music_listening_history")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Riwayat berhasil dihapus.");
    await loadHistory();
  }

  const periodLabel = {
    week: "This Week",
    month: "This Month",
    year: "This Year",
  }[period];

  return (
    <div className="min-h-screen bg-[#f7f2ea] px-4 py-6 text-[#3f382f] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-[#e5dacb] bg-gradient-to-br from-[#e9ddcd] via-[#f4eadc] to-[#e8d8c5] p-6 shadow-sm sm:p-9">
          <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full border-[24px] border-white/20" />
          <div className="pointer-events-none absolute -bottom-20 right-28 h-48 w-48 rounded-full bg-[#d8a8a0]/20 blur-2xl" />

          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8a7e70]">
              HOLOZOE · PERSONAL ARCHIVE
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Your Music Wrapped
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#746a5e] sm:text-base">
              A little archive of the songs you played, the artists you
              returned to, and the soundtrack of your life.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="rounded-xl bg-[#55483a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#40362c]"
              >
                {showForm ? "Close form" : "+ Add a song"}
              </button>

              <label className="cursor-pointer rounded-xl border border-[#cbbba7] bg-white/60 px-5 py-3 text-sm font-semibold transition hover:bg-white">
                {importing ? "Importing..." : "Import Spotify JSON"}
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={importing}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importSpotifyFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Feedback */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {successMessage}
          </div>
        )}

        {/* Add song form */}
        {showForm && (
          <section className="rounded-3xl border border-[#e5dacb] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7e70]">
                MANUAL TRACKING
              </p>
              <h2 className="mt-1 text-xl font-semibold">Add a listening moment</h2>
            </div>

            <form onSubmit={addTrack} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Track name *</span>
                <input
                  required
                  value={trackName}
                  onChange={(event) => setTrackName(event.target.value)}
                  placeholder="Song title"
                  className="w-full rounded-xl border border-[#e5dacb] bg-white px-4 py-3 outline-none focus:border-[#92775d]"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Artist *</span>
                <input
                  required
                  value={artistName}
                  onChange={(event) => setArtistName(event.target.value)}
                  placeholder="Artist name"
                  className="w-full rounded-xl border border-[#e5dacb] bg-white px-4 py-3 outline-none focus:border-[#92775d]"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Album</span>
                <input
                  value={albumName}
                  onChange={(event) => setAlbumName(event.target.value)}
                  placeholder="Album name (optional)"
                  className="w-full rounded-xl border border-[#e5dacb] bg-white px-4 py-3 outline-none focus:border-[#92775d]"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Listening date & time *</span>
                <input
                  required
                  type="datetime-local"
                  value={playedAt}
                  onChange={(event) => setPlayedAt(event.target.value)}
                  className="w-full rounded-xl border border-[#e5dacb] bg-white px-4 py-3 outline-none focus:border-[#92775d]"
                />
              </label>

              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Duration (minutes)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  className="w-full rounded-xl border border-[#e5dacb] bg-white px-4 py-3 outline-none focus:border-[#92775d] sm:max-w-xs"
                />
              </label>

              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#55483a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save listening history"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[#e5dacb] px-5 py-3 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Period tabs */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7e70]">
                YOUR LISTENING STORY
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{periodLabel}</h2>
              <p className="mt-1 text-sm text-[#8a7e70]">
                Starting {formatDate(getPeriodStart(period).toISOString())}
              </p>
            </div>

            <div className="flex rounded-xl border border-[#e5dacb] bg-[#fffdf8] p-1">
              {(
                [
                  ["week", "Weekly"],
                  ["month", "Monthly"],
                  ["year", "Yearly"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    period === value
                      ? "bg-[#55483a] text-white"
                      : "text-[#746a5e] hover:bg-[#f0e7dc]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        {loading ? (
          <div className="rounded-2xl border border-[#e5dacb] bg-[#fffdf8] p-8 text-center text-sm text-[#8a7e70]">
            Loading your music history...
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Listening sessions",
                  value: periodEntries.length.toLocaleString("id-ID"),
                  icon: "🎧",
                  note: "Recorded plays",
                },
                {
                  label: "Time listening",
                  value: formatDuration(totalListeningMs),
                  icon: "⏳",
                  note: "Based on saved durations",
                },
                {
                  label: "Tracks discovered",
                  value: uniqueTracks.toLocaleString("id-ID"),
                  icon: "🎵",
                  note: "Unique song titles",
                },
                {
                  label: "Artists explored",
                  value: uniqueArtists.toLocaleString("id-ID"),
                  icon: "🎤",
                  note: "Unique artist names",
                },
              ].map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-[#e5dacb] bg-[#fffdf8] p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-[#8a7e70]">{stat.label}</p>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-[#8a7e70]">{stat.note}</p>
                </article>
              ))}
            </section>

            {/* Top lists */}
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-[#e5dacb] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7e70]">
                      ON REPEAT
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">Top tracks</h3>
                  </div>
                  <span className="text-2xl">🎶</span>
                </div>

                {topTracks.length === 0 ? (
                  <p className="rounded-xl bg-[#f7f2ea] p-4 text-sm text-[#8a7e70]">
                    Belum ada lagu untuk periode ini. Tambahkan lagu atau impor
                    riwayat Spotify kamu.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topTracks.map((track, index) => {
                      const max = topTracks[0]?.count || 1;

                      return (
                        <div key={track.name}>
                          <div className="mb-2 flex items-center gap-3">
                            <span className="w-5 text-sm font-semibold text-[#8a7e70]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {track.name}
                            </span>
                            <span className="text-xs text-[#8a7e70]">
                              {track.count} plays
                            </span>
                          </div>
                          <div className="ml-8 h-2 overflow-hidden rounded-full bg-[#eee7dc]">
                            <div
                              className="h-full rounded-full bg-[#92775d]"
                              style={{
                                width: `${(track.count / max) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-[#e5dacb] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7e70]">
                      YOUR FAVORITES
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">Top artists</h3>
                  </div>
                  <span className="text-2xl">🎤</span>
                </div>

                {topArtists.length === 0 ? (
                  <p className="rounded-xl bg-[#f7f2ea] p-4 text-sm text-[#8a7e70]">
                    Belum ada artis untuk ditampilkan.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topArtists.map((artist, index) => {
                      const max = topArtists[0]?.count || 1;

                      return (
                        <div key={artist.name}>
                          <div className="mb-2 flex items-center gap-3">
                            <span className="w-5 text-sm font-semibold text-[#8a7e70]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {artist.name}
                            </span>
                            <span className="text-xs text-[#8a7e70]">
                              {artist.count} plays
                            </span>
                          </div>
                          <div className="ml-8 h-2 overflow-hidden rounded-full bg-[#eee7dc]">
                            <div
                              className="h-full rounded-full bg-[#71866a]"
                              style={{
                                width: `${(artist.count / max) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Recent history */}
            <section className="rounded-3xl border border-[#e5dacb] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#8a7e70]">
                    YOUR ARCHIVE
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">
                    Listening history
                  </h3>
                  <p className="mt-1 text-sm text-[#8a7e70]">
                    {entries.length.toLocaleString("id-ID")} saved plays
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHistory((value) => !value)}
                  className="rounded-xl border border-[#e5dacb] px-4 py-2 text-sm font-medium transition hover:bg-[#f7f2ea]"
                >
                  {showHistory ? "Hide history" : "View history"}
                </button>
              </div>

              {showHistory && (
                <div className="mt-5 space-y-3">
                  {entries.length === 0 ? (
                    <p className="text-sm text-[#8a7e70]">
                      Riwayat masih kosong.
                    </p>
                  ) : (
                    entries.slice(0, 100).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-[#eee7dc] p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0e7dc]">
                          🎵
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {entry.track_name}
                          </p>
                          <p className="truncate text-xs text-[#8a7e70]">
                            {entry.artist_name}
                            {entry.album_name ? ` · ${entry.album_name}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-[#8a7e70]">
                            {formatDate(entry.played_at)} ·{" "}
                            {entry.duration_ms
                              ? formatDuration(entry.duration_ms)
                              : "Durasi tidak tersedia"}{" "}
                            · {entry.source}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void deleteTrack(entry.id)}
                          aria-label={`Delete ${entry.track_name}`}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-[#a15f56] hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}

                  {entries.length > 100 && (
                    <p className="text-xs text-[#8a7e70]">
                      Menampilkan 100 riwayat terbaru dari{" "}
                      {entries.length.toLocaleString("id-ID")} data.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Import instructions */}
            <section className="rounded-2xl border border-[#e5dacb] bg-[#eee7dc]/70 p-5">
              <h3 className="font-semibold">Import your Spotify history</h3>
              <p className="mt-2 text-sm leading-6 text-[#746a5e]">
                Minta salinan data akun melalui pengaturan privasi Spotify.
                Setelah menerima arsipnya, ekstrak file ZIP dan cari file JSON
                riwayat streaming, misalnya{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">
                  Streaming_History_Audio_*.json
                </code>
                . Pilih file JSON tersebut di tombol Import Spotify JSON.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#746a5e]">
                Impor file yang sama lebih dari sekali dapat membuat data
                duplikat. Sebelum mengulang impor, periksa riwayat yang sudah
                tersimpan.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}