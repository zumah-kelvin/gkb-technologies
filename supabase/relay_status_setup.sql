-- Secure relay_01 control for the Relay Test website and read-only ESP32 polling.
-- Run this in the Supabase SQL Editor before enabling control on the live site.

alter table public.relay_status
  add column if not exists owner_id uuid references auth.users(id);

alter table public.relay_status enable row level security;

-- Replace every existing policy on this dedicated relay table with the
-- restrictive policies below, so no earlier permissive policy remains.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'relay_status'
  loop
    execute format(
      'drop policy if exists %I on public.relay_status',
      existing_policy.policyname
    );
  end loop;
end;
$$;

-- The ESP32 uses the publishable key to read the relay state only.
-- Browser users may read/update only a row assigned to their Supabase Auth user.
revoke all on table public.relay_status from public, anon, authenticated;
grant select (device_id, state, updated_at) on table public.relay_status to anon;
grant select on table public.relay_status to authenticated;
grant update (state, updated_at) on table public.relay_status to authenticated;

create policy relay_01_anon_read
  on public.relay_status
  for select
  to anon
  using (device_id = 'relay_01');

create policy relay_01_owner_read
  on public.relay_status
  for select
  to authenticated
  using (device_id = 'relay_01' and owner_id = (select auth.uid()));

create policy relay_01_owner_update
  on public.relay_status
  for update
  to authenticated
  using (device_id = 'relay_01' and owner_id = (select auth.uid()))
  with check (device_id = 'relay_01' and owner_id = (select auth.uid()));

-- After registering your account through the website's Supabase sign-up form,
-- assign it as the relay owner from the SQL Editor, replacing the email:
--
-- update public.relay_status
-- set owner_id = (
--   select id from auth.users where email = 'YOUR_SUPABASE_LOGIN_EMAIL'
-- )
-- where device_id = 'relay_01';
