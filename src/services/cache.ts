// Cache TTL ringan dalam-memori untuk bacaan yang kerap dikongsi antara
// modul (senarai pengguna, kategori, tetapan, bukti). Menghapuskan 7+
// panggilan getUsers() penuh yang berulang pada setiap tukar tab.
//
// Sengaja BUKAN TanStack Query: satu akaun kongsi, segelintir skrin, tiada
// keperluan muat-semula-latar/kemas-kini-optimistik — cache 40 baris tanpa
// kebergantungan mengubah sifar API komponen. Nilai semula jika akaun
// log masuk pelajar individu diperkenalkan.

const store = new Map<string, { at: number; value: unknown }>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) {
    return hit.value as T;
  }
  const value = await fn();
  store.set(key, { at: Date.now(), value });
  return value;
}

// Buang entri yang kuncinya bermula dengan prefiks (kosong = semua).
export function invalidate(prefix = ''): void {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
