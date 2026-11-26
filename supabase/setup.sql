-- Globalio accounts: one-time database setup.
--
-- Paste all of this into the Supabase dashboard → SQL Editor → New query, and
-- press Run. It creates what accounts need:
--
--   public.progress       each signed-in player's saved progress (one row per
--                         player; only that player can read or change it)
--   public.entitlements   Supporter / badges the owner grants; players can only
--                         read their own row, nobody can write it from the app
--   public.delete_account()  lets a player delete their own account (and with
--                         it their progress and entitlements)
--
-- It is the two files in supabase/migrations/ one after the other, unchanged.
-- Running it again is harmless: everything is created only if missing, or
-- replaced with the same definition. Nothing here deletes data.
--
-- The last query prints the tables and whether row level security is on.
-- Expected:
--
--   object             | kind     | rls_enabled | policies
--   delete_account()   | function |             |
--   entitlements       | table    | true        | 1
--   progress           | table    | true        | 4
--
-- To check the security rules afterwards, run supabase/rls-check.sql the same
-- way (it changes nothing).

-- ════════════════════════════════════════════════════════════════════════════
-- supabase/migrations/20261126100000_accounts.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Accounts: cross-device progress sync for Globalio.
--
-- progress      one row per player: their localStorage snapshot ({ key: string }).
--               Only the owner can read or write it (RLS).
-- entitlements  one row per player the owner has granted something to
--               (lifetime Supporter / a badge). Players can read their own row;
--               only the owner grants these, by SQL (see the end of this file).
-- delete_account()  lets a signed-in player delete their own account; the
--               foreign keys remove their progress and entitlements with it.
--
-- Safe to run more than once (supabase/setup.sql runs it by hand, and Supabase
-- may also apply supabase/migrations itself): everything is created only if
-- missing, or replaced with the same definition.

-- ── progress ────────────────────────────────────────────────────────────────

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint progress_data_is_object check (jsonb_typeof(data) = 'object'),
  -- A real save is tens of KB; 1 MB leaves room for Flag Studio designs and
  -- stops anyone using the table as free storage.
  constraint progress_data_size check (octet_length(data::text) <= 1048576)
);

comment on table public.progress is
  'Each player''s Globalio save: their localStorage snapshot as { key: string }. Owner-only (RLS).';

-- The server sets updated_at on every write, so clients can't fake it and can
-- use it as the row version (an update names the version it read, and does
-- nothing if another device saved in between).
create or replace function public.progress_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists progress_set_updated_at on public.progress;
create trigger progress_set_updated_at
  before insert or update on public.progress
  for each row execute function public.progress_set_updated_at();

alter table public.progress enable row level security;

drop policy if exists "Players read their own progress" on public.progress;
create policy "Players read their own progress"
  on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players create their own progress" on public.progress;
create policy "Players create their own progress"
  on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players update their own progress" on public.progress;
create policy "Players update their own progress"
  on public.progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players delete their own progress" on public.progress;
create policy "Players delete their own progress"
  on public.progress for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Only what the app uses: nothing for signed-out visitors, no TRUNCATE etc.
revoke all on table public.progress from anon, authenticated;
grant select, insert, update, delete on table public.progress to authenticated;

-- ── entitlements ────────────────────────────────────────────────────────────

create table if not exists public.entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  supporter  boolean not null default false,
  badge      text check (badge is null or char_length(badge) between 1 and 40),
  granted_at timestamptz default now()
);

comment on table public.entitlements is
  'What the owner has granted a player: lifetime Supporter (no ads) and an optional badge. Players can only read their own row.';

alter table public.entitlements enable row level security;

drop policy if exists "Players read their own entitlements" on public.entitlements;
create policy "Players read their own entitlements"
  on public.entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policy and no grant: players can't give themselves anything.
revoke all on table public.entitlements from anon, authenticated;
grant select on table public.entitlements to authenticated;

-- ── delete_account() ────────────────────────────────────────────────────────

-- (20261126100100_delete_account_private.sql replaces this with a wrapper
-- around a function in a private schema; the app's call stays the same.)
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  -- Cascades to public.progress and public.entitlements.
  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_account() is
  'Deletes the calling player''s account and, by cascade, their progress and entitlements.';

revoke all on function public.delete_account() from public, anon, authenticated;
grant execute on function public.delete_account() to authenticated;

-- ── Granting a player Supporter and a badge (run by the owner, in the SQL editor) ──
--
--   insert into public.entitlements (user_id, supporter, badge)
--   select id, true, 'Founding supporter' from auth.users where email = 'player@example.com'
--   on conflict (user_id) do update
--     set supporter = excluded.supporter, badge = excluded.badge, granted_at = now();

-- ════════════════════════════════════════════════════════════════════════════
-- supabase/migrations/20261126100100_delete_account_private.sql
-- ════════════════════════════════════════════════════════════════════════════

-- delete_account(): keep the privileged part out of the API.
--
-- The security advisor flags SECURITY DEFINER functions in an exposed schema
-- (lint 0029). The part that needs elevated rights (deleting from auth.users)
-- now lives in a private schema the API doesn't expose, and takes no
-- arguments: it only ever deletes the caller. public.delete_account() is a
-- plain SECURITY INVOKER wrapper, so the app's call stays the same:
-- POST /rest/v1/rpc/delete_account.
--
-- Safe to run more than once, like the migration before it.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.delete_current_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  -- Cascades to public.progress and public.entitlements.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function private.delete_current_user() from public, anon, authenticated;
grant execute on function private.delete_current_user() to authenticated;

create or replace function public.delete_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_current_user();
$$;

comment on function public.delete_account() is
  'Deletes the calling player''s account and, by cascade, their progress and entitlements.';

revoke all on function public.delete_account() from public, anon, authenticated;
grant execute on function public.delete_account() to authenticated;

-- The updated_at trigger function is never called directly.
revoke all on function public.progress_set_updated_at() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Check: the tables, row level security, and the delete function.
-- ════════════════════════════════════════════════════════════════════════════

select c.relname::text as object,
       'table' as kind,
       c.relrowsecurity::text as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)::text as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in ('progress', 'entitlements')
union all
select 'delete_account()', 'function', null, null
 where to_regprocedure('public.delete_account()') is not null
 order by kind, object;
