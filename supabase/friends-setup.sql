-- Globalio friends: one-time database setup (after supabase/profiles-setup.sql).
--
-- Paste all of this into the Supabase dashboard → SQL Editor → New query, and
-- press Run. It adds what friends need:
--
--   public.friendships        who asked whom, and whether they are friends yet;
--                             nobody reads it directly, only the functions below
--   public.send_friend_request(player)          ask a player by username
--   public.respond_friend_request(player, accept)  accept or decline a request
--   public.remove_friend(player)                unfriend, or cancel a request
--   public.list_friends()     your friends, with their stats (even when private)
--   public.friend_requests()  requests waiting, to you and from you
--   public.get_friend(player) a friend's profile, even when it is private
--
-- It is supabase/migrations/20261127200000_friends.sql, unchanged, plus a
-- check at the end. Running it again is harmless: everything is created only
-- if missing, or replaced with the same definition. Nothing here deletes data
-- (apart from friend request notes older than 30 days, when someone sends one).
--
-- The last query prints what was set up. Expected:
--
--   n | object              | status
--   1 | friendships         | row level security on, 1 policy
--   2 | signed-out visitors | cannot see friends
--   3 | players             | only through the friend functions
--   4 | friend functions    | 6 of 6 ready
--
-- Nothing to switch on in the app: it notices the functions and shows Friends
-- on the You tab by itself (reload the page). To check the security rules,
-- run supabase/friends-rls-check.sql the same way (it changes nothing).

-- ════════════════════════════════════════════════════════════════════════════
-- supabase/migrations/20261127200000_friends.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Friends: mutual friendships between players who have a username. Friends
-- can see each other's stats and profile, even when a profile is private.
-- There are no followers: both players have to agree.
--
-- public.friendships  one row per pair of players, whichever way round: who
--                     asked (requester), who was asked (addressee), 'pending'
--                     until the addressee accepts, then 'accepted'. Nobody can
--                     befriend themselves. The app never reads or writes the
--                     table itself: the functions below do everything, and row
--                     level security (only the two players) is a second lock.
-- private.friend_request_log  when each request was sent, kept 30 days, so
--                     nobody sends more than 30 a day or asks the same player
--                     more than 3 times in 30 days.
--
-- public.send_friend_request(player)   ask a player, by username (any case).
--                     If they already asked you, this accepts their request.
--                     Returns 'pending' or 'accepted'.
-- public.respond_friend_request(player, accept)  accept or decline a request
--                     they sent you. Returns 'accepted' or 'none'.
-- public.remove_friend(player)  unfriend, cancel your request or decline
--                     theirs. Returns 'none'.
-- public.list_friends()  your friends: username, picture, badge, stats and
--                     when you became friends. Stats even when their profile
--                     is private.
-- public.friend_requests()  requests waiting: 'incoming' (to you) and
--                     'outgoing' (from you). A private profile you asked shows
--                     its username only, until it accepts.
-- public.get_friend(player)  a friend's whole profile (the same columns as
--                     get_player), even when it is private.
--
-- Signed-in players only; never an account id or email. A profile hidden by
-- the owner (hidden_by_owner) can't send or get requests and drops out of
-- everyone's lists. Limits: 50 requests waiting from you, 200 waiting for
-- you, 500 friends. A friend list is only ever shown to its owner. Deleting an
-- account deletes its friendships and its request log (the foreign keys
-- cascade).
--
-- Needs the profiles migration first (20261127100000_profiles.sql). Safe to
-- run more than once, like the migrations before it.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Run supabase/profiles-setup.sql first: friends need profiles.';
  end if;
end;
$$;

create schema if not exists private;
grant usage on schema private to authenticated;

-- ── friendships ─────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  requester   uuid not null references auth.users (id) on delete cascade,
  addressee   uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester, addressee),
  constraint friendships_not_self check (requester <> addressee),
  constraint friendships_status check (status in ('pending', 'accepted')),
  constraint friendships_accepted_at check ((status = 'accepted') = (accepted_at is not null))
);

comment on table public.friendships is
  'Mutual friendships: requester asked addressee; pending until accepted. One row per pair. Read and written only through the friend functions.';

-- One row per pair, whichever way round (A asked B, or B asked A).
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
-- "Who asked me" (the primary key already covers "who did I ask").
create index if not exists friendships_addressee on public.friendships (addressee, status);

alter table public.friendships enable row level security;

drop policy if exists "Players read their own friendships" on public.friendships;
create policy "Players read their own friendships"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));

-- No grants at all: the friend functions are the only way in, so not even the
-- two players see the raw rows (which hold account ids).
revoke all on table public.friendships from public, anon, authenticated;

-- ── The request log (rate limits) ───────────────────────────────────────────

create table if not exists private.friend_request_log (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  sent_at   timestamptz not null default now()
);

comment on table private.friend_request_log is
  'When each friend request was sent, for the rate limits. Rows older than 30 days are deleted by send_friend_request.';

create index if not exists friend_request_log_requester on private.friend_request_log (requester, sent_at);
create index if not exists friend_request_log_sent_at on private.friend_request_log (sent_at);

revoke all on table private.friend_request_log from public, anon, authenticated;

-- ── Helpers (not callable from the app) ─────────────────────────────────────

-- The account behind a username (any case), or null. Hidden profiles only
-- when include_hidden (to unfriend or decline them).
create or replace function private.player_id(player text, include_hidden boolean)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id
    from public.profiles p
   where p.username_key = lower(coalesce(player, ''))
     and (include_hidden or not p.hidden_by_owner)
   limit 1;
$$;

-- Refuses when either player already has 500 friends.
create or replace function private.check_friend_room(me uuid, them uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.friendships f where f.status = 'accepted' and me in (f.requester, f.addressee)) >= 500 then
    raise exception 'friend_limit: friends' using errcode = 'P0001';
  end if;
  if (select count(*) from public.friendships f where f.status = 'accepted' and them in (f.requester, f.addressee)) >= 500 then
    raise exception 'friend_limit: their_friends' using errcode = 'P0001';
  end if;
end;
$$;

-- One change at a time per pair, so two players asking each other at the same
-- moment end up friends instead of stuck.
create or replace function private.lock_friend_pair(a uuid, b uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('globalio.friends:' || least(a, b)::text || ':' || greatest(a, b)::text, 0));
$$;

revoke all on function private.player_id(text, boolean) from public, anon, authenticated;
revoke all on function private.check_friend_room(uuid, uuid) from public, anon, authenticated;
revoke all on function private.lock_friend_pair(uuid, uuid) from public, anon, authenticated;

-- ── Changing friendships ────────────────────────────────────────────────────

create or replace function private.send_friend_request(player text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = me) then
    raise exception 'friend_needs_username' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles p where p.user_id = me and p.hidden_by_owner) then
    raise exception 'friend_not_allowed' using errcode = 'P0001';
  end if;
  them := private.player_id(player, false);
  if them is null then
    raise exception 'friend_not_found' using errcode = 'P0001';
  end if;
  if them = me then
    raise exception 'friend_self' using errcode = 'P0001';
  end if;

  -- One request at a time from each player (so the limits hold), then the pair.
  perform pg_advisory_xact_lock(hashtextextended('globalio.friends.from:' || me::text, 0));
  perform private.lock_friend_pair(me, them);

  select * into existing from public.friendships f
   where (f.requester = me and f.addressee = them) or (f.requester = them and f.addressee = me);
  if found then
    if existing.status = 'accepted' then
      return 'accepted';
    end if;
    if existing.requester = me then
      return 'pending';
    end if;
    -- They asked first: asking back accepts.
    perform private.check_friend_room(me, them);
    update public.friendships f set status = 'accepted', accepted_at = now()
     where f.requester = them and f.addressee = me;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships f where f.requester = me and f.status = 'pending') >= 50 then
    raise exception 'friend_limit: pending' using errcode = 'P0001';
  end if;
  if (select count(*) from public.friendships f where f.addressee = them and f.status = 'pending') >= 200 then
    raise exception 'friend_limit: theirs' using errcode = 'P0001';
  end if;
  perform private.check_friend_room(me, them);

  delete from private.friend_request_log l where l.sent_at < now() - interval '30 days';
  if (select count(*) from private.friend_request_log l where l.requester = me and l.sent_at > now() - interval '1 day') >= 30 then
    raise exception 'friend_rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from private.friend_request_log l where l.requester = me and l.addressee = them) >= 3 then
    raise exception 'friend_rate_limited' using errcode = 'P0001';
  end if;

  insert into public.friendships (requester, addressee) values (me, them);
  insert into private.friend_request_log (requester, addressee) values (me, them);
  return 'pending';
end;
$$;

create or replace function private.respond_friend_request(player text, accept boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  -- Declining works on a hidden profile too; accepting doesn't.
  them := private.player_id(player, not coalesce(accept, false));
  if them is null or them = me then
    return 'none';
  end if;
  perform private.lock_friend_pair(me, them);

  select * into existing from public.friendships f where f.requester = them and f.addressee = me;
  if not found then
    -- They cancelled, or you asked each other and are friends already.
    return case when exists (select 1 from public.friendships f
                              where f.requester = me and f.addressee = them and f.status = 'accepted')
                then 'accepted' else 'none' end;
  end if;
  if existing.status = 'accepted' then
    return 'accepted';
  end if;
  if coalesce(accept, false) then
    perform private.check_friend_room(me, them);
    update public.friendships f set status = 'accepted', accepted_at = now()
     where f.requester = them and f.addressee = me;
    return 'accepted';
  end if;
  delete from public.friendships f where f.requester = them and f.addressee = me;
  return 'none';
end;
$$;

create or replace function private.remove_friend(player text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  them := private.player_id(player, true);
  if them is null or them = me then
    return 'none';
  end if;
  perform private.lock_friend_pair(me, them);
  delete from public.friendships f
   where (f.requester = me and f.addressee = them) or (f.requester = them and f.addressee = me);
  return 'none';
end;
$$;

-- ── Reading them (only ever the caller's own) ───────────────────────────────

create or replace function private.list_friends()
returns table (username text, picture jsonb, badge text, stats jsonb, friends_since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.picture, e.badge, p.stats, f.accepted_at
    from public.friendships f
    join public.profiles p
      on p.user_id = case when f.requester = (select auth.uid()) then f.addressee else f.requester end
    left join public.entitlements e on e.user_id = p.user_id
   where f.status = 'accepted'
     and (select auth.uid()) in (f.requester, f.addressee)
     and not p.hidden_by_owner
   order by p.username_key
   limit 500;
$$;

create or replace function private.friend_requests()
returns table (username text, picture jsonb, badge text, direction text, sent_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username,
         -- Someone who asks you shows their picture; a private profile you
         -- asked shows only the username you typed until it accepts.
         case when f.addressee = (select auth.uid()) or p.is_public then p.picture end,
         case when f.addressee = (select auth.uid()) or p.is_public then e.badge end,
         case when f.addressee = (select auth.uid()) then 'incoming' else 'outgoing' end,
         f.created_at
    from public.friendships f
    join public.profiles p
      on p.user_id = case when f.requester = (select auth.uid()) then f.addressee else f.requester end
    left join public.entitlements e on e.user_id = p.user_id
   where f.status = 'pending'
     and (select auth.uid()) in (f.requester, f.addressee)
     and not p.hidden_by_owner
   order by f.created_at desc
   limit 250;
$$;

create or replace function private.get_friend(player text)
returns table (username text, picture jsonb, banner text, bio text, badge text, pinned text[], designs jsonb, stats jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.picture, p.banner, p.bio, e.badge, p.pinned, p.designs, p.stats, p.created_at
    from public.profiles p
    join public.friendships f
      on f.status = 'accepted'
     and ((f.requester = (select auth.uid()) and f.addressee = p.user_id)
       or (f.addressee = (select auth.uid()) and f.requester = p.user_id))
    left join public.entitlements e on e.user_id = p.user_id
   where not p.hidden_by_owner
     and p.username_key = lower(coalesce(player, ''))
   limit 1;
$$;

revoke all on function private.send_friend_request(text) from public, anon, authenticated;
revoke all on function private.respond_friend_request(text, boolean) from public, anon, authenticated;
revoke all on function private.remove_friend(text) from public, anon, authenticated;
revoke all on function private.list_friends() from public, anon, authenticated;
revoke all on function private.friend_requests() from public, anon, authenticated;
revoke all on function private.get_friend(text) from public, anon, authenticated;
grant execute on function private.send_friend_request(text) to authenticated;
grant execute on function private.respond_friend_request(text, boolean) to authenticated;
grant execute on function private.remove_friend(text) to authenticated;
grant execute on function private.list_friends() to authenticated;
grant execute on function private.friend_requests() to authenticated;
grant execute on function private.get_friend(text) to authenticated;

-- ── What the app calls: thin wrappers in public ─────────────────────────────

create or replace function public.send_friend_request(player text)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.send_friend_request(player);
$$;

create or replace function public.respond_friend_request(player text, accept boolean)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.respond_friend_request(player, accept);
$$;

create or replace function public.remove_friend(player text)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.remove_friend(player);
$$;

create or replace function public.list_friends()
returns table (username text, picture jsonb, badge text, stats jsonb, friends_since timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_friends();
$$;

create or replace function public.friend_requests()
returns table (username text, picture jsonb, badge text, direction text, sent_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.friend_requests();
$$;

create or replace function public.get_friend(player text)
returns table (username text, picture jsonb, banner text, bio text, badge text, pinned text[], designs jsonb, stats jsonb, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_friend(player);
$$;

comment on function public.send_friend_request(text) is
  'Ask a player (by username) to be friends; accepts instead if they already asked you. Returns pending or accepted.';
comment on function public.respond_friend_request(text, boolean) is
  'Accept or decline the friend request a player sent you. Returns accepted or none.';
comment on function public.remove_friend(text) is
  'Unfriend a player, cancel your request to them, or decline theirs.';
comment on function public.list_friends() is
  'The caller''s friends: username, picture, badge, stats (even for a private profile) and since when.';
comment on function public.friend_requests() is
  'Friend requests waiting: incoming (to the caller) and outgoing (from the caller).';
comment on function public.get_friend(text) is
  'A friend''s profile by username, even when it is private. Nothing for anyone who isn''t a friend.';

revoke all on function public.send_friend_request(text) from public, anon, authenticated;
revoke all on function public.respond_friend_request(text, boolean) from public, anon, authenticated;
revoke all on function public.remove_friend(text) from public, anon, authenticated;
revoke all on function public.list_friends() from public, anon, authenticated;
revoke all on function public.friend_requests() from public, anon, authenticated;
revoke all on function public.get_friend(text) from public, anon, authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(text, boolean) to authenticated;
grant execute on function public.remove_friend(text) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.friend_requests() to authenticated;
grant execute on function public.get_friend(text) to authenticated;

-- Tell the API about the new functions now.
notify pgrst, 'reload schema';

-- ── For the owner, in the SQL editor ────────────────────────────────────────
--
-- A player's friends and requests (to answer an email):
--   select a.username as requester, b.username as addressee, f.status, f.created_at, f.accepted_at
--     from public.friendships f
--     join public.profiles a on a.user_id = f.requester
--     join public.profiles b on b.user_id = f.addressee
--    where lower('TheirName') in (a.username_key, b.username_key);
--
-- End a friendship or a request between two players:
--   delete from public.friendships f
--    using public.profiles a, public.profiles b
--    where a.username_key = lower('NameOne') and b.username_key = lower('NameTwo')
--      and ((f.requester = a.user_id and f.addressee = b.user_id) or (f.requester = b.user_id and f.addressee = a.user_id));

-- ════════════════════════════════════════════════════════════════════════════
-- Check: the table, its security and the six functions.
-- ════════════════════════════════════════════════════════════════════════════

select 1 as n, 'friendships' as object,
       'row level security ' || case when c.relrowsecurity then 'on' else 'OFF' end || ', '
       || (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'friendships')
       || ' policy' as status
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
 where s.nspname = 'public' and c.relname = 'friendships'
union all
select 2, 'signed-out visitors',
       case when has_table_privilege('anon', 'public.friendships', 'select')
              or has_function_privilege('anon', 'public.list_friends()', 'execute')
              or has_function_privilege('anon', 'public.send_friend_request(text)', 'execute')
            then 'CAN SEE FRIENDS (run the setup again)' else 'cannot see friends' end
union all
select 3, 'players',
       case when has_table_privilege('authenticated', 'public.friendships', 'select')
            then 'CAN READ THE TABLE (run the setup again)' else 'only through the friend functions' end
union all
select 4, 'friend functions',
       (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace
         where s.nspname = 'public'
           and p.proname in ('send_friend_request', 'respond_friend_request', 'remove_friend', 'list_friends', 'friend_requests', 'get_friend')
           and has_function_privilege('authenticated', p.oid, 'execute'))
       || ' of 6 ready'
 order by n;
