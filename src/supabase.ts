// Klien Supabase (Auth + Postgres + Storage).
// Kunci di bawah ialah *publishable key* (selamat untuk kod klien; kawalan
// akses sebenar dikuatkuasakan oleh polisi RLS dalam supabase/schema.sql).

import { createClient, User as SupabaseUser } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ||
  'https://tmtjnkexvqlvdxrmnugb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_t9ImOm_Ga9IAZDBHntp-0g_oNomzY6C';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ── Log masuk nama pengguna + kata laluan ──────────────────────────────────
// Portal menggunakan SATU akaun kongsi (nama pengguna 'ekmupm'). Di sebalik
// tabir, nama pengguna dipetakan kepada akaun e-mel sintetik Supabase supaya
// sesi auth & polisi RLS berfungsi seperti biasa.
export const PORTAL_USERNAME = 'ekmupm';
const USERNAME_DOMAIN = 'portal-bhep.upm.edu.my';

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

export const PORTAL_ADMIN_EMAIL = usernameToEmail(PORTAL_USERNAME);

// Bentuk pengguna yang digunakan oleh UI (uid / email / displayName / photoURL).
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export function toAppUser(u: SupabaseUser | null | undefined): AppUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    uid: u.id,
    email: u.email ?? '',
    displayName: meta.full_name || meta.name || (u.email ? u.email.split('@')[0] : ''),
    photoURL: meta.avatar_url || meta.picture || null,
  };
}

// Pengguna semasa dari sesi tempatan (tiada panggilan rangkaian).
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { data } = await supabase.auth.getSession();
  return toAppUser(data.session?.user);
}
