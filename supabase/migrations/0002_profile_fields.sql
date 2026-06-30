-- JobWize profile enrichment
-- Adds the fields the profile page lets a user edit. Run after 0001_init.sql:
--   supabase db push
--
-- All columns are nullable so existing profile rows stay valid.

alter table public.profiles
  add column if not exists role text,
  add column if not exists company text,
  add column if not exists location text,
  add column if not exists bio text,
  add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at fresh on profile edits, reusing the helper from 0001.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
