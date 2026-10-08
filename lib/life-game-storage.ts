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

/**
 * Ambil data Life Game dari Supabase untuk user yang sedang login.
 *
 * Supabase menjadi sumber data utama.
 * localStorage digunakan sebagai cache agar komponen
 * Life Game yang lama tetap bisa bekerja.
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
   * Bersihkan cache Life Game dari user sebelumnya.
   *
   * Jangan hapus key session/auth.
   */
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);

    if (!key) {
      continue;
    }

    if (!key.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    if (
      key === "life-game-user-mode" ||
      key === "life-game-user-email"
    ) {
      continue;
    }

    localStorage.removeItem(key);
  }

  if (!data) {
    return {
      success: true,
      count: 0,
    };
  }

  let count = 0;

  for (const row of data as StorageRow[]) {
    if (!row.storage_key.startsWith(STORAGE_PREFIX)) {
      continue;
    }

    if (
      row.storage_key === "life-game-user-mode" ||
      row.storage_key === "life-game-user-email"
    ) {
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

  return {
    success: true,
    count,
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

  if (
    storageKey === "life-game-user-mode" ||
    storageKey === "life-game-user-email"
  ) {
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
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,storage_key",
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
 * Simpan data yang sedang ada di localStorage
 * ke Supabase.
 */
export async function saveCurrentLifeGameStorage(
  storageKey: string
) {
  const value = localStorage.getItem(storageKey);

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