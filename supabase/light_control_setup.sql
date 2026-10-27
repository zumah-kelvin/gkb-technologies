-- =========================================================================
-- GKB TECHNOLOGIES — SMART LIGHT CONTROL SYSTEM (MULTI-CHANNEL)
-- HARDENED PRODUCTION / LAB SQL SETUP SCRIPT
-- =========================================================================
-- Purpose:
-- 1. Creates public.light_control_status for multi-channel relay states.
-- 2. Seeds records for light_01 (4-ch), light_02 (6-ch), and light_03 (8-ch).
-- 3. Enables Row Level Security (RLS) with strict, hardened policies:
--    - SELECT: Allows anon and authenticated to read live relay states.
--    - UPDATE: Constrains updates strictly to existing seeded devices (light_01, light_02, light_03),
--              and strictly prevents mutating 'device_id' or 'channel_count'.
--    - INSERT / DELETE: Explicitly blocked for API roles (cannot inject or delete devices).
-- =========================================================================

-- 1. Create table for multi-channel relay states
CREATE TABLE IF NOT EXISTS public.light_control_status (
  device_id text PRIMARY KEY,
  channel_count integer NOT NULL DEFAULT 4,
  ch1 boolean NOT NULL DEFAULT false,
  ch2 boolean NOT NULL DEFAULT false,
  ch3 boolean NOT NULL DEFAULT false,
  ch4 boolean NOT NULL DEFAULT false,
  ch5 boolean NOT NULL DEFAULT false,
  ch6 boolean NOT NULL DEFAULT false,
  ch7 boolean NOT NULL DEFAULT false,
  ch8 boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- 2. Ensure columns exist if table was previously created with fewer columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'light_control_status' AND column_name = 'ch5') THEN
    ALTER TABLE public.light_control_status ADD COLUMN ch5 boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'light_control_status' AND column_name = 'ch6') THEN
    ALTER TABLE public.light_control_status ADD COLUMN ch6 boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'light_control_status' AND column_name = 'ch7') THEN
    ALTER TABLE public.light_control_status ADD COLUMN ch7 boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'light_control_status' AND column_name = 'ch8') THEN
    ALTER TABLE public.light_control_status ADD COLUMN ch8 boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Seed initial records for devices
INSERT INTO public.light_control_status (device_id, channel_count, ch1, ch2, ch3, ch4)
VALUES ('light_01', 4, false, false, false, false)
ON CONFLICT (device_id) DO NOTHING;

INSERT INTO public.light_control_status (device_id, channel_count, ch1, ch2, ch3, ch4, ch5, ch6)
VALUES ('light_02', 6, false, false, false, false, false, false)
ON CONFLICT (device_id) DO NOTHING;

INSERT INTO public.light_control_status (device_id, channel_count, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8)
VALUES ('light_03', 8, false, false, false, false, false, false, false, false)
ON CONFLICT (device_id) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.light_control_status ENABLE ROW LEVEL SECURITY;

-- 5. Revoke write permissions and grant only SELECT and UPDATE
REVOKE ALL ON public.light_control_status FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.light_control_status TO anon, authenticated;

-- 6. Clean drop of all existing policies on this table
DROP POLICY IF EXISTS light_control_anon_read ON public.light_control_status;
DROP POLICY IF EXISTS light_control_anon_update ON public.light_control_status;
DROP POLICY IF EXISTS light_control_read_policy ON public.light_control_status;
DROP POLICY IF EXISTS light_control_update_policy ON public.light_control_status;

-- 7. Policy: Read access for known light controllers
CREATE POLICY light_control_read_policy
  ON public.light_control_status
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 8. Policy: Hardened update policy
-- Only allows updating valid registered light controllers (light_01, light_02, light_03)
-- Prevents clients from changing device_id or channel_count
CREATE POLICY light_control_update_policy
  ON public.light_control_status
  FOR UPDATE
  TO anon, authenticated
  USING (device_id IN ('light_01', 'light_02', 'light_03'))
  WITH CHECK (device_id IN ('light_01', 'light_02', 'light_03'));

-- 9. Trigger to auto-update 'updated_at' timestamp on any channel change
CREATE OR REPLACE FUNCTION update_light_control_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Guardrail: Ensure device_id and channel_count cannot be modified via UPDATE
  NEW.device_id = OLD.device_id;
  NEW.channel_count = OLD.channel_count;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_light_control_timestamp ON public.light_control_status;
CREATE TRIGGER trg_update_light_control_timestamp
  BEFORE UPDATE ON public.light_control_status
  FOR EACH ROW
  EXECUTE FUNCTION update_light_control_timestamp();

-- 10. Verification Query
SELECT * FROM public.light_control_status;
