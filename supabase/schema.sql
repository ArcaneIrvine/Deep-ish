-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Creates the two tables both apps read/write, scoped per-user via Row Level Security.

create table public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  category text,
  difficulty int,
  date_completed date not null default current_date,
  status text default 'completed',
  related_topics jsonb default '[]'::jsonb,
  overview text,
  key_ideas jsonb default '[]'::jsonb,
  beginner_resource text,
  advanced_resource text,
  estimated_minutes int,
  embedding jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, topic)
);

alter table public.history enable row level security;

create policy "select own history" on public.history
  for select using (auth.uid() = user_id);
create policy "insert own history" on public.history
  for insert with check (auth.uid() = user_id);
create policy "update own history" on public.history
  for update using (auth.uid() = user_id);

create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null,
  completed boolean not null default false,
  rerolled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_entries enable row level security;

create policy "select own daily entries" on public.daily_entries
  for select using (auth.uid() = user_id);
create policy "insert own daily entries" on public.daily_entries
  for insert with check (auth.uid() = user_id);
create policy "update own daily entries" on public.daily_entries
  for update using (auth.uid() = user_id);

-- Speeds up the streak query (looking up a user's completed dates).
create index daily_entries_user_date_idx on public.daily_entries (user_id, date);
