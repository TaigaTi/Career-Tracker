-- JobWize initial schema
-- Run in the Supabase SQL editor, or via the Supabase CLI:
--   supabase db push
--
-- Provides: profiles (1:1 with auth.users), entries (accomplishment log),
-- row-level security so every user only ever sees their own data, and a
-- trigger that auto-creates a profile row when a user signs up.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by the owner" on public.profiles;
create policy "Profiles are viewable by the owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- entries (the accomplishment log)
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  metrics text,
  category text not null default 'achievement'
    check (category in (
      'achievement','project','skill','leadership',
      'recognition','collaboration','growth','other'
    )),
  impact text not null default 'moderate'
    check (impact in ('minor','moderate','major','milestone')),
  tags text[] not null default '{}',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_user_occurred_idx
  on public.entries (user_id, occurred_on desc);
create index if not exists entries_user_category_idx
  on public.entries (user_id, category);
create index if not exists entries_tags_idx
  on public.entries using gin (tags);

alter table public.entries enable row level security;

drop policy if exists "Users can read their own entries" on public.entries;
create policy "Users can read their own entries"
  on public.entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own entries" on public.entries;
create policy "Users can insert their own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own entries" on public.entries;
create policy "Users can update their own entries"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own entries" on public.entries;
create policy "Users can delete their own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- auto-create a profile when a new auth user is created
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
