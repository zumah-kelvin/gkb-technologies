-- GKB Technologies - Customer Device Billing Pause & Administrative Control RLS Policies
-- Execute in Supabase SQL Editor: https://supabase.com/dashboard/project/ditnksmvcacnzdguqcgz/sql

-- 1. Ensure authenticated users and admins can select all customer devices
drop policy if exists gkb_user_devices_read_owner_or_admin on public.gkb_user_devices;
create policy gkb_user_devices_read_owner_or_admin
  on public.gkb_user_devices
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_gkb_admin()));

-- 2. Allow GKB Admins to update customer device status (Pause / Restore / Payment Hold) alongside device owners
drop policy if exists gkb_user_devices_update_owner on public.gkb_user_devices;
create policy gkb_user_devices_update_owner
  on public.gkb_user_devices
  for update
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_gkb_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_gkb_admin()));

-- 3. Allow GKB Admins to delete / unlink customer devices alongside device owners
drop policy if exists gkb_user_devices_delete_owner on public.gkb_user_devices;
create policy gkb_user_devices_delete_owner
  on public.gkb_user_devices
  for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_gkb_admin()));
