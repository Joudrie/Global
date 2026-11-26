-- delete_account(): keep the privileged part out of the API.
--
-- The security advisor flags SECURITY DEFINER functions in an exposed schema
-- (lint 0029). The part that needs elevated rights (deleting from auth.users)
-- now lives in a private schema the API doesn't expose, and takes no
-- arguments: it only ever deletes the caller. public.delete_account() is a
-- plain SECURITY INVOKER wrapper, so the app's call stays the same:
-- POST /rest/v1/rpc/delete_account.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.delete_current_user()
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
