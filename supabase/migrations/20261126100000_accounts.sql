-- Accounts: cross-device progress sync for Globalio.
--
-- progress      one row per player: their localStorage snapshot ({ key: string }).
--               Only the owner can read or write it (RLS).
-- entitlements  one row per player the owner has granted something to
--               (lifetime Supporter / a badge). Players can read their own row;
--               only the owner grants these, by SQL (see the end of this file).
-- delete_account()  lets a signed-in player delete their own account; the
--               foreign keys remove their progress and entitlements with it.

-- ── progress ────────────────────────────────────────────────────────────────

create table public.progress (
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
create function public.progress_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger progress_set_updated_at
  before insert or update on public.progress
  for each row execute function public.progress_set_updated_at();

alter table public.progress enable row level security;

create policy "Players read their own progress"
  on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players create their own progress"
  on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players update their own progress"
  on public.progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Players delete their own progress"
  on public.progress for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Only what the app uses: nothing for signed-out visitors, no TRUNCATE etc.
revoke all on table public.progress from anon, authenticated;
grant select, insert, update, delete on table public.progress to authenticated;

-- ── entitlements ────────────────────────────────────────────────────────────

create table public.entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  supporter  boolean not null default false,
  badge      text check (badge is null or char_length(badge) between 1 and 40),
  granted_at timestamptz default now()
);

comment on table public.entitlements is
  'What the owner has granted a player: lifetime Supporter (no ads) and an optional badge. Players can only read their own row.';

alter table public.entitlements enable row level security;

create policy "Players read their own entitlements"
  on public.entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policy and no grant: players can't give themselves anything.
revoke all on table public.entitlements from anon, authenticated;
grant select on table public.entitlements to authenticated;

-- ── delete_account() ────────────────────────────────────────────────────────

create function public.delete_account()
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
