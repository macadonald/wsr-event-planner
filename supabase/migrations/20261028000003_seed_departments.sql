-- Phase 1: Seed default departments with earthy colors
INSERT INTO departments (name, color, sort_order) VALUES
  ('Corral',       '#8B6355', 1),
  ('Activities',   '#6B8E4E', 2),
  ('Kitchen',      '#C17B3A', 3),
  ('Office',       '#5A7A8A', 4),
  ('Housekeeping', '#9E8E6B', 5),
  ('Maintenance',  '#6B6B5A', 6)
ON CONFLICT (name) DO NOTHING;
