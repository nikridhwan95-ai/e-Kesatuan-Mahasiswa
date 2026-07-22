# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Portal Aktiviti Pelajar UPM — an integrated student-affairs portal for BHEP UPM combining two interlinked modules:

1. **e-Kesatuan Mahasiswa** — student activity application management: working-paper form → approval chain (Unit Semakan → Pembentangan → YDP MPP → TNC HEPA) → post-program report verified by Unit Pelaporan.
2. **Modul Bakat / Portal Bakat (Talent Hub)** — evidence-first student talent intelligence (SDD TalentOS v2.0).

Stack: Vite + React 19 + Tailwind v4 + TypeScript, backed by Supabase (Auth + Postgres + Storage). All UI text, docs, and commit messages are in Bahasa Melayu (see Language section).

**Read `docs/HANDOFF.md` before making changes.** It records decisions already settled with the owner (do not reopen them), pending owner-side setup, and the mock-Supabase verification procedure. Update it after significant work. `docs/SCHEMA.md` §1 (folder structure) predates the Firebase→Supabase migration and is partially stale — trust `docs/HANDOFF.md` and `supabase/schema.sql` where they disagree.

## Commands

```bash
npm install
npm run dev          # Vite dev server, port 3000, host 0.0.0.0
npm run lint         # tsc --noEmit — the only lint/typecheck
npm run check:bakat  # property checks: score engine, derivation, import parser
npm run build        # production build
```

Mandatory before every push: `npm run lint && npm run check:bakat && npm run build` — all three must pass.

There is no test framework. `scripts/check-bakat.ts` is one fast tsx script of property assertions (prints `ok`/`FAIL` per check, non-zero exit on failure; currently 53 checks — the README's "34" is stale). When changing `src/bakat/domain/`, `src/bakat/derive.ts`, `src/bakat/insights.ts`, or `src/services/importParser.ts`, extend the checks there.

## Core architecture

### The IRON RULE (SDD §4.4) — never violate

Competency scores are NEVER stored. Only the `evidence` table is persisted; scores are recomputed on every display by the pure deterministic engine `src/bakat/domain/scoring.ts` from evidence with status `approved` only. Evidence is immutable: a dispute only flips `status` to `disputed` (the row is kept, the engine excludes it). Generation is idempotent via deterministic IDs `{appId}__{sourceType}__{competency}` upserted with ON CONFLICT DO NOTHING, so existing rows — including disputed/void ones — are never rewritten.

Score = min(100, Σ points × role × level × attendance × recency-decay), with proportional scale-down at per-source-type caps. Overall talent score = mean of top 3 competency scores. Bands: Cemerlang ≥90 / Baik 70–89 / Berkembang 50–69 / Perlu Peningkatan <50. All dashboard statistics are rule-derived from real data — no invented numbers; the only AI-generated content is the clearly labelled Gemini "Jana Analisis AI" output (`src/services/ai/summarizer.ts`, key injected as `process.env.GEMINI_API_KEY` via the `define` block in `vite.config.ts`).

### Module integration bridge

When an application reaches `Lulus Sepenuhnya` AND its report is `Disahkan`, talent evidence is auto-generated (from ReportModule verification, the "Jana Bukti" backfill button, and Excel import). `src/bakat/derive.ts` is the pure bridge mapping e-Kesatuan facts → `Evidence[]`:

- Applicant position (Pengarah/Setiausaha) → `committee_role` evidence for LEA/PRJ (+FIN if budgeted), multipliers chairperson ×1.8 / secretary ×1.45
- Organizing level → level multiplier (Antarabangsa ×1.8 … Kolej/Fakulti ×1.0)
- Programme category (8 Teras) and declared soft skills → `achievement` evidence for mapped competencies

### Layering — keep the pure/I-O separation

- `src/bakat/domain/` — PURE deterministic engine (types, 16-competency taxonomy, multipliers, scoring, evidence helpers). No I/O, no React, no Supabase. `scoring.ts` is the only place a CompetencyScore may be produced.
- Also pure (and therefore checkable by check:bakat): `src/bakat/derive.ts`, `src/bakat/insights.ts`, `src/services/importParser.ts`.
- Supabase I/O lives only in: `src/services/dataService.ts` (all e-Kesatuan tables; its function API was kept identical to the old firestoreService so UI modules were untouched), `src/bakat/evidenceService.ts` (evidence table: idempotent sync, dispute), `src/services/importService.ts` (Excel import writes).
- `src/App.tsx` — shell: auth, 3-group sidebar (e-Kesatuan Mahasiswa / Portal Bakat / Tetapan Sistem, groups hidden by role), tab routing. Feature UIs live under `src/components/<module>/`; shared bakat widgets in `src/components/bakat/ui.tsx`.

### Supabase

- `supabase/schema.sql` is the SOURCE OF TRUTH for tables + RLS + the `uploads` storage bucket. It is idempotent and the owner re-runs it manually in Supabase Dashboard → SQL Editor, so every schema change must be made there using re-runnable forms (`if not exists`, `add column if not exists`, `or replace`).
- e-Kesatuan columns are quoted camelCase to match the TypeScript types exactly — there is deliberately no field-mapping layer. The evidence table uses snake_case, matching `src/bakat/domain/types.ts`. Keep both conventions.
- Client in `src/supabase.ts`; the hard-coded publishable key is intentional and safe (access control is RLS), overridable via `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
- Auth model: ONE shared portal account — username `ekmupm` maps to synthetic email `ekmupm@portal-bhep.upm.edu.my`. That email and `nikridhwan95@gmail.com` are forced master admins (`App.tsx`). Students never log in; student records use synthetic uids `M-<matric>` created by Excel import or the application flow. The admin header has an "Uji" role picker to preview other roles' views.

## Gotchas

- `src/types.ts` is the LIVE types file (Bahasa Melayu statuses like `Lulus Sepenuhnya`). `src/types/index.ts` is dead pre-migration code (English statuses) that nothing imports — don't mistake it for the real one.
- No `@types/react` is installed: a component that accepts a `key` prop must declare `key` in its own props type (existing examples in the codebase).
- The remote sandbox blocks `*.supabase.co`, so nothing can be tested against the real backend here. For visual verification use the in-memory mock per `docs/HANDOFF.md` §8: `cp dev/mocksb.example.ts src/mocksb.ts`, add a TEMPORARY `vite.config.ts` alias `'@supabase/supabase-js': path.resolve(__dirname, 'src/mocksb.ts')`, then `npm run dev` (auto-login as admin with sample data). Revert both (remove alias, delete `src/mocksb.ts`, re-run lint) before committing — never commit the mock wiring. `dev/` is excluded from tsc.
- Playwright screenshots: launch with `executablePath: '/opt/pw-browsers/chromium'`.

## Language (Bahasa Melayu, DBP standard) — maintain

UI text and commit messages are Bahasa Melayu; commits use conventional-commit prefixes with BM descriptions (e.g. `feat(bakat): …`). Settled terminology (HANDOFF §7): 'kemas kini' (two words) · 'pascaprogram' (joined) · UI says **'bukti'**, never 'evidence'/'evidens' (code identifiers and the DB table stay `evidence`) · imperatives with -kan (Pertikaikan, Paparkan) · 'daripada' for sources · 'baharu' for new · avoid '&' in prose · 'Faktor Masa' is the label for recency decay · the category value 'Akademik & Intelektual' must NOT be altered (stored value and mapping key).
