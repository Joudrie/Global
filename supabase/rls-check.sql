-- Globalio accounts: check the security rules. Changes nothing.
--
-- Run it after supabase/setup.sql: Supabase dashboard → SQL Editor → New
-- query, paste all of this, Run. (Or: psql "$DATABASE_URL" -f supabase/rls-check.sql)
--
-- Inside one transaction that ends in ROLLBACK, it makes two throwaway
-- players (A and B), then acts as each of them the way the app does: as the
-- `authenticated` role with their user id in request.jwt.claims. It checks
-- that a player can only read and write their own progress, can read but never
-- write their entitlements, that signed-out visitors can't touch either table,
-- and that delete_account() removes the caller and no one else. The ROLLBACK
-- at the end undoes all of it, the two players included.
--
-- Expected: every row says PASS, and the last row says "21 of 21 checks passed".

begin;

create temp table rls_check (n int primary key, test text not null, passed boolean not null, note text);
grant select, insert on rls_check to authenticated, anon;

-- Two throwaway players, with fixed ids so the checks can name them.
insert into auth.users (id, aud, role, email)
values ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'rls-check-a@example.invalid'),
       ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'rls-check-b@example.invalid');

-- As the owner: B already has progress; both have an entitlements row.
insert into public.progress (user_id, data)
values ('00000000-0000-4000-8000-0000000000b2', '{"dailyglobe_v1": "{\"learnedFlags\":[\"JP\"]}"}');
insert into public.entitlements (user_id, supporter, badge)
values ('00000000-0000-4000-8000-0000000000a1', false, null),
       ('00000000-0000-4000-8000-0000000000b2', true, 'RLS check');

-- ── As player A ─────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

-- The app's first save: a new row, with a made-up updated_at the server must replace.
insert into public.progress (user_id, data, updated_at)
values ('00000000-0000-4000-8000-0000000000a1', '{"dailyglobe_v1": "{\"learnedFlags\":[\"FR\"]}"}', '2000-01-01');

insert into rls_check select 1, 'A can create and read their own progress', count(*) = 1
  from public.progress where user_id = '00000000-0000-4000-8000-0000000000a1';

insert into rls_check select 2, 'The server sets updated_at (the row version), not the app', coalesce(bool_and(updated_at > '2001-01-01'), false)
  from public.progress where user_id = '00000000-0000-4000-8000-0000000000a1';

with u as (
  update public.progress set data = '{"dailyglobe_v1": "{\"learnedFlags\":[\"DE\",\"FR\"]}"}'
   where user_id = '00000000-0000-4000-8000-0000000000a1' returning 1)
insert into rls_check select 3, 'A can update their own progress', count(*) = 1 from u;

insert into rls_check select 4, 'A sees only their own progress row',
  count(*) = 1 and coalesce(bool_and(user_id = '00000000-0000-4000-8000-0000000000a1'), false) from public.progress;

insert into rls_check select 5, 'A cannot read B''s progress', count(*) = 0
  from public.progress where user_id = '00000000-0000-4000-8000-0000000000b2';

with u as (
  update public.progress set data = '{}' where user_id = '00000000-0000-4000-8000-0000000000b2' returning 1)
insert into rls_check select 6, 'A cannot change B''s progress', count(*) = 0 from u;

with d as (
  delete from public.progress where user_id = '00000000-0000-4000-8000-0000000000b2' returning 1)
insert into rls_check select 7, 'A cannot delete B''s progress', count(*) = 0 from d;

-- Each block below tries something that must be refused. Refused (insufficient
-- privilege / row level security) = PASS; it working, or any other error = FAIL.
do $$ begin
  insert into public.progress (user_id, data) values ('00000000-0000-4000-8000-0000000000b2', '{}');
  insert into rls_check values (8, 'A cannot save progress in B''s name', false, 'the insert was allowed');
exception
  when insufficient_privilege then insert into rls_check values (8, 'A cannot save progress in B''s name', true, null);
  when others then insert into rls_check values (8, 'A cannot save progress in B''s name', false, sqlerrm);
end $$;

do $$ begin
  update public.progress set user_id = '00000000-0000-4000-8000-0000000000b2'
   where user_id = '00000000-0000-4000-8000-0000000000a1';
  insert into rls_check values (9, 'A cannot hand their row to B', false, 'the update was allowed');
exception
  when insufficient_privilege then insert into rls_check values (9, 'A cannot hand their row to B', true, null);
  when others then insert into rls_check values (9, 'A cannot hand their row to B', false, sqlerrm);
end $$;

insert into rls_check select 10, 'A can read their own entitlements', count(*) = 1
  from public.entitlements where user_id = '00000000-0000-4000-8000-0000000000a1';

insert into rls_check select 11, 'A cannot read B''s entitlements', count(*) = 0
  from public.entitlements where user_id = '00000000-0000-4000-8000-0000000000b2';

do $$ begin
  update public.entitlements set supporter = true, badge = 'Self-made' where user_id = '00000000-0000-4000-8000-0000000000a1';
  insert into rls_check values (12, 'A cannot make themselves a Supporter', false, 'the update was allowed');
exception
  when insufficient_privilege then insert into rls_check values (12, 'A cannot make themselves a Supporter', true, null);
  when others then insert into rls_check values (12, 'A cannot make themselves a Supporter', false, sqlerrm);
end $$;

do $$ begin
  insert into public.entitlements (user_id, supporter) values ('00000000-0000-4000-8000-0000000000a1', true)
    on conflict (user_id) do update set supporter = true;
  insert into rls_check values (13, 'A cannot add entitlements', false, 'the insert was allowed');
exception
  when insufficient_privilege then insert into rls_check values (13, 'A cannot add entitlements', true, null);
  when others then insert into rls_check values (13, 'A cannot add entitlements', false, sqlerrm);
end $$;

do $$ begin
  delete from public.entitlements where user_id = '00000000-0000-4000-8000-0000000000a1';
  insert into rls_check values (14, 'A cannot remove entitlements', false, 'the delete was allowed');
exception
  when insufficient_privilege then insert into rls_check values (14, 'A cannot remove entitlements', true, null);
  when others then insert into rls_check values (14, 'A cannot remove entitlements', false, sqlerrm);
end $$;

-- ── As player B ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

insert into rls_check select 15, 'B sees only their own progress, unchanged by A',
  count(*) = 1 and coalesce(bool_and(user_id = '00000000-0000-4000-8000-0000000000b2' and data ->> 'dailyglobe_v1' like '%JP%'), false)
  from public.progress;

insert into rls_check select 16, 'B can read the Supporter badge granted to them',
  count(*) = 1 and coalesce(bool_and(supporter and badge = 'RLS check'), false) from public.entitlements;

-- ── As a signed-out visitor (the publishable key alone) ─────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$ begin
  perform 1 from public.progress;
  insert into rls_check values (17, 'Signed-out visitors cannot read progress', false, 'the select was allowed');
exception
  when insufficient_privilege then insert into rls_check values (17, 'Signed-out visitors cannot read progress', true, null);
  when others then insert into rls_check values (17, 'Signed-out visitors cannot read progress', false, sqlerrm);
end $$;

do $$ begin
  perform 1 from public.entitlements;
  insert into rls_check values (18, 'Signed-out visitors cannot read entitlements', false, 'the select was allowed');
exception
  when insufficient_privilege then insert into rls_check values (18, 'Signed-out visitors cannot read entitlements', true, null);
  when others then insert into rls_check values (18, 'Signed-out visitors cannot read entitlements', false, sqlerrm);
end $$;

do $$ begin
  perform public.delete_account();
  insert into rls_check values (19, 'Signed-out visitors cannot call delete_account()', false, 'the call was allowed');
exception
  when insufficient_privilege then insert into rls_check values (19, 'Signed-out visitors cannot call delete_account()', true, null);
  when others then insert into rls_check values (19, 'Signed-out visitors cannot call delete_account()', false, sqlerrm);
end $$;

-- ── Player A deletes their account ──────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

do $$ begin
  perform public.delete_account();
exception
  when others then insert into rls_check values (20, 'delete_account() removes the caller, their progress and entitlements', false, sqlerrm);
end $$;

-- ── Back to the owner, to look at what's left ───────────────────────────────
reset role;

insert into rls_check
select 20, 'delete_account() removes the caller, their progress and entitlements',
  not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000a1')
  and not exists (select 1 from public.progress where user_id = '00000000-0000-4000-8000-0000000000a1')
  and not exists (select 1 from public.entitlements where user_id = '00000000-0000-4000-8000-0000000000a1'), null
on conflict (n) do nothing;

insert into rls_check select 21, 'delete_account() leaves everyone else alone',
  exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b2')
  and exists (select 1 from public.progress where user_id = '00000000-0000-4000-8000-0000000000b2')
  and exists (select 1 from public.entitlements where user_id = '00000000-0000-4000-8000-0000000000b2'), null;

select n, test, case when passed then 'PASS' else 'FAIL' end as result, note from rls_check
union all
select 99, count(*) filter (where passed) || ' of ' || count(*) || ' checks passed',
       case when bool_and(passed) then 'PASS' else 'FAIL' end, null from rls_check
order by n;

rollback;
