-- Globalio profiles: check the security rules. Changes nothing.
--
-- Run it after supabase/profiles-setup.sql: Supabase dashboard → SQL Editor →
-- New query, paste all of this, Run. (Or: psql "$DATABASE_URL" -f supabase/profiles-rls-check.sql)
--
-- Inside one transaction that ends in ROLLBACK, it makes three throwaway
-- players: A (a public profile with a badge), B (a private profile) and C (a
-- public profile the owner hides). It then acts as each of them, and as a
-- signed-out visitor, the way the app does (the `authenticated` or `anon`
-- role, with the player's id in request.jwt.claims). It checks that a player
-- can only write their own profile and only the fields the app uses, that the
-- username, bio and banner rules hold in the database, that a visitor can read public
-- profiles only through find_players() and get_player() and never sees a
-- private or hidden profile, an account id or an email, and that deleting an
-- account deletes its profile. The ROLLBACK at the end undoes all of it.
--
-- Expected: every row says PASS, and the last row says "36 of 36 checks passed".

begin;

create temp table rls_check (n int primary key, test text not null, passed boolean not null, note text);
grant select, insert on rls_check to authenticated, anon;

-- Runs `stmt`, which must be refused with one of `states` (42501: not
-- allowed; 23514: a rule; 23505: taken). PASS when it is; it working, or any
-- other error, is a FAIL (with the reason in the note).
create function pg_temp.refused(n int, test text, stmt text, states text[]) returns void
language plpgsql as $$
begin
  execute stmt;
  insert into rls_check values (n, test, false, 'it was allowed');
exception when others then
  insert into rls_check values (n, test, sqlstate = any (states), case when sqlstate = any (states) then null else sqlstate || ': ' || sqlerrm end);
end $$;
grant execute on function pg_temp.refused(int, text, text, text[]) to authenticated, anon;

insert into auth.users (id, aud, role, email)
values ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'rls-check-a@example.invalid'),
       ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'rls-check-b@example.invalid'),
       ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'rls-check-c@example.invalid');
insert into public.entitlements (user_id, supporter, badge)
values ('00000000-0000-4000-8000-0000000000a1', false, 'Founding player'),
       ('00000000-0000-4000-8000-0000000000c3', false, 'Hidden badge');

-- ── As player A ─────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

insert into public.profiles (user_id, username, picture, banner, bio, pinned, stats)
values ('00000000-0000-4000-8000-0000000000a1', 'rlscheck_Alice', '{"kind": "flag", "code": "JP"}', 'waves',
        'Learning every flag.', '{daily-first}', '{"v": 1, "flags": 12}');

insert into rls_check select 1, 'A can claim a username (their own profile)', count(*) = 1
  from public.profiles where user_id = '00000000-0000-4000-8000-0000000000a1';

insert into rls_check select 2, 'The server sets created_at and updated_at', coalesce(bool_and(created_at > '2001-01-01' and updated_at >= created_at), false)
  from public.profiles where user_id = '00000000-0000-4000-8000-0000000000a1';

select pg_temp.refused(3, 'A cannot make a profile in B''s name',
  $q$insert into public.profiles (user_id, username) values ('00000000-0000-4000-8000-0000000000b2', 'rlscheck_fake')$q$, '{42501}');
select pg_temp.refused(4, 'A cannot hide or unhide a profile (hidden_by_owner)',
  $q$update public.profiles set hidden_by_owner = true where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{42501}');
select pg_temp.refused(5, 'A cannot change when their profile was made',
  $q$update public.profiles set created_at = '2000-01-01' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{42501}');
select pg_temp.refused(6, 'An offensive username is refused (leetspeak too)',
  $q$update public.profiles set username = 'rlscheck_sh1t' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(7, 'A stretched-out offensive username is refused',
  $q$update public.profiles set username = 'FUUUCK_maps' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(8, 'A reserved username is refused (Admin with digits)',
  $q$update public.profiles set username = 'Admin_2' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(9, 'A username with Globalio in it is refused',
  $q$update public.profiles set username = 'globalio_fan' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(10, 'A username that is too short is refused',
  $q$update public.profiles set username = 'ab' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(11, 'A username with a space or symbol is refused',
  $q$update public.profiles set username = 'has space!' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(12, 'A username over 20 characters is refused',
  $q$update public.profiles set username = 'abcdefghijklmnopqrstu' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(13, 'An offensive bio is refused',
  $q$update public.profiles set bio = 'no sh1t' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(14, 'A bio with a link is refused',
  $q$update public.profiles set bio = 'visit www.example.com' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(15, 'A bio over 120 characters is refused',
  $q$update public.profiles set bio = repeat('a', 121) where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(16, 'Stats over 8 KB are refused',
  $q$update public.profiles set stats = jsonb_build_object('junk', repeat('x', 9000)) where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(17, 'More than 3 pinned badges are refused',
  $q$update public.profiles set pinned = '{a,b,c,d}' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(18, 'A picture that isn''t a flag or a design is refused',
  $q$update public.profiles set picture = '{"kind": "photo", "url": "https://example.com/me.jpg"}' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');
select pg_temp.refused(19, 'More than 32 designs are refused',
  $q$update public.profiles set designs = (select jsonb_agg('abc'::text) from generate_series(1, 33)) where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');

select pg_temp.refused(35, 'A banner that isn''t a preset or a country''s flag is refused',
  $q$update public.profiles set banner = 'flag:jp' where user_id = '00000000-0000-4000-8000-0000000000a1'$q$, '{23514}');

with u as (
  update public.profiles set bio = 'Flags and maps.', stats = '{"v": 1, "flags": 40}', designs = '["eyJiIjoic3RyaXBlcyJ9"]'
   where user_id = '00000000-0000-4000-8000-0000000000a1' returning 1)
insert into rls_check select 20, 'A can update their own bio, stats and designs', count(*) = 1 from u;

with u as (
  update public.profiles set banner = 'flag:JP' where user_id = '00000000-0000-4000-8000-0000000000a1' returning 1)
insert into rls_check select 36, 'A can choose a country''s flag as their banner', count(*) = 1 from u;

-- ── As player B: a private profile ──────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

select pg_temp.refused(21, 'Usernames are unique whatever the case',
  $q$insert into public.profiles (user_id, username) values ('00000000-0000-4000-8000-0000000000b2', 'RLSCHECK_ALICE')$q$, '{23505}');

insert into public.profiles (user_id, username, is_public, bio) values ('00000000-0000-4000-8000-0000000000b2', 'rlscheck_bob', false, 'Private bio');

insert into rls_check select 22, 'B sees only their own profile', count(*) = 1 and coalesce(bool_and(username = 'rlscheck_bob'), false) from public.profiles;

with u as (update public.profiles set bio = 'changed by B' where user_id = '00000000-0000-4000-8000-0000000000a1' returning 1)
insert into rls_check select 23, 'B cannot change A''s profile', count(*) = 0 from u;

with d as (delete from public.profiles where user_id = '00000000-0000-4000-8000-0000000000a1' returning 1)
insert into rls_check select 24, 'B cannot delete A''s profile', count(*) = 0 from d;

-- ── As player C: a public profile, then hidden by the owner ─────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
insert into public.profiles (user_id, username) values ('00000000-0000-4000-8000-0000000000c3', 'rlscheck_carol');
reset role;
update public.profiles set hidden_by_owner = true where user_id = '00000000-0000-4000-8000-0000000000c3';

-- ── As a signed-out visitor (the publishable key alone) ─────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select pg_temp.refused(25, 'Visitors cannot read the profiles table', $q$select 1 from public.profiles$q$, '{42501}');
select pg_temp.refused(26, 'Visitors cannot write a profile',
  $q$insert into public.profiles (user_id, username) values ('00000000-0000-4000-8000-0000000000b2', 'rlscheck_anon')$q$, '{42501}');
select pg_temp.refused(27, 'Visitors cannot read the word list', $q$select 1 from private.username_words$q$, '{42501}');

insert into rls_check select 28, 'find_players finds a public profile by the start of its name, any case',
  count(*) = 1 and coalesce(bool_and(username = 'rlscheck_Alice' and badge = 'Founding player' and picture ->> 'code' = 'JP'), false)
  from public.find_players('RLSCHECK_a');

insert into rls_check select 29, 'find_players never returns a private or hidden profile',
  count(*) = 1 from public.find_players('rlscheck');

insert into rls_check select 30, 'In a search, _ is a letter, not a wildcard', count(*) = 0 from public.find_players('rlscheck_alic_');

insert into rls_check select 31, 'get_player opens a public profile with its badge and bio',
  count(*) = 1 and coalesce(bool_and(bio = 'Flags and maps.' and badge = 'Founding player' and stats ->> 'flags' = '40' and banner = 'flag:JP'), false)
  from public.get_player('RLSCHECK_ALICE');

insert into rls_check select 32, 'get_player shows nothing for a private or a hidden profile',
  (select count(*) from public.get_player('rlscheck_bob')) = 0 and (select count(*) from public.get_player('rlscheck_carol')) = 0, null;

insert into rls_check select 33, 'What visitors get never holds an account id or email',
  coalesce(bool_and(not (to_jsonb(g) ?| array['user_id', 'email', 'id', 'hidden_by_owner', 'is_public'])), false)
  and not exists (select 1 from public.get_player('rlscheck_alice') g2 where to_jsonb(g2)::text like '%rls-check-a@%' or to_jsonb(g2)::text like '%0000000000a1%')
  from public.get_player('rlscheck_alice') g;

-- ── Player A deletes their account ──────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.delete_account();

reset role;
insert into rls_check select 34, 'Deleting an account deletes its profile, and only that one',
  not exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-0000000000a1')
  and (select count(*) from public.profiles where username like 'rlscheck_%') = 2, null;

select n, test, case when passed then 'PASS' else 'FAIL' end as result, note from rls_check
union all
select 99, count(*) filter (where passed) || ' of ' || count(*) || ' checks passed',
       case when bool_and(passed) then 'PASS' else 'FAIL' end, null from rls_check
order by n;

rollback;
