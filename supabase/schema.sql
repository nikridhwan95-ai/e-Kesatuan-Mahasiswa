-- ============================================================================
-- PORTAL AKTIVITI PELAJAR UPM — Skema Supabase (Postgres)
-- Jalankan SEKALI dalam Supabase Dashboard → SQL Editor.
-- Selamat dijalankan semula (idempotent): guna IF NOT EXISTS / OR REPLACE.
--
-- Nota reka bentuk:
-- * Nama lajur camelCase (dipetik) supaya SAMA dengan jenis TypeScript aplikasi
--   — tiada lapisan pemetaan diperlukan dalam src/services/dataService.ts.
-- * Polisi RLS mencerminkan firestore.rules yang digantikan.
-- * IRON RULE Modul Bakat: hanya jadual evidence — skor TIDAK disimpan.
-- ============================================================================

-- ── Jadual ──────────────────────────────────────────────────────────────────

create table if not exists public.users (
  uid            text primary key,
  email          text not null,
  role           text not null default 'student',
  name           text not null default '',
  "displayName"  text,
  "photoURL"     text,
  "matricNumber" text,
  "phoneNumber"  text,
  college        text,
  faculty        text,
  "studyYear"    text,
  programme      text,
  address        text,
  positions      jsonb,
  "createdAt"    text
);

-- Lajur tambahan untuk pemasangan sedia ada (selamat diulang).
alter table public.users add column if not exists "studyYear" text;
alter table public.users add column if not exists programme text;
alter table public.users add column if not exists address text;

create table if not exists public.applications (
  id                      text primary key,
  "applicantId"           text not null,
  "applicantPosition"     text,
  title                   text not null,
  "startDate"             text,
  "endDate"               text,
  status                  text not null,
  budget                  numeric default 0,
  category                text,
  "organizingLevel"       text,
  "jointlyOrganizedWith"  text,
  "softSkills"            jsonb,
  objective               text,
  "academicSession"       text,
  semester                text,
  venue                   text,
  speaker                 text,
  "paperUrl"              text,
  "presentationSessionId" text,
  "presentationDate"      text,
  "presentationRoom"      numeric,
  "aiSummary"             jsonb,
  "reviewerComment"       text,
  "approvedAmount"        numeric,
  "createdAt"             text,
  "updatedAt"             text
);

create table if not exists public.reports (
  id                  text primary key default gen_random_uuid()::text,
  "applicationId"     text not null,
  "applicantId"       text not null,
  status              text not null,
  "reportUrl"         text,
  "receiptUrl"        text,
  "unionBudgetUsed"   numeric,
  "verifiedBudgetUsed" numeric,
  "participantCount"  numeric,
  "submittedAt"       text,
  "reviewedAt"        text,
  "reviewerComment"   text
);

create table if not exists public.presentation_sessions (
  id                text primary key default gen_random_uuid()::text,
  name              text not null,
  "academicSession" text,
  "roomCount"       numeric,
  date              text,
  time              text,
  link              text,
  status            text not null default 'Open'
);

-- Baris fleksibel: 'categories' | 'faculties' | 'colleges' → {list:[...]};
-- 'approvalLetter' → objek tetapan surat.
create table if not exists public.settings (
  id   text primary key,
  data jsonb not null default '{}'::jsonb
);

-- Modul Bakat — rekod evidence TIDAK BOLEH UBAH (IRON RULE: skor tidak disimpan).
create table if not exists public.evidence (
  id             text primary key,
  student_id     text not null,
  source_type    text not null,
  source_id      text not null,
  competency_id  text not null,
  points         numeric not null,
  weight_factors jsonb not null default '{}'::jsonb,
  ai_confidence  numeric,
  status         text not null default 'approved',
  approved_by    text,
  approved_at    text,
  superseded_by  text,
  narrative      text not null,
  event_date     text not null
);

create index if not exists idx_applications_applicant on public.applications ("applicantId");
create index if not exists idx_applications_status on public.applications (status);
create index if not exists idx_reports_applicant on public.reports ("applicantId");
create index if not exists idx_reports_application on public.reports ("applicationId");
create index if not exists idx_evidence_student on public.evidence (student_id);
create index if not exists idx_evidence_status on public.evidence (status);

-- ── Fungsi bantu RLS ────────────────────────────────────────────────────────
-- SECURITY DEFINER supaya semakan peranan tidak rekursif melalui RLS users.

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public
as $$
  select role from public.users where uid = (select auth.uid())::text
$$;

create or replace function public.is_management()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role from public.users where uid = (select auth.uid())::text)
      in ('unit_semakan','unit_pembentangan','unit_kertas_kerja','unit_pelaporan','admin','ydp','tnc_hepa'),
    false
  )
$$;

-- Peranan admin datang HANYA daripada users.role (dibenih di bahagian
-- 'Benih data' di bawah). JANGAN tambah semakan e-mel di sini: e-mel yang
-- dikod keras boleh didaftarkan sendiri oleh penyerang melalui API awam.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role from public.users where uid = (select auth.uid())::text) = 'admin',
    false
  )
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.applications enable row level security;
alter table public.reports enable row level security;
alter table public.presentation_sessions enable row level security;
alter table public.settings enable row level security;
alter table public.evidence enable row level security;

-- users
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (uid = (select auth.uid())::text or public.is_management());

-- Pengguna mencipta profil sendiri (peranan pelajar), ATAU admin mencipta
-- rekod pelajar bagi pihak pelajar (cth. melalui Import Excel).
drop policy if exists users_insert on public.users;
create policy users_insert on public.users for insert to authenticated
  with check (
    (uid = (select auth.uid())::text and (role = 'student' or public.is_admin()))
    or (public.is_admin() and role = 'student')
  );

-- Pengguna boleh kemaskini profil sendiri TANPA menukar peranan sendiri;
-- admin boleh kemaskini sesiapa sahaja (termasuk peranan).
drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (uid = (select auth.uid())::text or public.is_admin())
  with check (
    public.is_admin()
    or (uid = (select auth.uid())::text and role = public.my_role())
  );

-- applications
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications for select to authenticated
  using ("applicantId" = (select auth.uid())::text or public.is_management());

-- Pelajar memohon untuk diri sendiri, ATAU admin mengimport program lepas
-- bagi pihak pelajar (Import Excel).
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated
  with check ("applicantId" = (select auth.uid())::text or public.is_admin());

drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications for update to authenticated
  using (
    ("applicantId" = (select auth.uid())::text and status in ('Draf','Perlu Pembetulan'))
    or public.is_management()
  )
  with check ("applicantId" is not null);

drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications for delete to authenticated
  using (public.is_admin());

-- reports
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using ("applicantId" = (select auth.uid())::text or public.is_management());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check ("applicantId" = (select auth.uid())::text or public.is_management());

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update to authenticated
  using (
    ("applicantId" = (select auth.uid())::text and status in ('Tertunggak','Perlu Pembetulan'))
    or public.is_management()
  )
  with check ("applicantId" is not null);

drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports for delete to authenticated
  using (public.is_admin());

-- presentation_sessions
drop policy if exists sessions_select on public.presentation_sessions;
create policy sessions_select on public.presentation_sessions for select to authenticated
  using (true);

drop policy if exists sessions_write on public.presentation_sessions;
create policy sessions_write on public.presentation_sessions for all to authenticated
  using (public.is_management())
  with check (public.is_management());

-- settings
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated
  using (true);

drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.is_admin() or public.my_role() = 'unit_kertas_kerja')
  with check (public.is_admin() or public.my_role() = 'unit_kertas_kerja');

-- evidence (Modul Bakat)
drop policy if exists evidence_select on public.evidence;
create policy evidence_select on public.evidence for select to authenticated
  using (student_id = (select auth.uid())::text or public.is_management());

-- Evidence dijana oleh aliran kerja e-Kesatuan (pengesahan laporan oleh
-- Unit Pelaporan / backfill admin) — kedua-duanya peranan pengurusan.
drop policy if exists evidence_insert on public.evidence;
create policy evidence_insert on public.evidence for insert to authenticated
  with check (public.is_management());

-- Pelajar hanya boleh MEMPERTIKAI evidence sendiri (approved → disputed);
-- pengurusan boleh mengemaskini status (cth void/gantian).
drop policy if exists evidence_update on public.evidence;
create policy evidence_update on public.evidence for update to authenticated
  using (
    (student_id = (select auth.uid())::text and status = 'approved')
    or public.is_management()
  )
  with check (
    public.is_management()
    or (student_id = (select auth.uid())::text and status = 'disputed')
  );

drop policy if exists evidence_delete on public.evidence;
create policy evidence_delete on public.evidence for delete to authenticated
  using (public.is_admin());

-- ── Storage (muat naik kertas kerja, laporan, resit, kepala surat) ─────────
-- Baldi PERIBADI: fail mengandungi data peribadi pelajar (kertas kerja,
-- resit kewangan) dan dicapai melalui URL bertandatangan sahaja.
-- 'do update' menukar baldi awam sedia ada kepada peribadi apabila skrip
-- ini dijalankan semula — itulah migrasinya.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do update set public = false;

-- Baca (termasuk penjanaan URL bertandatangan) untuk sesi log masuk sahaja;
-- kunci anon TIDAK boleh menyenarai atau membaca objek.
drop policy if exists uploads_read on storage.objects;
create policy uploads_read on storage.objects for select to authenticated
  using (bucket_id = 'uploads');

-- Muat naik ke prefiks laluan yang dikenali sahaja.
drop policy if exists uploads_insert on storage.objects;
create policy uploads_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] in ('applications', 'reports', 'settings')
  );

-- Objek tidak boleh ditulis ganti (semua laluan muat naik unik dengan cap
-- masa); polisi update lama digugurkan dan tidak diganti.
drop policy if exists uploads_update on storage.objects;

-- Padam oleh admin sahaja.
drop policy if exists uploads_delete on storage.objects;
create policy uploads_delete on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and public.is_admin());

-- ── Benih data (idempotent) ─────────────────────────────────────────────────
-- Peranan admin untuk akaun portal kongsi. PRASYARAT: akaun auth
-- 'ekmupm@portal-bhep.upm.edu.my' mesti wujud dahulu (Dashboard →
-- Authentication → Users → Add user + Auto Confirm). Jika skrip ini
-- dijalankan sebelum akaun itu wujud, jalankan semula selepas menciptanya.

insert into public.users (uid, email, role, name, "createdAt")
select au.id::text, au.email, 'admin', 'Urus Setia BHEP UPM', now()::text
from auth.users au
where au.email = 'ekmupm@portal-bhep.upm.edu.my'
  and not exists (select 1 from public.users u where u.uid = au.id::text);

update public.users u
set role = 'admin'
from auth.users au
where u.uid = au.id::text
  and au.email = 'ekmupm@portal-bhep.upm.edu.my'
  and u.role <> 'admin';
