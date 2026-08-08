-- HoopLoop Platform 9: account accent color
-- Safe migration for the existing Version 7/8 Supabase project.

alter table public.profiles
  add column if not exists accent_color text not null default 'orange';

alter table public.profiles
  drop constraint if exists profiles_accent_color_check;

alter table public.profiles
  add constraint profiles_accent_color_check
  check (accent_color in ('orange','blue','green','purple','red','teal','gold'));

-- Existing "users update own profile" RLS policy already permits a signed-in
-- user to update their own profile row. No new policy is needed.

select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'accent_color';
