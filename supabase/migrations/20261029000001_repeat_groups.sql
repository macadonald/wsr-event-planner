-- Add repeat_group_id to assignments for multi-day repeat tasks
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS repeat_group_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_repeat_group_id ON assignments(repeat_group_id);
