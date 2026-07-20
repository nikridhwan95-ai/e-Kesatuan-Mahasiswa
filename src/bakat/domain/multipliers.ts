// Pendarab enjin skor — nilai TEPAT dari SDD Appendix C (Scoring Engine v1) & §8.5.

import { ProgrammeLevel, RoleType } from './types';

// Appendix C — pendarab peranan.
export const ROLE_MULTIPLIER: Record<RoleType, number> = {
  participant: 1.0,
  volunteer: 1.15,
  committee: 1.3,
  secretary: 1.45,
  treasurer: 1.45,
  vice_chair: 1.6,
  chairperson: 1.8, // Chairperson / Pengarah Program
};

// §8.5 / Appendix C — pendarab peringkat.
export const LEVEL_MULTIPLIER: Record<ProgrammeLevel, number> = {
  faculty: 1.0,
  university: 1.2,
  national: 1.5,
  international: 1.8,
};

// §8.5 — separuh hayat recency (bulan). Decay eksponen dari tarikh acara.
export const RECENCY_HALF_LIFE_MONTHS = 24;

// Versi enjin — dicap pada setiap skor (kebolehulangan §8.5).
export const ENGINE_VERSION = 'scoring-v1';

// "Kini" untuk pengiraan decay — masa sebenar dalam portal bersepadu ini.
export function nowISO(): string {
  return new Date().toISOString();
}
