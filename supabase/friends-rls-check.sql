-- Globalio friends: check the security rules. Changes nothing.
--
-- Run it after supabase/friends-setup.sql: Supabase dashboard → SQL Editor →
-- New query, paste all of this, Run. (Or: psql "$DATABASE_URL" -f supabase/friends-rls-check.sql)
--
-- Inside one transaction that ends in ROLLBACK, it makes five throwaway
-- players: A (a public profile with a badge), B (a private profile), C (a
-- stranger with a public profile), D (a profile the owner hides) and E (an
-- account with no username). It then acts as each of them, and as a
-- signed-out visitor, the way the app does (the `authenticated` or `anon`
-- role, with the player's id in request.jwt.claims). It checks that nobody can
-- read or write the friendships table directly, that requests and answers only
-- go where they should, that a friend can see a private profile's stats and
-- nobody else can, that hidden profiles drop out, that the limits hold, and
-- that deleting an account deletes its friendships. The ROLLBACK at the end
-- undoes all of it.
--
-- Expected: every row says PASS, and the last row says "40 of 40 checks passed".

begin;

create temp table rls_check (n int primary key, test text not null, passed boolean not null, note text);
grant select, insert on rls_check to authenticated, anon;

-- Runs `stmt`, which must be refused with one of `states` (42501: not
-- allowed; 23505: a second row; 23514: a rule; P0001: refused by a friend
-- function, whose message must then be `message`). PASS when it is; it
-- working, or any other error, is a FAIL (with the reason in the note).
create function pg_temp.refused(n int, test text, stmt text, states text[], message text) returns void
language plpgsql as $$
begin
  execute stmt;
  insert into rls_check values (n, test, false, 'it was allowed');
exception when others then
  insert into rls_check values (n, test, sqlstate = any (states) and (message is null or sqlerrm = message),
    case when sqlstate = any (states) and (message is null or sqlerrm = message) then null else sqlstate || ': ' || sqlerrm end);
end $$;
grant execute on function pg_temp.refused(int, text, text, text[], text) to authenticated, anon;

insert into auth.users (id, aud, role, email)
values ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'rls-check-a@example.invalid'),
       ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'rls-check-b@example.invalid'),
       ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'rls-check-c@example.invalid'),
       ('00000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', 'rls-check-d@example.invalid'),
       ('00000000-0000-4000-8000-0000000000e5', 'authenticated', 'authenticated', 'rls-check-e@example.invalid');
insert into public.entitlements (user_id, supporter, badge)
values ('00000000-0000-4000-8000-0000000000a1', false, 'Founding player'),
       ('00000000-0000-4000-8000-0000000000b2', false, 'Private badge');
insert into public.profiles (user_id, username, is_public, picture, bio, stats)
values ('00000000-0000-4000-8000-0000000000a1', 'rlscheck_Alice', true, '{"kind": "flag", "code": "JP"}', 'Public bio', '{"v": 1, "flags": 12}'),
       ('00000000-0000-4000-8000-0000000000b2', 'rlscheck_Bob', false, '{"kind": "flag", "code": "FR"}', 'Private bio', '{"v": 1, "flags": 42, "bestStreak": 14}'),
       ('00000000-0000-4000-8000-0000000000c3', 'rlscheck_Carol', true, null, null, '{"v": 1, "flags": 3}'),
       ('00000000-0000-4000-8000-0000000000d4', 'rlscheck_Dave', true, null, null, '{}');
update public.profiles set hidden_by_owner = true where user_id = '00000000-0000-4000-8000-0000000000d4';

-- ── As player A: asks B ─────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

insert into rls_check select 1, 'A can ask B (a private profile) by username, any case', public.send_friend_request('RLSCHECK_BOB') = 'pending', null;
insert into rls_check select 2, 'Asking again changes nothing', public.send_friend_request('rlscheck_bob') = 'pending', null;

select pg_temp.refused(3, 'A cannot befriend themselves',
  $q$select public.send_friend_request('rlscheck_alice')$q$, '{P0001}', 'friend_self');
select pg_temp.refused(4, 'A cannot ask a profile the owner hid',
  $q$select public.send_friend_request('rlscheck_dave')$q$, '{P0001}', 'friend_not_found');
select pg_temp.refused(5, 'Asking a username nobody has says so',
  $q$select public.send_friend_request('rlscheck_nobody')$q$, '{P0001}', 'friend_not_found');
select pg_temp.refused(6, 'A cannot read the friendships table directly',
  $q$select 1 from public.friendships$q$, '{42501}', null);
select pg_temp.refused(7, 'A cannot write a friendship directly',
  $q$insert into public.friendships (requester, addressee, status, accepted_at) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c3', 'accepted', now())$q$, '{42501}', null);
select pg_temp.refused(8, 'A cannot read the request log',
  $q$select 1 from private.friend_request_log$q$, '{42501}', null);

insert into rls_check select 9, 'A cannot accept their own request', public.respond_friend_request('rlscheck_bob', true) = 'none', null;

insert into rls_check select 10, 'A sees the request as outgoing, without the private profile''s picture or badge',
  count(*) = 1 and coalesce(bool_and(username = 'rlscheck_Bob' and direction = 'outgoing' and picture is null and badge is null), false), null
  from public.friend_requests();

insert into rls_check select 11, 'Until B accepts, A cannot see B''s profile or stats',
  (select count(*) from public.get_friend('rlscheck_bob')) = 0 and (select count(*) from public.list_friends()) = 0, null;

-- ── As player B: accepts ────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

insert into rls_check select 12, 'B sees A''s request as incoming, with A''s picture and badge',
  count(*) = 1 and coalesce(bool_and(username = 'rlscheck_Alice' and direction = 'incoming' and picture ->> 'code' = 'JP' and badge = 'Founding player'), false), null
  from public.friend_requests();

insert into rls_check select 13, 'B accepts A''s request', public.respond_friend_request('rlscheck_alice', true) = 'accepted', null;

insert into rls_check select 14, 'B sees A among their friends, with A''s stats',
  count(*) = 1 and coalesce(bool_and(username = 'rlscheck_Alice' and stats ->> 'flags' = '12' and friends_since is not null), false), null
  from public.list_friends();

-- ── As player A: friends with B ─────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

insert into rls_check select 15, 'A sees B''s stats although B''s profile is private',
  count(*) = 1 and coalesce(bool_and(username = 'rlscheck_Bob' and stats ->> 'flags' = '42' and stats ->> 'bestStreak' = '14' and badge = 'Private badge'), false), null
  from public.list_friends();

insert into rls_check select 16, 'A can open B''s private profile as a friend',
  count(*) = 1 and coalesce(bool_and(bio = 'Private bio' and stats ->> 'flags' = '42'), false), null
  from public.get_friend('rlscheck_bob');

insert into rls_check select 17, 'get_player still shows nothing for B''s private profile',
  count(*) = 0, null from public.get_player('rlscheck_bob');

insert into rls_check select 18, 'Asking a friend again says accepted', public.send_friend_request('rlscheck_bob') = 'accepted', null;

insert into rls_check select 19, 'What friends get never holds an account id or email',
  coalesce(bool_and(not (to_jsonb(l) ?| array['user_id', 'email', 'id', 'requester', 'addressee', 'is_public', 'hidden_by_owner'])
    and to_jsonb(l)::text not like '%0000000000b2%' and to_jsonb(l)::text not like '%rls-check-b@%'), false)
  and not exists (select 1 from public.get_friend('rlscheck_bob') g where to_jsonb(g)::text like '%0000000000b2%' or to_jsonb(g)::text like '%rls-check-b@%')
  and not exists (select 1 from public.friend_requests() r where to_jsonb(r)::text like '%-8000-%'), null
  from public.list_friends() l;

-- ── As player C: a stranger ─────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);

insert into rls_check select 20, 'A stranger sees no friends and no requests',
  (select count(*) from public.list_friends()) = 0 and (select count(*) from public.friend_requests()) = 0, null;

insert into rls_check select 21, 'A stranger cannot open B''s private profile, or anyone''s through get_friend',
  (select count(*) from public.get_friend('rlscheck_bob')) = 0 and (select count(*) from public.get_friend('rlscheck_alice')) = 0, null;

select pg_temp.refused(22, 'A stranger cannot read the friendships table',
  $q$select 1 from public.friendships$q$, '{42501}', null);

-- C tries to end and to answer A and B's friendship (checked as the owner, test 23).
select public.remove_friend('rlscheck_bob'), public.respond_friend_request('rlscheck_alice', false);

insert into rls_check select 24, 'C asks A', public.send_friend_request('rlscheck_alice') = 'pending', null;

-- ── As player A: asking back accepts ────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

insert into rls_check select 25, 'A asks C, who asked first: they are friends', public.send_friend_request('rlscheck_carol') = 'accepted', null;

-- (A statement sees the friends list as it was when it began, so remove first.)
select public.remove_friend('rlscheck_carol');
insert into rls_check select 26, 'A can remove C again; B stays',
  count(*) = 1 and coalesce(bool_and(username = 'rlscheck_Bob'), false), null
  from public.list_friends();

-- ── Declining ───────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select public.send_friend_request('rlscheck_carol');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
insert into rls_check select 27, 'C can decline B''s request', public.respond_friend_request('rlscheck_bob', false) = 'none', null;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
insert into rls_check select 28, 'B no longer sees the declined request',
  count(*) = 0, null from public.friend_requests();

-- ── The limits ──────────────────────────────────────────────────────────────
reset role;
-- 50 requests from C already waiting (to 50 throwaway accounts).
create temp table extra_users as select gen_random_uuid() as id from generate_series(1, 50);
insert into auth.users (id, aud, role, email) select id, 'authenticated', 'authenticated', id || '@example.invalid' from extra_users;
insert into public.friendships (requester, addressee) select '00000000-0000-4000-8000-0000000000c3', id from extra_users;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
select pg_temp.refused(29, 'With 50 requests waiting, another is refused',
  $q$select public.send_friend_request('rlscheck_bob')$q$, '{P0001}', 'friend_limit: pending');

reset role;
delete from public.friendships where requester = '00000000-0000-4000-8000-0000000000c3' and addressee in (select id from extra_users);
-- C has asked A once (test 24); two more earlier asks make three in 30 days.
insert into private.friend_request_log (requester, addressee, sent_at)
values ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a1', now() - interval '20 days'),
       ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a1', now() - interval '10 days');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
select pg_temp.refused(30, 'Asking the same player a fourth time in 30 days is refused',
  $q$select public.send_friend_request('rlscheck_alice')$q$, '{P0001}', 'friend_rate_limited');

reset role;
insert into private.friend_request_log (requester, addressee)
select '00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000e5' from generate_series(1, 30);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
select pg_temp.refused(31, 'More than 30 requests in a day are refused',
  $q$select public.send_friend_request('rlscheck_bob')$q$, '{P0001}', 'friend_rate_limited');

-- ── E (no username) and D (hidden by the owner) ─────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e5", "role": "authenticated"}', true);
select pg_temp.refused(32, 'A player without a username cannot send requests',
  $q$select public.send_friend_request('rlscheck_alice')$q$, '{P0001}', 'friend_needs_username');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d4", "role": "authenticated"}', true);
select pg_temp.refused(33, 'A hidden profile cannot send requests',
  $q$select public.send_friend_request('rlscheck_alice')$q$, '{P0001}', 'friend_not_allowed');

reset role;
insert into public.friendships (requester, addressee, status, accepted_at)
values ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000a1', 'accepted', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
insert into rls_check select 34, 'A friend the owner hides drops out of the list and can''t be opened',
  (select count(*) from public.list_friends() where username = 'rlscheck_Dave') = 0
  and (select count(*) from public.get_friend('rlscheck_dave')) = 0, null;

-- ── As a signed-out visitor (the publishable key alone) ─────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select pg_temp.refused(35, 'Visitors cannot list friends or requests',
  $q$select * from public.list_friends() union all select username, picture, badge, null, null from public.friend_requests()$q$, '{42501}', null);
select pg_temp.refused(36, 'Visitors cannot send a friend request',
  $q$select public.send_friend_request('rlscheck_alice')$q$, '{42501}', null);
select pg_temp.refused(37, 'Visitors cannot read the friendships table',
  $q$select 1 from public.friendships$q$, '{42501}', null);

-- ── Back to the owner ───────────────────────────────────────────────────────
reset role;

insert into rls_check select 23, 'A stranger cannot end or answer someone else''s friendship',
  exists (select 1 from public.friendships where requester = '00000000-0000-4000-8000-0000000000a1'
            and addressee = '00000000-0000-4000-8000-0000000000b2' and status = 'accepted'), null;

select pg_temp.refused(38, 'The database keeps one row per pair, whichever way round',
  $q$insert into public.friendships (requester, addressee) values ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a1')$q$, '{23505}', null);
select pg_temp.refused(39, 'The database refuses a friendship with yourself',
  $q$insert into public.friendships (requester, addressee) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1')$q$, '{23514}', null);

-- C has a friend again, then deletes their account.
insert into public.friendships (requester, addressee, status, accepted_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c3', 'accepted', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
select public.delete_account();

reset role;
insert into rls_check select 40, 'Deleting an account deletes its friendships and request log, and no one else''s',
  not exists (select 1 from public.friendships where '00000000-0000-4000-8000-0000000000c3' in (requester, addressee))
  and not exists (select 1 from private.friend_request_log where '00000000-0000-4000-8000-0000000000c3' in (requester, addressee))
  and exists (select 1 from public.friendships where requester = '00000000-0000-4000-8000-0000000000a1' and addressee = '00000000-0000-4000-8000-0000000000b2'), null;

select n, test, case when passed then 'PASS' else 'FAIL' end as result, note from rls_check
union all
select 99, count(*) filter (where passed) || ' of ' || count(*) || ' checks passed',
       case when bool_and(passed) then 'PASS' else 'FAIL' end, null from rls_check
order by n;

rollback;
