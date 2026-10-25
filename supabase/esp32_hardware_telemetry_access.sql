-- =========================================================================
-- GKB TECHNOLOGIES — SECURE HARDWARE TELEMETRY & CREDENTIAL SETUP
-- =========================================================================
-- This script provisions the isolated device credential table and binds
-- each device key to its specific authorized account owner (user_id).
--
-- INSTRUCTIONS:
-- 1. Replace <YOUR_ACCOUNT_USER_ID> with your Supabase auth user UUID.
-- 2. Generate a random secret locally (e.g. node -e "console.log(require('crypto').randomBytes(24).toString('hex'))").
-- 3. Compute its SHA-256 hash locally (e.g. node -e "console.log(require('crypto').createHash('sha256').update('YOUR_SECRET').digest('hex'))").
-- 4. Replace <YOUR_GENERATED_SHA256_HASH> with the computed SHA-256 hash.
-- 5. Run this in the Supabase SQL Editor.
-- =========================================================================

-- 1. Ensure gkb_user_devices remains strictly protected under owner/admin RLS
revoke all on table public.gkb_user_devices from anon;
drop policy if exists gkb_user_devices_anon_read on public.gkb_user_devices;
drop policy if exists gkb_user_devices_anon_update on public.gkb_user_devices;

-- 2. Create the device credentials table binding device keys to exact owner accounts
create table if not exists public.gkb_device_credentials (
  device_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  secret_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint fk_user_device foreign key (user_id, device_key)
    references public.gkb_user_devices(user_id, device_key)
    on delete cascade
);

-- Completely lock down credentials table: NO access to public, anon, or authenticated users
alter table public.gkb_device_credentials enable row level security;
revoke all on table public.gkb_device_credentials from public, anon, authenticated;
grant all on table public.gkb_device_credentials to service_role;

-- 3. Provision the hardware credential bound to the exact owner row
-- DO NOT commit secrets here. Store ONLY the SHA-256 hash.
-- Replace the placeholders below before executing:
/*
insert into public.gkb_device_credentials (device_key, user_id, secret_hash, is_active)
values (
  'GKB-SEC-0001',
  '<YOUR_ACCOUNT_USER_ID>',
  '<YOUR_GENERATED_SHA256_HASH>',
  true
)
on conflict (device_key) do update
set user_id = excluded.user_id,
    secret_hash = excluded.secret_hash,
    is_active = excluded.is_active;
*/
