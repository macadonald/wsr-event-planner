-- Add time_type to assignments: 'at' (happens at that time) or 'by' (must be done by that time)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS time_type text NOT NULL DEFAULT 'at'
    CHECK (time_type IN ('at', 'by'));
