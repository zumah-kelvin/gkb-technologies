-- =========================================================================
-- GKB TECHNOLOGES — DEPLOYED HARDWARE KEYS REGISTRY & CATALOGUE
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ditnksmvcacnzdguqcgz/sql
-- =========================================================================

create table if not exists public.gkb_deployed_devices (
  device_key text primary key,
  device_name text not null,
  project text not null default 'smart-security-system',
  relay_channels smallint check (relay_channels in (2, 4, 6, 8)),
  status text not null default 'Verified',
  last_alert text not null default 'Hardware key deployed and ready to link',
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

-- Seed core GKB deployed hardware keys
insert into public.gkb_deployed_devices (device_key, device_name, project, relay_channels, status, last_alert)
values
  ('GKB-RELAY-0001', 'ESP32 Smart Relay Pilot (Single Relay)', 'relay-test', null, 'Verified', 'Single Relay Active · BLE & QR Verified · GPIO 23 Cloud Switched'),
  ('GKB-LIGHT-0001', 'Smart Light Controls (Multi-Channel Relay)', 'light-control', 4, 'Active Target', 'Universal 2, 4, 6 & 8-Channel Relay Board · Unified Firmware · Dropdown Configured'),
  ('GKB-LIGHT-0001V1', 'Smart Light Controls v1 (4-Channel)', 'light-control', 4, 'Active Target', 'Universal 4-Channel Relay Board · Living Room / Perimeter'),
  ('GKB-SWP-0001', 'Smart Water Tank Monitor', 'water-tank-monitor', null, 'Active Target', 'JSN-SR04T Ultrasonic Telemetry · Submersible Pump Relay GPIO 23 · BLE & QR Provisioning'),
  ('GKB-SEC-0001', 'Smart Home Security System v1', 'smart-security-system', null, 'Active Target', 'PIR Motion (GPIO 15) · Siren Strobe (GPIO 23) · Buzzer (GPIO 19) · GSM SIM800L Auto-Dial & SMS'),
  ('GKB-FAN-0001', 'Smart Fan Regulator', 'fan-regulator', null, 'Active Target', 'Multi-speed capacitor relay bank · DHT11/22 Environmental Telemetry · Auto-Thermal Trigger'),
  ('GKB-SPEM-0001', 'GKB Smart Prepaid Energy Meter', 'prepaid-energy-meter', null, 'Fleet', 'Meter secure · Balance GHS 24.50 · 230V 50Hz'),
  ('GKB-IUFT-0001', 'Industrial Fuel Tank Monitor', 'fuel-tank-monitor', null, 'Fleet', 'Fuel level stable at 72% · Pressure Sensor')
on conflict (device_key) do update set
  device_name = excluded.device_name,
  project = excluded.project,
  relay_channels = excluded.relay_channels,
  status = excluded.status,
  last_alert = excluded.last_alert;
