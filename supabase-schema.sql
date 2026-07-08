-- ============================================================
-- Tech4Good — student login + progress schema
-- Paste this whole file into the Supabase SQL Editor and Run it.
-- (Dashboard → SQL Editor → New query → paste → Run)
-- Safe to run more than once.
-- ============================================================

-- ---- Profiles: one row per student, tied to the auth user ----
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text,                                 -- student's first name
  last_name    text,                                 -- student's last name
  display_name text not null,                         -- "First Last" (kept for older code)
  badges       jsonb not null default '[]'::jsonb,   -- array of earned badge keys
  updated_at   timestamptz default now()
);

-- If the profiles table already existed from an earlier version, bring it up to date.
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name  text;

-- The class-code idea was dropped (it only added friction). Remove the old
-- column and the now-unused classes table if they linger from a previous setup.
alter table public.profiles drop column if exists class_code;
drop table if exists public.classes;

-- ---- Row Level Security ----
alter table public.profiles enable row level security;

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

-- ============================================================
-- TEACHER VIEW (optional): see everyone's progress at a glance.
-- Run this query in the SQL Editor whenever you want a report.
--
--   select first_name, last_name,
--          jsonb_array_length(badges) as badges_earned,
--          badges, updated_at
--   from public.profiles
--   order by badges_earned desc, updated_at desc;
-- ============================================================
