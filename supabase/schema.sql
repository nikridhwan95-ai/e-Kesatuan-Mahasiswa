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

-- Pelajar memohon untuk diri sendiri (status permulaan sahaja — tiada
-- kelulusan kendiri), ATAU pengurusan/admin mengimport program lepas bagi
-- pihak pelajar (Import Excel, sebarang status).
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated
  with check (
    public.is_management()
    or ("applicantId" = (select auth.uid())::text and status in ('Draf', 'Menunggu Semakan'))
  );

drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications for update to authenticated
  using (
    ("applicantId" = (select auth.uid())::text and status in ('Draf','Perlu Pembetulan'))
    or public.is_management()
  )
  with check (
    "applicantId" = (select auth.uid())::text
    or public.is_management()
  );

drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications for delete to authenticated
  using (public.is_admin());

-- reports
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using ("applicantId" = (select auth.uid())::text or public.is_management());

-- Pelajar menghantar laporan sendiri (status permulaan sahaja — tiada
-- pengesahan kendiri); pengurusan bebas (pengesahan, import).
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (
    public.is_management()
    or ("applicantId" = (select auth.uid())::text and status in ('Tertunggak', 'Dihantar'))
  );

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update to authenticated
  using (
    ("applicantId" = (select auth.uid())::text and status in ('Tertunggak','Perlu Pembetulan'))
    or public.is_management()
  )
  with check (
    "applicantId" = (select auth.uid())::text
    or public.is_management()
  );

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

-- ── Integriti data: trigger kawalan + kekangan ─────────────────────────────
-- Trigger BEFORE UPDATE menghalang pemalsuan medan dan lompatan status oleh
-- akaun bukan pengurusan (pertahanan dalam kedalaman di sebalik RLS; bersedia
-- untuk akaun pelajar individu pada masa hadapan).

create or replace function public.guard_application_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_management() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new."applicantId" is distinct from old."applicantId"
     or new."approvedAmount" is distinct from old."approvedAmount"
     or new."reviewerComment" is distinct from old."reviewerComment"
     or new."presentationSessionId" is distinct from old."presentationSessionId"
     or new."presentationDate" is distinct from old."presentationDate"
     or new."presentationRoom" is distinct from old."presentationRoom"
     or new."createdAt" is distinct from old."createdAt" then
    raise exception 'Medan terkawal permohonan tidak boleh diubah oleh pemohon';
  end if;
  if old.status not in ('Draf', 'Perlu Pembetulan')
     or new.status not in ('Draf', 'Perlu Pembetulan', 'Menunggu Semakan', 'Menunggu Semakan Pindaan', 'Dibatalkan') then
    raise exception 'Peralihan status permohonan tidak dibenarkan';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_application_update on public.applications;
create trigger trg_guard_application_update
  before update on public.applications
  for each row execute function public.guard_application_update();

create or replace function public.guard_report_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_management() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new."applicationId" is distinct from old."applicationId"
     or new."applicantId" is distinct from old."applicantId"
     or new."verifiedBudgetUsed" is distinct from old."verifiedBudgetUsed"
     or new."reviewedAt" is distinct from old."reviewedAt"
     or new."reviewerComment" is distinct from old."reviewerComment" then
    raise exception 'Medan terkawal laporan tidak boleh diubah oleh pemohon';
  end if;
  if old.status not in ('Tertunggak', 'Perlu Pembetulan')
     or new.status not in ('Tertunggak', 'Perlu Pembetulan', 'Dihantar') then
    raise exception 'Peralihan status laporan tidak dibenarkan';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_report_update on public.reports;
create trigger trg_guard_report_update
  before update on public.reports
  for each row execute function public.guard_report_update();

-- IRON RULE di peringkat DB: bukti tidak boleh diubah. Hanya status (dan
-- superseded_by, oleh pengurusan) boleh berubah selepas rekod wujud.
create or replace function public.guard_evidence_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.student_id is distinct from old.student_id
     or new.source_type is distinct from old.source_type
     or new.source_id is distinct from old.source_id
     or new.competency_id is distinct from old.competency_id
     or new.points is distinct from old.points
     or new.weight_factors is distinct from old.weight_factors
     or new.ai_confidence is distinct from old.ai_confidence
     or new.narrative is distinct from old.narrative
     or new.event_date is distinct from old.event_date
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at then
    raise exception 'Bukti tidak boleh diubah — hanya status boleh bertukar';
  end if;
  if not public.is_management()
     and new.superseded_by is distinct from old.superseded_by then
    raise exception 'Bukti tidak boleh diubah — hanya status boleh bertukar';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_evidence_update on public.evidence;
create trigger trg_guard_evidence_update
  before update on public.evidence
  for each row execute function public.guard_evidence_update();

-- ── Kunci asing (ditambah NOT VALID; pengesahan berasingan supaya baris ────
-- lama yang yatim tidak menggagalkan keseluruhan skrip).
--
-- SEMAKAN PRA-JALANAN (jalankan dahulu; mana-mana baris = yatim yang perlu
-- dibersihkan sebelum VALIDATE berjaya — kekangan tetap melindungi baris
-- BAHARU walaupun pengesahan gagal):
--   select r.id from public.reports r
--     left join public.applications a on a.id = r."applicationId"
--     where a.id is null;
--   select a.id from public.applications a
--     left join public.users u on u.uid = a."applicantId"
--     where u.uid is null;
--   select e.id from public.evidence e
--     left join public.users u on u.uid = e.student_id
--     where u.uid is null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reports_application_fk') then
    alter table public.reports add constraint reports_application_fk
      foreign key ("applicationId") references public.applications(id)
      on delete cascade not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'applications_applicant_fk') then
    alter table public.applications add constraint applications_applicant_fk
      foreign key ("applicantId") references public.users(uid)
      on delete restrict not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'evidence_student_fk') then
    alter table public.evidence add constraint evidence_student_fk
      foreign key (student_id) references public.users(uid)
      on delete restrict not valid;
  end if;
end $$;

-- TIADA kunci asing pada evidence.source_id: rujukan polimorfik — bukti
-- manual/pengesahan masa hadapan akan merujuk sumber selain applications.

do $$ begin
  alter table public.reports validate constraint reports_application_fk;
exception when others then
  raise notice 'reports_application_fk belum disahkan: %', sqlerrm;
end $$;

do $$ begin
  alter table public.applications validate constraint applications_applicant_fk;
exception when others then
  raise notice 'applications_applicant_fk belum disahkan: %', sqlerrm;
end $$;

do $$ begin
  alter table public.evidence validate constraint evidence_student_fk;
exception when others then
  raise notice 'evidence_student_fk belum disahkan: %', sqlerrm;
end $$;

-- ── Kekangan CHECK (nilai status/peranan mesti sepadan dengan union literal
-- dalam src/types.ts) — NOT VALID supaya data lama tidak menghalang skrip.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_role_chk') then
    alter table public.users add constraint users_role_chk check (
      role in ('student', 'unit_semakan', 'unit_pembentangan', 'unit_kertas_kerja',
               'unit_pelaporan', 'admin', 'ydp', 'tnc_hepa')
    ) not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'applications_status_chk') then
    alter table public.applications add constraint applications_status_chk check (
      status in ('Draf', 'Menunggu Semakan', 'Perlu Pembetulan', 'Menunggu Pembentangan',
                 'Menunggu Kelulusan YDP', 'Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya',
                 'Ditolak', 'Dibatalkan', 'Menunggu Semakan Pindaan',
                 'Menunggu Kelulusan YDP (Pindaan)')
    ) not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reports_status_chk') then
    alter table public.reports add constraint reports_status_chk check (
      status in ('Tertunggak', 'Dihantar', 'Disahkan', 'Perlu Pembetulan')
    ) not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'evidence_status_chk') then
    alter table public.evidence add constraint evidence_status_chk check (
      status in ('pending', 'approved', 'disputed', 'void')
    ) not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_status_chk') then
    alter table public.presentation_sessions add constraint sessions_status_chk check (
      status in ('Open', 'Closed')
    ) not valid;
  end if;
end $$;

-- ── Indeks UNIK (e-mel; matrik jika diisi) ─────────────────────────────────
-- SEMAKAN PRA-JALANAN duplikat (bersihkan/gabungkan mana-mana baris dahulu):
--   select lower(email), count(*) from public.users
--     group by lower(email) having count(*) > 1;
--   select "matricNumber", count(*) from public.users
--     where "matricNumber" is not null
--     group by "matricNumber" having count(*) > 1;

do $$ begin
  create unique index if not exists users_email_uq on public.users (lower(email));
exception when others then
  raise notice 'users_email_uq tidak dicipta (duplikat wujud?): %', sqlerrm;
end $$;

do $$ begin
  create unique index if not exists users_matric_uq on public.users ("matricNumber")
    where "matricNumber" is not null;
exception when others then
  raise notice 'users_matric_uq tidak dicipta (duplikat wujud?): %', sqlerrm;
end $$;

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
