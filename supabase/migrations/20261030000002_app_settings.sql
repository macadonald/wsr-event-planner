-- app_settings: key/value store for admin-configurable app preferences
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Default: "Changed" badge window is 48 hours
INSERT INTO app_settings (key, value) VALUES ('recent_changes_hours', '48')
  ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "app_settings_update" ON app_settings
  FOR UPDATE TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
