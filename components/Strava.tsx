"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type StravaActivity = {
  id: string;
  strava_activity_id: number;
  name: string;
  sport_type: string | null;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date: string | null;
};

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

function formatDistance(meters: number) {
  return `${(meters / 1000).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })} km`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(date: string | null) {
  if (!date) return "Tanggal tidak tersedia";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Tanggal tidak tersedia";
  }

  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sportEmoji(sport: string | null) {
  const value = (sport ?? "").toLowerCase();

  if (value.includes("run")) return "🏃";
  if (value.includes("ride") || value.includes("cycl")) return "🚴";
  if (value.includes("swim")) return "🏊";
  if (value.includes("walk") || value.includes("hike")) return "🥾";
  if (value.includes("yoga")) return "🧘";
  if (value.includes("workout") || value.includes("weight")) return "🏋️";

  return "🏅";
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e1d7c9] bg-[#f8f3eb] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#8a7e70]">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>

      <p className="mt-3 text-2xl font-bold text-[#3f382f]">{value}</p>
      <p className="mt-1 text-xs text-[#9a8e80]">{detail}</p>
    </div>
  );
}

export default function Strava() {
  const [connected, setConnected] = useState(false);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadStravaData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setConnected(false);
        setActivities([]);
        setErrorMessage(
          "Sesi login tidak ditemukan. Silakan login kembali ke HOLOZOE."
        );
        return;
      }

      const { data: connection, error: connectionError } = await supabase
        .from("strava_connections")
        .select("user_id, strava_athlete_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (connectionError) {
        console.error("STRAVA CONNECTION ERROR:", connectionError);
        setConnected(false);
        setErrorMessage(
          "Status koneksi belum dapat dibaca dari Supabase. Periksa tabel dan policy strava_connections."
        );
        return;
      }

      setConnected(Boolean(connection));

      const { data, error: activitiesError } = await supabase
        .from("strava_activities")
        .select(
          "id, strava_activity_id, name, sport_type, distance, moving_time, total_elevation_gain, start_date"
        )
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(100);

      if (activitiesError) {
        console.error("STRAVA ACTIVITIES ERROR:", activitiesError);
        setActivities([]);
        setErrorMessage(
          "Data aktivitas belum dapat dibaca. Periksa struktur tabel strava_activities dan policy RLS-nya."
        );
        return;
      }

      setActivities((data ?? []) as StravaActivity[]);
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (error) {
      console.error("STRAVA PAGE ERROR:", error);
      setErrorMessage("Terjadi kesalahan saat memuat data Strava.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("strava");

    const messages: Record<string, string> = {
      connected: "Strava berhasil terhubung!",
      save_error:
        "Otorisasi berhasil dikembalikan ke HOLOZOE, tetapi penyimpanan koneksi gagal. Kita perlu memperbaiki backend.",
      invalid_state:
        "Verifikasi OAuth gagal. Silakan coba menghubungkan Strava kembali.",
      config_error: "Konfigurasi Strava di server belum lengkap.",
      token_error:
        "Strava belum memberikan token yang valid. Coba hubungkan ulang.",
      connection_error: "Terjadi masalah saat menghubungkan Strava.",
      login_required:
        "Sesi login tidak ditemukan ketika Strava mengembalikan kamu ke HOLOZOE. Login kembali lalu coba lagi.",
      cancelled: "Proses koneksi Strava dibatalkan.",
    };

    if (status && messages[status]) {
      setNotice(messages[status]);
    }

    void loadStravaData();
  }, [loadStravaData]);

  const totalDistance = activities.reduce(
    (total, activity) => total + Number(activity.distance || 0),
    0
  );

  const totalMovingTime = activities.reduce(
    (total, activity) => total + Number(activity.moving_time || 0),
    0
  );

  const totalElevation = activities.reduce(
    (total, activity) =>
      total + Number(activity.total_elevation_gain || 0),
    0
  );

  const totalActivities = activities.length;

  return (
    <div className="space-y-6">
      {/* CONNECTION CARD */}
      <section className="overflow-hidden rounded-3xl border border-[#d8cec0] bg-[#f7f2ea] shadow-sm">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7ded1] text-2xl">
                🏃
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#9a8e80]">
                  Your movement archive
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#3f382f]">
                  Strava
                </h2>
              </div>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-[#817568]">
              Every step, every ride, every little bit of progress. Keep your
              movement history together in HOLOZOE.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                  connected
                    ? "bg-[#e0eadc] text-[#496345]"
                    : "bg-[#eee5d8] text-[#827364]"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected ? "bg-[#6e9365]" : "bg-[#a99a87]"
                  }`}
                />
                {loading
                  ? "Checking connection..."
                  : connected
                    ? "Connected"
                    : "Not connected"}
              </span>

              {lastUpdated && (
                <span className="text-xs text-[#9a8e80]">
                  Updated at {lastUpdated}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-44">
            <a
              href="/api/strava/connect"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76f32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d96025]"
            >
              {connected ? "Reconnect Strava" : "Connect Strava"}
              <span aria-hidden="true">↗</span>
            </a>

            <button
              type="button"
              onClick={() => void loadStravaData()}
              disabled={loading}
              className="rounded-xl border border-[#d8cec0] bg-white/60 px-5 py-3 text-sm font-medium text-[#5c5145] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh data"}
            </button>
          </div>
        </div>
      </section>

      {/* NOTICE */}
      {notice && (
        <div className="rounded-2xl border border-[#e1d2b9] bg-[#f7edda] p-4 text-sm leading-6 text-[#705b3d]">
          {notice}
        </div>
      )}

      {/* ERROR */}
      {errorMessage && (
        <div className="rounded-2xl border border-[#e8c7bd] bg-[#fae9e5] p-4 text-sm leading-6 text-[#8b493a]">
          <p className="font-semibold">Data belum siap</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
      )}

      {/* STATS */}
      <section>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-[#9a8e80]">
            Your activity
          </p>
          <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
            Movement at a glance
          </h3>
          <p className="mt-1 text-sm text-[#8a7e70]">
            Ringkasan dari aktivitas yang sudah tersimpan di HOLOZOE.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Activities"
            value={loading ? "—" : totalActivities.toLocaleString("id-ID")}
            detail="Aktivitas tersimpan"
            icon="🏅"
          />

          <StatCard
            label="Distance"
            value={loading ? "—" : formatDistance(totalDistance)}
            detail="Total jarak"
            icon="📍"
          />

          <StatCard
            label="Moving time"
            value={loading ? "—" : formatDuration(totalMovingTime)}
            detail="Total waktu bergerak"
            icon="⏱️"
          />

          <StatCard
            label="Elevation"
            value={
              loading
                ? "—"
                : `${Math.round(totalElevation).toLocaleString("id-ID")} m`
            }
            detail="Total elevasi naik"
            icon="⛰️"
          />
        </div>
      </section>

      {/* ACTIVITIES */}
      <section className="rounded-3xl border border-[#d8cec0] bg-[#f7f2ea] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#9a8e80]">
              Your archive
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
              Recent activities
            </h3>
          </div>

          <span className="text-xs text-[#9a8e80]">
            {activities.length} activities
          </span>
        </div>

        {loading ? (
          <div className="mt-5 rounded-2xl bg-white/60 p-8 text-center text-sm text-[#8a7e70]">
            Loading your activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#d8cec0] bg-white/40 px-5 py-10 text-center">
            <div className="text-4xl">🚴</div>
            <h4 className="mt-3 font-semibold text-[#51473c]">
              Your movement story starts here
            </h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8a7e70]">
              {connected
                ? "Koneksi sudah tersimpan, tetapi belum ada aktivitas yang disinkronkan. Kita perlu membuat fitur sinkronisasi aktivitas."
                : "Hubungkan akun Strava terlebih dahulu. Setelah koneksi dan sinkronisasi selesai, aktivitasmu akan muncul di sini."}
            </p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-[#e5dbce]">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e9dfd1] text-xl">
                  {sportEmoji(activity.sport_type)}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold text-[#3f382f]">
                    {activity.name}
                  </h4>
                  <p className="mt-1 text-xs text-[#9a8e80]">
                    {activity.sport_type || "Activity"} ·{" "}
                    {formatDate(activity.start_date)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#51473c]">
                    {formatDistance(Number(activity.distance || 0))}
                  </p>
                  <p className="mt-1 text-xs text-[#9a8e80]">
                    {formatDuration(Number(activity.moving_time || 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NEXT FEATURES */}
      <section className="rounded-3xl border border-[#d8cec0] bg-[#eee6da] p-5 sm:p-6">
        <p className="text-xs uppercase tracking-widest text-[#9a8e80]">
          Coming next
        </p>

        <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
          Your Strava Wrapped
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817568]">
          A personal recap of your most active month, favorite sport, distance
          milestones, elevation gained, and movement streaks. Semua statistik
          akan dihitung dari data aktivitas asli.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Monthly recap",
            "Sport breakdown",
            "Personal records",
            "Milestones",
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-[#d8cec0] bg-[#f7f2ea] px-3 py-1.5 text-xs text-[#74685b]"
            >
              {feature}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
