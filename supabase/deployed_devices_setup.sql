-- =========================================================================
-- GKB TECHNOLOGIES — DEPLOYED DEVICES CATALOGUE
-- Controls which physical device keys are deployed and allowed to be linked.
-- Run this in your Supabase SQL Editor.
-- =========================================================================

create table if not exists public.gkb_deployed_devices (
  device_key text primary key,
  device_name text not null,
  project text not null default 'smart-security-system',
  relay_channels smallint check (relay_channels in (4, 6, 8)),
  status text not null default 'Online',
  last_alert text not null default 'Device deployed and ready to link',
  created_at timestamptz not null default now()
);

alter table public.gkb_deployed_devices enable row level security;
revoke all on table public.gkb_deployed_devices from public;
grant select on table public.gkb_deployed_devices to anon, authenticated;
grant insert, update, delete on table public.gkb_deployed_devices to authenticated;

-- Allow everyone (clients and visitors) to verify if a device key is deployed
drop policy if exists gkb_deployed_devices_read_all on public.gkb_deployed_devices;
create policy gkb_deployed_devices_read_all
  on public.gkb_deployed_devices
  for select
  to anon, authenticated
  using (true);

-- Allow authenticated users to insert/update/delete deployed devices
drop policy if exists gkb_deployed_devices_authenticated_write on public.gkb_deployed_devices;
create policy gkb_deployed_devices_authenticated_write
  on public.gkb_deployed_devices
  for all
  to authenticated
  using (true)
  with check (true);
