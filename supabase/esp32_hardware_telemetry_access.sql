-- =====================================================================================
-- GKB TECHNOLOGIES — HARDWARE TELEMETRY ROW-LEVEL SECURITY (RLS) ARCHITECTURE
-- File: supabase/esp32_hardware_telemetry_access.sql
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ditnksmvcacnzdguqcgz/sql
-- =====================================================================================
--
-- Security Model Overview:
-- 1. Multi-Tenant Device Isolation:
--    Clients can ONLY inspect and control hardware devices they own (linked in gkb_user_devices).
-- 2. System Administrator Privilege:
--    GKB System Admins (verified via public.is_gkb_admin()) retain full fleet oversight.
-- 3. Hardware Firmware Integration (ESP32 Node Access):
--    Physical ESP32 microcontrollers polling with anon publishable keys can securely read
--    their assigned device records and report sensor telemetry, while unauthorized web
--    actors cannot tamper with arbitrary customer hardware.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- STEP 1: HELPER FUNCTIONS FOR DEVICE OWNERSHIP VERIFICATION
-- -------------------------------------------------------------------------------------

-- Verify if authenticated caller owns a specific hardware device key
CREATE OR REPLACE FUNCTION public.is_device_owner(p_device_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gkb_user_devices
    WHERE user_id = auth.uid()
      AND upper(device_key) = upper(p_device_key)
  );
$$;

-- Verify if authenticated caller owns a light control node
CREATE OR REPLACE FUNCTION public.is_light_owner(p_device_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gkb_user_devices
    WHERE user_id = auth.uid()
      AND (
        upper(device_key) = upper(p_device_id)
        OR (p_device_id = 'light_01' AND upper(device_key) IN ('GKB-LIGHT-0001', 'GKB-LIGHT-0001V1', 'GKB-LIGHT-0001V2', 'GKB-LIGHT-0001V3'))
        OR (p_device_id = 'light_02' AND upper(device_key) = 'GKB-LIGHT-0002')
        OR (p_device_id = 'light_03' AND upper(device_key) = 'GKB-LIGHT-0003')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_device_owner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_light_owner(text) TO authenticated;


-- -------------------------------------------------------------------------------------
-- STEP 2: SMART FAN REGULATOR (fan_regulator_status)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.fan_regulator_status ENABLE ROW LEVEL SECURITY;

-- Revoke rogue public writes
REVOKE INSERT, DELETE ON public.fan_regulator_status FROM anon;

-- Clean existing policies
DROP POLICY IF EXISTS fan_select_policy ON public.fan_regulator_status;
DROP POLICY IF EXISTS fan_update_policy ON public.fan_regulator_status;
DROP POLICY IF EXISTS fan_authenticated_owner_select ON public.fan_regulator_status;
DROP POLICY IF EXISTS fan_authenticated_owner_update ON public.fan_regulator_status;
DROP POLICY IF EXISTS fan_hardware_node_select ON public.fan_regulator_status;
DROP POLICY IF EXISTS fan_hardware_node_update ON public.fan_regulator_status;

-- A. Client Owner & Admin Full Access (Authenticated)
CREATE POLICY fan_authenticated_owner_select
  ON public.fan_regulator_status
  FOR SELECT
  TO authenticated
  USING (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  );

CREATE POLICY fan_authenticated_owner_update
  ON public.fan_regulator_status
  FOR UPDATE
  TO authenticated
  USING (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  )
  WITH CHECK (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  );

-- B. ESP32 Hardware Node Access (Anon Key for Physical Firmware Telemetry)
CREATE POLICY fan_hardware_node_select
  ON public.fan_regulator_status
  FOR SELECT
  TO anon
  USING (device_id = 'fan_01');

CREATE POLICY fan_hardware_node_update
  ON public.fan_regulator_status
  FOR UPDATE
  TO anon
  USING (device_id = 'fan_01')
  WITH CHECK (device_id = 'fan_01');


-- -------------------------------------------------------------------------------------
-- STEP 3: SMART HOME SECURITY SYSTEM v1 (home_security_status)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.home_security_status ENABLE ROW LEVEL SECURITY;

-- Revoke rogue public writes
REVOKE INSERT, DELETE ON public.home_security_status FROM anon;

-- Clean existing policies
DROP POLICY IF EXISTS security_select_policy ON public.home_security_status;
DROP POLICY IF EXISTS security_update_policy ON public.home_security_status;
DROP POLICY IF EXISTS security_authenticated_owner_select ON public.home_security_status;
DROP POLICY IF EXISTS security_authenticated_owner_update ON public.home_security_status;
DROP POLICY IF EXISTS security_hardware_node_select ON public.home_security_status;
DROP POLICY IF EXISTS security_hardware_node_update ON public.home_security_status;

-- A. Client Owner & Admin Full Access (Authenticated)
CREATE POLICY security_authenticated_owner_select
  ON public.home_security_status
  FOR SELECT
  TO authenticated
  USING (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  );

CREATE POLICY security_authenticated_owner_update
  ON public.home_security_status
  FOR UPDATE
  TO authenticated
  USING (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  )
  WITH CHECK (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  );

-- B. ESP32 Hardware Node Access (Anon Key for Physical Firmware Telemetry)
CREATE POLICY security_hardware_node_select
  ON public.home_security_status
  FOR SELECT
  TO anon
  USING (device_id = 'security_01');

CREATE POLICY security_hardware_node_update
  ON public.home_security_status
  FOR UPDATE
  TO anon
  USING (device_id = 'security_01')
  WITH CHECK (device_id = 'security_01');


-- -------------------------------------------------------------------------------------
-- STEP 4: SMART WATER TANK MONITOR (water_tank_status)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.water_tank_status ENABLE ROW LEVEL SECURITY;

-- Revoke rogue public writes
REVOKE INSERT, DELETE ON public.water_tank_status FROM anon;

-- Clean existing policies
DROP POLICY IF EXISTS water_select_policy ON public.water_tank_status;
DROP POLICY IF EXISTS water_update_policy ON public.water_tank_status;
DROP POLICY IF EXISTS water_authenticated_owner_select ON public.water_tank_status;
DROP POLICY IF EXISTS water_authenticated_owner_update ON public.water_tank_status;
DROP POLICY IF EXISTS water_hardware_node_select ON public.water_tank_status;
DROP POLICY IF EXISTS water_hardware_node_update ON public.water_tank_status;

-- A. Client Owner & Admin Full Access (Authenticated)
CREATE POLICY water_authenticated_owner_select
  ON public.water_tank_status
  FOR SELECT
  TO authenticated
  USING (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  );

CREATE POLICY water_authenticated_owner_update
  ON public.water_tank_status
  FOR UPDATE
  TO authenticated
  USING (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  )
  WITH CHECK (
    public.is_device_owner(device_key)
    OR public.is_gkb_admin()
  );

-- B. ESP32 Hardware Node Access (Anon Key for Physical Firmware Telemetry)
CREATE POLICY water_hardware_node_select
  ON public.water_tank_status
  FOR SELECT
  TO anon
  USING (device_id = 'water_01');

CREATE POLICY water_hardware_node_update
  ON public.water_tank_status
  FOR UPDATE
  TO anon
  USING (device_id = 'water_01')
  WITH CHECK (device_id = 'water_01');


-- -------------------------------------------------------------------------------------
-- STEP 5: SMART LIGHT CONTROLS (light_control_status)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.light_control_status ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS light_select_policy ON public.light_control_status;
DROP POLICY IF EXISTS light_update_policy ON public.light_control_status;
DROP POLICY IF EXISTS light_authenticated_owner_select ON public.light_control_status;
DROP POLICY IF EXISTS light_authenticated_owner_update ON public.light_control_status;
DROP POLICY IF EXISTS light_hardware_node_select ON public.light_control_status;
DROP POLICY IF EXISTS light_hardware_node_update ON public.light_control_status;

-- A. Client Owner & Admin Full Access (Authenticated)
CREATE POLICY light_authenticated_owner_select
  ON public.light_control_status
  FOR SELECT
  TO authenticated
  USING (
    public.is_light_owner(device_id)
    OR public.is_gkb_admin()
  );

CREATE POLICY light_authenticated_owner_update
  ON public.light_control_status
  FOR UPDATE
  TO authenticated
  USING (
    public.is_light_owner(device_id)
    OR public.is_gkb_admin()
  )
  WITH CHECK (
    public.is_light_owner(device_id)
    OR public.is_gkb_admin()
  );

-- B. ESP32 Hardware Node Access (Anon Key for Physical Firmware Telemetry)
CREATE POLICY light_hardware_node_select
  ON public.light_control_status
  FOR SELECT
  TO anon
  USING (device_id IN ('light_00', 'light_01', 'light_02', 'light_03'));

CREATE POLICY light_hardware_node_update
  ON public.light_control_status
  FOR UPDATE
  TO anon
  USING (device_id IN ('light_00', 'light_01', 'light_02', 'light_03'))
  WITH CHECK (device_id IN ('light_00', 'light_01', 'light_02', 'light_03'));


-- -------------------------------------------------------------------------------------
-- STEP 6: ESP32 SMART RELAY PILOT (relay_status)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.relay_status ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS relay_status_public_read ON public.relay_status;
DROP POLICY IF EXISTS relay_status_public_update ON public.relay_status;
DROP POLICY IF EXISTS relay_authenticated_owner_select ON public.relay_status;
DROP POLICY IF EXISTS relay_authenticated_owner_update ON public.relay_status;
DROP POLICY IF EXISTS relay_hardware_node_select ON public.relay_status;
DROP POLICY IF EXISTS relay_hardware_node_update ON public.relay_status;

-- A. Client Owner & Admin Full Access (Authenticated)
CREATE POLICY relay_authenticated_owner_select
  ON public.relay_status
  FOR SELECT
  TO authenticated
  USING (
    public.is_device_owner('GKB-RELAY-0001')
    OR public.is_gkb_admin()
  );

CREATE POLICY relay_authenticated_owner_update
  ON public.relay_status
  FOR UPDATE
  TO authenticated
  USING (
    public.is_device_owner('GKB-RELAY-0001')
    OR public.is_gkb_admin()
  )
  WITH CHECK (
    public.is_device_owner('GKB-RELAY-0001')
    OR public.is_gkb_admin()
  );

-- B. ESP32 Hardware Node Access (Anon Key for Physical Firmware Telemetry)
CREATE POLICY relay_hardware_node_select
  ON public.relay_status
  FOR SELECT
  TO anon
  USING (device_id = 'relay_01');

CREATE POLICY relay_hardware_node_update
  ON public.relay_status
  FOR UPDATE
  TO anon
  USING (device_id = 'relay_01')
  WITH CHECK (device_id = 'relay_01');


-- -------------------------------------------------------------------------------------
-- STEP 7: VERIFY AND CONFIRM RLS ACTIVATION
-- -------------------------------------------------------------------------------------
SELECT 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'fan_regulator_status',
    'home_security_status',
    'water_tank_status',
    'light_control_status',
    'relay_status',
    'gkb_user_devices',
    'gkb_deployed_devices'
  );
