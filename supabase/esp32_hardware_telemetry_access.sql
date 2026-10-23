-- =========================================================================
-- GKB TECHNOLOGIES — ESP32 HARDWARE REALTIME TELEMETRY ACCESS POLICIES
-- Target Hardware Key : GKB-SEC-0001
-- Execute in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ditnksmvcacnzdguqcgz/sql
-- =========================================================================

-- 1. Grant anon role permission to read and update device telemetry
grant select (device_key, device_name, status, last_alert, project, relay_channels)
  on table public.gkb_user_devices to anon;

grant update (status, last_alert)
  on table public.gkb_user_devices to anon;

-- 2. Allow anon to read hardware telemetry rows
drop policy if exists gkb_user_devices_anon_read on public.gkb_user_devices;
create policy gkb_user_devices_anon_read
  on public.gkb_user_devices
  for select
  to anon
  using (true);

-- 3. Allow ESP32 / Arduino hardware nodes to update telemetry status via anon key
drop policy if exists gkb_user_devices_anon_update on public.gkb_user_devices;
create policy gkb_user_devices_anon_update
  on public.gkb_user_devices
  for update
  to anon
  using (true)
  with check (true);

-- 4. Enable Realtime publication for live telemetry updates
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'gkb_user_devices'
  ) then
    alter publication supabase_realtime add table public.gkb_user_devices;
  end if;
end;
$$;
