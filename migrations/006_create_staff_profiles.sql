CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_active_sort
  ON staff_profiles (is_active, sort_order, display_name);

COMMENT ON TABLE staff_profiles IS 'Website staff profile source of truth (Discord IDs + display names/roles).';
COMMENT ON COLUMN staff_profiles.discord_id IS 'Discord user ID used to fetch live avatar hash and keep PFP dynamic.';
COMMENT ON COLUMN staff_profiles.display_name IS 'Name shown on website (can differ from Discord username).';
COMMENT ON COLUMN staff_profiles.role IS 'Displayed role bucket (Owner, Web Developer, Clan Admin, etc).';

-- Keep updated_at fresh on every update
CREATE OR REPLACE FUNCTION set_staff_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_staff_profiles_updated_at();

-- Example seeds (adjust as needed)
-- INSERT INTO staff_profiles (discord_id, display_name, role, sort_order, is_active)
-- VALUES
--   ('777216423470039040', 'Jam', 'Owner', 10, true),
--   ('<ZUO_DISCORD_ID>', 'Zuo', 'Owner', 20, true),
--   ('<MIKE_DISCORD_ID>', 'Mike', 'Web Developer', 30, true)
-- ON CONFLICT (discord_id) DO UPDATE
-- SET
--   display_name = EXCLUDED.display_name,
--   role = EXCLUDED.role,
--   sort_order = EXCLUDED.sort_order,
--   is_active = EXCLUDED.is_active;
