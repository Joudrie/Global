-- Globalio profiles: one-time database setup (after supabase/setup.sql).
--
-- Paste all of this into the Supabase dashboard → SQL Editor → New query, and
-- press Run. It adds what profiles need:
--
--   public.profiles        each player's username, profile look and stats; only
--                          that player can read or change their own row
--   private.username_words words usernames and bios may not use, reserved names
--   public.find_players()  search public profiles by the start of a username
--   public.get_player()    open one public profile by username
--
-- It is supabase/migrations/20261127100000_profiles.sql, unchanged, plus a
-- check at the end. Running it again is harmless: everything is created only
-- if missing, or replaced with the same definition. Nothing here deletes data.
--
-- The last query prints what was set up. Expected:
--
--   n | object               | status
--   1 | profiles             | row level security on, 4 policies
--   2 | signed-out visitors  | cannot read the table
--   3 | username_words       | 104 words
--   4 | find_players(prefix) | ready
--   5 | get_player(player)   | ready
--
-- Then switch profiles on in the app (PROFILES_LIVE in src/accounts.ts), or
-- try them first on any device with ?profiles=1. To check the security rules,
-- run supabase/profiles-rls-check.sql the same way (it changes nothing).

-- ════════════════════════════════════════════════════════════════════════════
-- supabase/migrations/20261127100000_profiles.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Profiles: a username, a public profile other players can look up, and the
-- profile's look (picture, banner, bio, pinned badges, chosen Flag Studio
-- designs) and stats.
--
-- public.profiles     one row per player who has claimed a username. Only that
--                     player can read or change their row (row level security);
--                     they can never change hidden_by_owner or created_at.
-- private.username_words  words usernames and bios may not use, and reserved
--                     names. The app keeps the same list (src/profile/words.ts);
--                     the owner can add words here at any time (see the end).
-- public.find_players(prefix)  up to 10 public profiles whose username starts
--                     with prefix: username, picture and badge only.
-- public.get_player(player)    one public profile by username (any case):
--                     username, picture, banner, bio, badge, pinned badges,
--                     designs, stats and when it was made. Never an account id
--                     or email. Private and hidden profiles aren't returned.
--
-- Both lookups work for signed-out visitors too. They are plain wrappers
-- around functions in the private schema, which the API doesn't expose (the
-- same pattern as delete_account()). Deleting an account deletes its profile
-- (the foreign key cascades).
--
-- stats is written by the player's own app (see src/profile/stats.ts for what
-- it holds). It is self-reported; nothing ranks players, so there is little
-- to gain by faking it.
--
-- Safe to run more than once, like the migrations before it.

create schema if not exists private;
revoke all on schema private from public;
-- Signed-out visitors need the schema for the two lookups; every function in
-- it says for itself who may run it.
grant usage on schema private to anon, authenticated;

-- ── Words usernames and bios may not use ───────────────────────────────────

create table if not exists private.username_words (
  word text not null check (word ~ '^[a-z]{2,30}$'),
  kind text not null check (kind in ('offensive_anywhere', 'offensive_word', 'reserved_word', 'reserved_anywhere')),
  primary key (word, kind)
);

comment on table private.username_words is
  'Words usernames and bios may not use (offensive_*) and names nobody may take (reserved_*). *_anywhere matches inside a word; *_word only a whole word. Same list as src/profile/words.ts.';

revoke all on table private.username_words from public, anon, authenticated;

insert into private.username_words (word, kind) values
  -- offensive_anywhere
  ('fuck', 'offensive_anywhere'), ('shit', 'offensive_anywhere'), ('cunt', 'offensive_anywhere'),
  ('nigger', 'offensive_anywhere'), ('nigga', 'offensive_anywhere'),
  ('faggot', 'offensive_anywhere'), ('fagot', 'offensive_anywhere'),
  ('retard', 'offensive_anywhere'), ('whore', 'offensive_anywhere'),
  ('slut', 'offensive_anywhere'), ('bitch', 'offensive_anywhere'),
  ('bastard', 'offensive_anywhere'), ('asshole', 'offensive_anywhere'),
  ('arsehole', 'offensive_anywhere'), ('dickhead', 'offensive_anywhere'),
  ('cocksucker', 'offensive_anywhere'), ('wanker', 'offensive_anywhere'),
  ('twat', 'offensive_anywhere'), ('penis', 'offensive_anywhere'),
  ('vagina', 'offensive_anywhere'), ('pussy', 'offensive_anywhere'),
  ('dildo', 'offensive_anywhere'), ('jizz', 'offensive_anywhere'),
  ('cumshot', 'offensive_anywhere'), ('porn', 'offensive_anywhere'),
  ('hentai', 'offensive_anywhere'), ('blowjob', 'offensive_anywhere'),
  ('handjob', 'offensive_anywhere'), ('molest', 'offensive_anywhere'),
  ('pedophile', 'offensive_anywhere'), ('paedophile', 'offensive_anywhere'),
  ('hitler', 'offensive_anywhere'), ('neonazi', 'offensive_anywhere'),
  ('kkk', 'offensive_anywhere'), ('wetback', 'offensive_anywhere'),
  ('tranny', 'offensive_anywhere'), ('kike', 'offensive_anywhere'),
  ('bollock', 'offensive_anywhere'), ('killyourself', 'offensive_anywhere'),
  -- offensive_word
  ('ass', 'offensive_word'), ('arse', 'offensive_word'), ('fag', 'offensive_word'),
  ('fags', 'offensive_word'), ('cum', 'offensive_word'), ('tit', 'offensive_word'),
  ('tits', 'offensive_word'), ('dick', 'offensive_word'), ('cock', 'offensive_word'),
  ('sex', 'offensive_word'), ('anal', 'offensive_word'), ('homo', 'offensive_word'),
  ('spic', 'offensive_word'), ('chink', 'offensive_word'), ('coon', 'offensive_word'),
  ('paki', 'offensive_word'), ('negro', 'offensive_word'), ('dyke', 'offensive_word'),
  ('rape', 'offensive_word'), ('rapist', 'offensive_word'), ('pedo', 'offensive_word'),
  ('paedo', 'offensive_word'), ('nazi', 'offensive_word'), ('nazis', 'offensive_word'),
  ('wank', 'offensive_word'), ('boob', 'offensive_word'), ('boobs', 'offensive_word'),
  ('kys', 'offensive_word'), ('spaz', 'offensive_word'), ('heil', 'offensive_word'),
  ('thot', 'offensive_word'),
  -- reserved_word
  ('admin', 'reserved_word'), ('administrator', 'reserved_word'), ('mod', 'reserved_word'),
  ('mods', 'reserved_word'), ('moderator', 'reserved_word'), ('globalio', 'reserved_word'),
  ('support', 'reserved_word'), ('staff', 'reserved_word'), ('official', 'reserved_word'),
  ('sean', 'reserved_word'), ('joudrie', 'reserved_word'), ('root', 'reserved_word'),
  ('system', 'reserved_word'), ('null', 'reserved_word'), ('undefined', 'reserved_word'),
  ('help', 'reserved_word'), ('team', 'reserved_word'), ('owner', 'reserved_word'),
  ('dev', 'reserved_word'), ('developer', 'reserved_word'), ('api', 'reserved_word'),
  ('www', 'reserved_word'), ('anonymous', 'reserved_word'), ('guest', 'reserved_word'),
  ('deleted', 'reserved_word'), ('unknown', 'reserved_word'), ('everyone', 'reserved_word'),
  ('nobody', 'reserved_word'), ('test', 'reserved_word'), ('username', 'reserved_word'),
  -- reserved_anywhere
  ('globalio', 'reserved_anywhere'), ('joudrie', 'reserved_anywhere'),
  ('moderator', 'reserved_anywhere'), ('administrator', 'reserved_anywhere')
on conflict (word, kind) do nothing;

-- Why a username (username = true) or a bio can't be used: 'offensive',
-- 'reserved' (usernames only) or null when it's fine. The same matching as
-- src/profile/text.ts: lower case; split into words (a username at "_", and
-- also read whole without them; a bio at anything not a letter or digit); each
-- word read with leetspeak undone (1 as i, then as l) and with digits
-- dropped; a word with no repeated letter, 4+ long, also matches stretched out.
create or replace function private.text_problem(input text, username boolean)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  low text := lower(coalesce(input, ''));
  words text[];
  w text;
  f text;
  c text;
  r record;
  stretch boolean;
begin
  if username then
    words := array_remove(string_to_array(low, '_'), '') || replace(low, '_', '');
  else
    words := array_remove(regexp_split_to_array(low, '[^a-z0-9]+'), '');
  end if;
  if coalesce(cardinality(words), 0) = 0 then
    return null;
  end if;
  for r in
    select word, kind from private.username_words
     where username or kind like 'offensive%'
     order by kind like 'reserved%', word
  loop
    stretch := char_length(r.word) >= 4 and r.word !~ '(.)\1';
    foreach w in array words loop
      foreach f in array array[translate(w, '01345789', 'oieastbg'), translate(w, '01345789', 'oleastbg'), regexp_replace(w, '[0-9]', '', 'g')] loop
        continue when f = '';
        c := regexp_replace(f, '(.)\1+', '\1', 'g');
        if (r.kind like '%anywhere' and (strpos(f, r.word) > 0 or (stretch and strpos(c, r.word) > 0)))
           or (r.kind like '%word' and (f = r.word or (stretch and c = r.word))) then
          return case when r.kind like 'offensive%' then 'offensive' else 'reserved' end;
        end if;
      end loop;
    end loop;
  end loop;
  return null;
end;
$$;

revoke all on function private.text_problem(text, boolean) from public, anon, authenticated;

-- ── profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  username        text not null,
  -- Usernames are unique whatever the case ("Ann" and "ann" are one).
  username_key    text generated always as (lower(username)) stored,
  is_public       boolean not null default true,
  -- Set by the owner (see the end of this file) to hide an abusive profile.
  hidden_by_owner boolean not null default false,
  -- { "kind": "flag", "code": "JP" } or { "kind": "design", "design": "<Flag Studio share code>" }
  picture         jsonb,
  banner          text,
  bio             text,
  pinned          text[] not null default '{}',
  -- Flag Studio share codes (no names, no uploaded pictures), newest first.
  designs         jsonb not null default '[]'::jsonb,
  stats           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$' and username ~ '[A-Za-z0-9]'),
  constraint profiles_picture_shape check (picture is null or (
    jsonb_typeof(picture) = 'object' and octet_length(picture::text) <= 8500 and (
      (picture->>'kind' = 'flag' and coalesce(picture->>'code', '') ~ '^[A-Z]{2}$') or
      (picture->>'kind' = 'design' and coalesce(picture->>'design', '') ~ '^[A-Za-z0-9_-]+$' and char_length(picture->>'design') <= 8000)))),
  -- A preset ("nordic") or a country's flag ("flag:JP"), see src/profile/banners.ts.
  constraint profiles_banner_shape check (banner is null or banner ~ '^([a-z0-9-]{1,24}|flag:[A-Z]{2})$'),
  constraint profiles_bio_shape check (bio is null or (char_length(bio) <= 120 and bio !~* '(https?:|www\.|://)')),
  constraint profiles_pinned_shape check (cardinality(pinned) <= 3 and array_position(pinned, null) is null
    and array_to_string(pinned, ',') ~ '^([a-z0-9-]{1,40}(,|$))*$'),
  constraint profiles_designs_shape check (jsonb_typeof(designs) = 'array' and jsonb_array_length(designs) <= 32
    and octet_length(designs::text) <= 131072
    and not jsonb_path_exists(designs, '$[*] ? (@.type() != "string" || !(@ like_regex "^[A-Za-z0-9_-]+$"))')),
  constraint profiles_stats_shape check (jsonb_typeof(stats) = 'object' and octet_length(stats::text) <= 8192)
);

-- Flag banners came after the first version of this table: give a table made
-- before them the same banner check (dropped and added again, so running this
-- twice is harmless; every banner already stored still passes).
alter table public.profiles drop constraint if exists profiles_banner_shape;
alter table public.profiles add constraint profiles_banner_shape check (banner is null or banner ~ '^([a-z0-9-]{1,24}|flag:[A-Z]{2})$');

comment on table public.profiles is
  'Each player''s profile: username, look and stats. Owner-only (RLS); others read public ones through find_players() and get_player().';

-- Unique whatever the case; text_pattern_ops also serves the prefix search.
create unique index if not exists profiles_username_key on public.profiles (username_key text_pattern_ops);

-- The server sets the times, and checks usernames and bios against the word
-- list. The owner can skip the check for one edit (see the end of this file).
create or replace function private.profiles_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  problem text;
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'INSERT' then
    new.created_at := new.updated_at;
  end if;
  if coalesce(current_setting('globalio.owner_edit', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' or new.username is distinct from old.username then
    problem := private.text_problem(new.username, true);
    if problem is not null then
      raise exception 'username_not_allowed: %', problem using errcode = '23514';
    end if;
  end if;
  if new.bio is not null and (tg_op = 'INSERT' or new.bio is distinct from old.bio) then
    if private.text_problem(new.bio, false) is not null then
      raise exception 'bio_not_allowed' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.profiles_before_write() from public, anon, authenticated;

drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function private.profiles_before_write();

alter table public.profiles enable row level security;

drop policy if exists "Players read their own profile" on public.profiles;
create policy "Players read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players create their own profile" on public.profiles;
create policy "Players create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players update their own profile" on public.profiles;
create policy "Players update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players delete their own profile" on public.profiles;
create policy "Players delete their own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Only what the app uses. Nothing for signed-out visitors (they use the two
-- lookups), and players can't touch hidden_by_owner, created_at or updated_at.
revoke all on table public.profiles from anon, authenticated;
grant select, delete on table public.profiles to authenticated;
grant insert (user_id, username, is_public, picture, banner, bio, pinned, designs, stats) on table public.profiles to authenticated;
grant update (username, is_public, picture, banner, bio, pinned, designs, stats) on table public.profiles to authenticated;

-- ── The public lookups ──────────────────────────────────────────────────────

create or replace function private.find_players(prefix text)
returns table (username text, picture jsonb, badge text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.picture, e.badge
    from public.profiles p
    left join public.entitlements e on e.user_id = p.user_id
   where p.is_public and not p.hidden_by_owner
     and coalesce(prefix, '') ~ '^[A-Za-z0-9_]{1,20}$'
     -- "_" is a wildcard in LIKE; match it literally.
     and p.username_key like replace(lower(prefix), '_', '\_') || '%'
   order by p.username_key = lower(prefix) desc, p.username_key
   limit 10;
$$;

create or replace function private.get_player(player text)
returns table (username text, picture jsonb, banner text, bio text, badge text, pinned text[], designs jsonb, stats jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.picture, p.banner, p.bio, e.badge, p.pinned, p.designs, p.stats, p.created_at
    from public.profiles p
    left join public.entitlements e on e.user_id = p.user_id
   where p.is_public and not p.hidden_by_owner
     and p.username_key = lower(coalesce(player, ''))
   limit 1;
$$;

revoke all on function private.find_players(text) from public, anon, authenticated;
revoke all on function private.get_player(text) from public, anon, authenticated;
grant execute on function private.find_players(text) to anon, authenticated;
grant execute on function private.get_player(text) to anon, authenticated;

create or replace function public.find_players(prefix text)
returns table (username text, picture jsonb, badge text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.find_players(prefix);
$$;

create or replace function public.get_player(player text)
returns table (username text, picture jsonb, banner text, bio text, badge text, pinned text[], designs jsonb, stats jsonb, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_player(player);
$$;

comment on function public.find_players(text) is
  'Up to 10 public profiles whose username starts with prefix (any case): username, picture, badge.';
comment on function public.get_player(text) is
  'One public profile by username (any case). Private and hidden profiles are not returned; never an account id or email.';

revoke all on function public.find_players(text) from public, anon, authenticated;
revoke all on function public.get_player(text) from public, anon, authenticated;
grant execute on function public.find_players(text) to anon, authenticated;
grant execute on function public.get_player(text) to anon, authenticated;

-- Tell the API about the new table and functions now.
notify pgrst, 'reload schema';

-- ── For the owner, in the SQL editor ────────────────────────────────────────
--
-- Hide a profile (nobody can find or open it; the player keeps it and sees a
-- note that it's hidden). Undo with false.
--   update public.profiles set hidden_by_owner = true where username_key = lower('TheirName');
--
-- Rename a profile (the new name skips the word check for this one edit):
--   begin;
--   set local globalio.owner_edit = 'on';
--   update public.profiles set username = 'player_4821' where username_key = lower('TheirName');
--   commit;
--
-- Clear a bio:
--   update public.profiles set bio = null where username_key = lower('TheirName');
--
-- Give a player a badge (shown on their profile; keeps Supporter as it was):
--   insert into public.entitlements (user_id, badge)
--   select user_id, 'Founding player' from public.profiles where username_key = lower('TheirName')
--   on conflict (user_id) do update set badge = excluded.badge, granted_at = now();
--
-- Block another word (offensive_word: whole word; offensive_anywhere: inside
-- any word; reserved_word: nobody may take it as a username):
--   insert into private.username_words (word, kind) values ('someword', 'offensive_word') on conflict do nothing;
--
-- Who owns a username (to answer an email):
--   select p.username, u.email from public.profiles p join auth.users u on u.id = p.user_id
--    where p.username_key = lower('TheirName');

-- ════════════════════════════════════════════════════════════════════════════
-- Check: the table, its security, the word list and the two lookups.
-- ════════════════════════════════════════════════════════════════════════════

select 1 as n, 'profiles' as object,
       'row level security ' || case when c.relrowsecurity then 'on' else 'OFF' end || ', '
       || (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'profiles') || ' policies' as status
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
 where s.nspname = 'public' and c.relname = 'profiles'
union all
select 2, 'signed-out visitors',
       case when has_table_privilege('anon', 'public.profiles', 'select') then 'CAN READ THE TABLE (run the setup again)'
            else 'cannot read the table' end
union all
select 3, 'username_words', count(*) || ' words' from private.username_words
union all
select 4, 'find_players(prefix)',
       case when has_function_privilege('anon', 'public.find_players(text)', 'execute') then 'ready' else 'NOT callable' end
union all
select 5, 'get_player(player)',
       case when has_function_privilege('anon', 'public.get_player(text)', 'execute') then 'ready' else 'NOT callable' end
 order by n;
