import { createClient } from "@/lib/supabase";

const STORAGE_PREFIX = "life-game-";

type StorageRow = {
  storage_key: string;
  storage_value: string | null;
};

const supabase = createClient();

async function getAuthenticatedUser() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      "Gagal mengambil Supabase session:",
      sessionError
    );

    return {
      user: null,
      error: sessionError,
    };
  }

  if (!session?.user) {
    return {
      user: null,
      error: null,
    };
  }

  return {
    user: session.user,
    error: null,
  };
}

function isProtectedStorageKey(storageKey: string) {
  return (
    storageKey === "life-game-user-mode" ||
    storageKey === "life-game-user-email"
  );
}

/**
 * Ambil data Life Game dari Supabase
 * dan jadikan Supabase sebagai source of truth.
 */
export async function syncLifeGameStorageFromSupabase() {
  const {
    user,
    error: authError,
  } = await getAuthenticatedUser();

  if (authError || !user) {
    console.error(
      "Life Game storage sync: user belum terautentikasi.",
      authError
    );

    return {
      success: false,
      reason: "not_authenticated" as const,
    };
  }

  const { data, error } = await supabase
    .from("life_game_storage")
    .select("storage_key, storage_value")
    .eq("user_id", user.id);

  if (error) {
    console.error(
      "Gagal mengambil Life Game storage dari Supabase:",
      error
    );

    return {
      success: false,
      reason: "supabase_error" as const,
      error,
    };
  }

  /**
   * Bersihkan cache Life Game lama.
   */
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);

    if (!key) {
      continue;
    }

    if (!key.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    if (isProtectedStorageKey(key)) {
      continue;
    }

    localStorage.removeItem(key);
  }

  let count = 0;

  for (const row of (data ?? []) as StorageRow[]) {
    if (!row.storage_key.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    if (isProtectedStorageKey(row.storage_key)) {
      continue;
    }

    if (row.storage_value === null) {
      continue;
    }

    localStorage.setItem(
      row.storage_key,
      row.storage_value
    );

    count++;
  }

  console.log(
    "Life Game storage berhasil disinkronkan:",
    count,
    "key"
  );

  window.dispatchEvent(
    new Event("life-game-updated")
  );

  return {
    success: true,
    count,
  };
}

/**
 * Subscribe perubahan Life Game dari Supabase
 * supaya HP dan laptop menerima perubahan
 * tanpa harus refresh.
 */
export async function subscribeLifeGameStorageRealtime() {
  const {
    user,
    error: authError,
  } = await getAuthenticatedUser();

  if (authError || !user) {
    console.error(
      "Life Game realtime: user belum terautentikasi.",
      authError
    );

    return null;
  }

  const channelName =
    `life-game-storage-${user.id}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "life_game_storage",
        filter: `user_id=eq.${user.id}`,
      },
      async (payload) => {
        console.log(
          "Life Game realtime update:",
          payload.eventType
        );

        /**
         * INSERT / UPDATE
         */
        if (
          payload.eventType === "INSERT" ||
          payload.eventType === "UPDATE"
        ) {
          const row =
            payload.new as Partial<StorageRow>;

          const storageKey =
            row.storage_key;

          if (
            !storageKey ||
            !storageKey.startsWith(
              STORAGE_PREFIX
            ) ||
            isProtectedStorageKey(
              storageKey
            )
          ) {
            return;
          }

          if (
            row.storage_value === null ||
            row.storage_value === undefined
          ) {
            localStorage.removeItem(
              storageKey
            );
          } else {
            localStorage.setItem(
              storageKey,
              row.storage_value
            );
          }

          window.dispatchEvent(
            new Event("life-game-updated")
          );

          return;
        }

        /**
         * DELETE
         *
         * Untuk DELETE kita lakukan full sync
         * karena old row tidak selalu membawa
         * seluruh kolom tanpa replica identity full.
         */
        if (
          payload.eventType === "DELETE"
        ) {
          await syncLifeGameStorageFromSupabase();
        }
      }
    )
    .subscribe((status) => {
      console.log(
        "Life Game realtime status:",
        status
      );

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT"
      ) {
        console.error(
          "Life Game realtime gagal terhubung:",
          status
        );
      }
    });

  return () => {
    console.log(
      "Menutup Life Game realtime channel."
    );

    supabase.removeChannel(channel);
  };
}

/**
 * Simpan satu storage key ke Supabase.
 */
export async function saveLifeGameStorage(
  storageKey: string,
  storageValue: string | null
) {
  const {
    user,
    error: authError,
  } = await getAuthenticatedUser();

  if (authError || !user) {
    console.error(
      "Life Game storage save: user belum terautentikasi.",
      authError
    );

    return {
      success: false,
      reason: "not_authenticated" as const,
    };
  }

  if (!storageKey.startsWith(STORAGE_PREFIX)) {
    return {
      success: false,
      reason: "invalid_key" as const,
    };
  }

  if (isProtectedStorageKey(storageKey)) {
    return {
      success: false,
      reason: "protected_key" as const,
    };
  }

  const { error } = await supabase
    .from("life_game_storage")
    .upsert(
      {
        user_id: user.id,
        storage_key: storageKey,
        storage_value: storageValue,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "user_id,storage_key",
      }
    );

  if (error) {
    console.error(
      "Gagal menyimpan Life Game storage ke Supabase:",
      error
    );

    return {
      success: false,
      reason: "supabase_error" as const,
      error,
    };
  }

  console.log(
    "Life Game storage berhasil disimpan:",
    storageKey
  );

  return {
    success: true,
  };
}

/**
 * Simpan data localStorage saat ini
 * ke Supabase.
 */
export async function saveCurrentLifeGameStorage(
  storageKey: string
) {
  const value =
    localStorage.getItem(storageKey);

  return saveLifeGameStorage(
    storageKey,
    value
  );
}

/**
 * Hapus satu storage key dari Supabase.
 */
export async function removeLifeGameStorage(
  storageKey: string
) {
  const {
    user,
    error: authError,
  } = await getAuthenticatedUser();

  if (authError || !user) {
    console.error(
      "Life Game storage remove: user belum terautentikasi.",
      authError
    );

    return {
      success: false,
      reason: "not_authenticated" as const,
    };
  }

  if (!storageKey.startsWith(STORAGE_PREFIX)) {
    return {
      success: false,
      reason: "invalid_key" as const,
    };
  }

  if (isProtectedStorageKey(storageKey)) {
    return {
      success: false,
      reason: "protected_key" as const,
    };
  }

  const { error } = await supabase
    .from("life_game_storage")
    .delete()
    .eq("user_id", user.id)
    .eq("storage_key", storageKey);

  if (error) {
    console.error(
      "Gagal menghapus Life Game storage:",
      error
    );

    return {
      success: false,
      reason: "supabase_error" as const,
      error,
    };
  }

  return {
    success: true,
  };
}