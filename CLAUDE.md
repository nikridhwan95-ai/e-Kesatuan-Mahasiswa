# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Portal Aktiviti Pelajar UPM — an integrated student-affairs portal for BHEP UPM combining two interlinked modules:

1. **e-Kesatuan Mahasiswa** — student activity application management: working-paper form → approval chain (Unit Semakan → Pembentangan → YDP MPP → TNC HEPA) → post-program report verified by Unit Pelaporan.
2. **Modul Bakat / Portal Bakat (Talent Hub)** — evidence-first student talent intelligence (SDD TalentOS v2.0).

Stack: Vite + React 19 + Tailwind v4 + TypeScript (strict), backed by Supabase (Auth + Postgres + Storage + Edge Functions). All UI text, docs, and commit messages are in Bahasa Melayu (see Language section).

**Read `docs/HANDOFF.md` before making changes.** It records decisions already settled with the owner (do not reopen them), the 8-phase audit remediation (merged to `main` via PR #7), pending owner-side setup, and deliberate deferrals (do not "fix" them without reading the rationale). Update it after significant work. `docs/SCHEMA.md` is the detailed architecture/schema/security reference; `docs/SDD.md` is the full software design document (BM) — update it when the design changes rather than writing a new one.

## Commands

```bash
npm install
npm run dev          # Vite dev server, port 3000, host 0.0.0.0
npm run lint         # tsc --noEmit (strict mode)
npm run lint:eslint  # ESLint — 0 errors required; CI caps warnings at 100
npm run check:bakat  # property checks: score engine, derivation, import planner/parser
npm run build        # production build (code-split; recharts/xlsx lazy)
npm run format       # Prettier (the repo is fully Prettier-formatted)
```

Mandatory before every push: `npm run lint && npm run check:bakat && npm run build` plus ESLint — CI (`.github/workflows/ci.yml`) enforces all four on every PR and on push to `main` (feature-branch pushes do NOT trigger CI, so run them locally).

There is no test framework. `scripts/check-bakat.ts` is one fast tsx script of property assertions (prints `ok`/`FAIL` per check, non-zero exit on failure; currently 87 checks). When changing `src/bakat/domain/`, `src/bakat/derive.ts`, `src/bakat/insights.ts`, `src/services/importParser.ts`, or `src/services/importPlan.ts`, extend the checks there.

## Core architecture

### The IRON RULE (SDD §4.4) — never violate

Competency scores are NEVER stored. Only the `evidence` table is persisted; scores are recomputed on every display by the pure deterministic engine `src/bakat/domain/scoring.ts` from evidence with status `approved` only. Evidence is immutable: a dispute only flips `status` to `disputed` (the row is kept, the engine excludes it), and a DB trigger (`guard_evidence_update`) enforces immutability server-side. Generation is idempotent via deterministic IDs `{appId}__{sourceType}__{competency}` upserted with ON CONFLICT DO NOTHING.

Score = min(100, Σ clamped-points(0–10) × role × level × attendance × recency-decay), with proportional scale-down at per-source-type caps; invalid dates/values yield a neutral factor of 1 (never NaN). **Overall talent score = mean of the NONZERO scores among the top 3 competencies** (narrow profiles are not diluted). Bands: Cemerlang ≥90 / Baik 70–89 / Berkembang 50–69 / Perlu Peningkatan <50. Four competencies (INN, TEC, GLO, NEG) have no derivation path and stay 0 until manual endorsement exists. All dashboard statistics are rule-derived from real data; the only AI-generated content is the "Jana Analisis AI" output, served by the Supabase Edge Function `supabase/functions/jana-analisis/` (JWT + role checked, prompts built server-side — the Gemini key never ships to the client).

### Module integration bridge

When an application reaches `Lulus Sepenuhnya` AND its report is `Disahkan`, talent evidence is auto-generated (from ReportModule verification, the "Jana Bukti" backfill button, and Excel import). `src/bakat/derive.ts` is the pure bridge mapping e-Kesatuan facts → `Evidence[]`:

- Applicant position (Pengarah/Setiausaha) → `committee_role` evidence for LEA/PRJ (+FIN if budgeted), multipliers chairperson ×1.8 / secretary ×1.45
- Organizing level → level multiplier (Antarabangsa ×1.8 … Kolej/Fakulti ×1.0)
- Programme category (8 Teras) and declared soft skills → `achievement` evidence for mapped competencies

### Layering — keep the pure/I-O separation

- `src/bakat/domain/` — PURE deterministic engine. No I/O, no React, no Supabase. `scoring.ts` is the only place a CompetencyScore may be produced.
- Also pure (and therefore checkable by check:bakat): `src/bakat/derive.ts`, `src/bakat/insights.ts`, `src/services/importParser.ts`, `src/services/importPlan.ts`.
- Supabase I/O lives only in: `src/services/dataService.ts` (all e-Kesatuan tables; explicit column projections, field allowlists, signed-URL storage access), `src/bakat/evidenceService.ts`, `src/services/importService.ts` (thin executor over the pure import planner; `reconcileImportOrphans` repairs partial imports). `src/services/cache.ts` is a tiny TTL cache used by hot list reads — mutations must call `invalidate()`.
- `src/App.tsx` — shell only: auth, 3-group sidebar, tab routing with `React.lazy` per module. Feature UIs live under `src/components/<module>/`; the application module is split (Module=orchestrator + List/Detail/Form/Timeline). Shared primitives in `src/components/shared/` (StatusBadge, FileLink, ToastProvider/useNotification, ConfirmDialog/useConfirm, ErrorBoundary) — use these, never ad-hoc status chips, `alert()`/`confirm()`/`prompt()`, or per-module toast copies. Shared constants (semester allocation, CVD-safe category palette) in `src/constants.ts`; date parsing/formatting via `src/utils/dateUtils.ts` (`parseTarikh`/`formatTarikh` — never `new Date('YYYY-MM-DD')` directly).

### Supabase

- `supabase/schema.sql` is the SOURCE OF TRUTH for tables + RLS + integrity triggers + FKs + the private `uploads` bucket + the admin-role seed. It is idempotent and the owner re-runs it manually (twice — second run must be error-free), so every schema change must use re-runnable forms (`if not exists`, `add column if not exists`, `or replace`, guarded `DO $$` blocks).
- e-Kesatuan columns are quoted camelCase matching the TypeScript types exactly (no mapping layer); the evidence table uses snake_case. Status/role values are CHECK-constrained to the literal unions in `src/types.ts` — keep them in sync.
- Security model: role comes ONLY from `users.role` (seeded for the portal account) — never hard-code emails in `is_admin()` or the client; public signups are disabled in the dashboard. Storage is PRIVATE: `uploadFile` stores paths, `getFileUrl` issues 1-hour signed URLs (and still understands legacy public URLs). Client in `src/supabase.ts`; the hard-coded publishable key is intentional (access control is RLS; `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` override it).
- Auth model: ONE shared portal account — username `ekmupm` → `ekmupm@portal-bhep.upm.edu.my`. Students never log in; student records use synthetic uids `M-<matric>`. The admin header "Uji" role picker only changes the VIEW — RLS + triggers are the real control.

## Gotchas

- `src/types.ts` is the single types file (Bahasa Melayu statuses like `Lulus Sepenuhnya`).
- The remote sandbox blocks `*.supabase.co`, so nothing can be tested against the real backend here. For visual verification use the in-memory mock per `docs/HANDOFF.md` §8 — but note the mock predates signed URLs and `functions.invoke` (file links and the AI button will show error states until it is extended). Never commit the mock wiring. `dev/` and `supabase/functions/` are excluded from tsc/ESLint (the latter is Deno code).
- `react-hooks/exhaustive-deps` (8 stable fetchData-in-effect warnings), the other react-hooks v7 rules (immutability, set-state-in-effect, …), and `no-explicit-any` are deliberately `warn` (~49 warnings repo-wide; CI fails above 100) — do not promote them to `error` until the underlying patterns are refactored, or CI breaks.
- Playwright screenshots: launch with `executablePath: '/opt/pw-browsers/chromium'`.

## Language (Bahasa Melayu, DBP standard) — maintain

UI text and commit messages are Bahasa Melayu; commits use conventional-commit prefixes with BM descriptions (e.g. `feat(bakat): …`). Settled terminology (HANDOFF §7): 'kemas kini' (two words) · 'pascaprogram' (joined) · UI says **'bukti'**, never 'evidence'/'evidens' (code identifiers and the DB table stay `evidence`) · imperatives with -kan (Pertikaikan, Paparkan) · 'daripada' for sources · 'baharu' for new · avoid '&' in prose · 'Faktor Masa' is the label for recency decay · the category value 'Akademik & Intelektual' must NOT be altered (stored value and mapping key).
