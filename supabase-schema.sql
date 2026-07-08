-- ============================================================
-- Tech4Good — student login + progress schema
-- Paste this whole file into the Supabase SQL Editor and Run it.
-- (Dashboard → SQL Editor → New query → paste → Run)
-- Safe to run more than once.
-- ============================================================

-- ---- Classes: the codes a teacher hands out so students can join ----
create table if not exists public.classes (
  code       text primary key,          -- e.g. 'NUNGUA26' (kids type this at signup)
  name       text not null,             -- human label, e.g. 'Nungua Warm-Up 2026'
  created_at timestamptz default now()
);

-- ---- Profiles: one row per student, tied to the auth user ----
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  class_code   text references public.classes(code),
  badges       jsonb not null default '[]'::jsonb,  -- array of earned badge keys
  updated_at   timestamptz default now()
);

-- ---- Row Level Security ----
alter table public.classes  enable row level security;
alter table public.profiles enable row level security;

-- Anyone (even signed-out) may read class codes, so signup can validate them.
drop policy if exists "classes are readable" on public.classes;
create policy "classes are readable" on public.classes
  for select using (true);

-- A student may read / create / update ONLY their own profile row.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- Seed one class code so the site works immediately ----
-- Add more rows here (or from the Table Editor) to open new classes.
insert into public.classes (code, name) values
  ('NUNGUA26', 'Nungua Warm-Up 2026')
on conflict (code) do nothing;

-- ============================================================
-- TEACHER VIEW (optional): see everyone's progress at a glance.
-- Run these queries in the SQL Editor whenever you want a report.
--
--   select display_name, class_code,
--          jsonb_array_length(badges) as badges_earned,
--          badges, updated_at
--   from public.profiles
--   order by badges_earned desc, updated_at desc;
-- ============================================================
