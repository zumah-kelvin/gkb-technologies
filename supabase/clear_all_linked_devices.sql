-- =========================================================================
-- GKB TECHNOLOGIES — CLEAR ALL LINKED DEVICES
-- Run this in your Supabase SQL Editor to wipe all user-device links.
-- =========================================================================

-- 1. Remove all linked user devices
delete from public.gkb_user_devices;

-- 2. Optional: Remove any stored device credentials if you want a complete hardware reset
-- delete from public.gkb_device_credentials;

-- 3. Reset hardware connection states in telemetry table (if present)
update public.gkb_device_telemetry
set status = 'offline',
    connected = false,
    updated_at = now()
where device_key in ('GKBSEC-00106', 'GKB-SEC-0001', 'GKB-SEC-9988');

-- Done: All linked devices have been cleared from Supabase!
