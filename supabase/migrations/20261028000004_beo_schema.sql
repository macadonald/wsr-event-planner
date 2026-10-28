-- Phase 1 BEO update: multi-day events, billing, schedule items, optional task_time

-- ── events: add BEO columns ────────────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type     text CHECK (event_type IN ('In-House Group','Outside Group','Wedding','Ranch Event','Other')),
  ADD COLUMN IF NOT EXISTS start_date     date,
  ADD COLUMN IF NOT EXISTS end_date       date,
  ADD COLUMN IF NOT EXISTS pax            integer,
  ADD COLUMN IF NOT EXISTS contact_name   text,
  ADD COLUMN IF NOT EXISTS contact_phone  text,
  ADD COLUMN IF NOT EXISTS contact_email  text,
  ADD COLUMN IF NOT EXISTS onsite_contact text,
  ADD COLUMN IF NOT EXISTS special_notes  text;

-- Migrate existing event_date into start_date / end_date (same-day events)
UPDATE events
SET start_date = event_date,
    end_date   = event_date
WHERE event_date IS NOT NULL
  AND start_date IS NULL;

-- Now enforce NOT NULL on the new date columns
ALTER TABLE events
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date   SET NOT NULL;

-- Remove the old single-day column and its index
DROP INDEX IF EXISTS idx_events_event_date;
ALTER TABLE events DROP COLUMN IF EXISTS event_date;

-- New indexes for date range queries
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date   ON events(end_date);

-- ── assignments: make task_time optional ───────────────────────────────────────
ALTER TABLE assignments ALTER COLUMN task_time DROP NOT NULL;

-- ── event_billing ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_billing (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  room_rental       numeric,
  billing_due_date  date,
  billing_method    text,
  package           text,
  notes             text,
  created_by        uuid REFERENCES profiles(id),
  updated_by        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)   -- one billing row per event
);

CREATE INDEX IF NOT EXISTS idx_event_billing_event_id ON event_billing(event_id);

CREATE OR REPLACE TRIGGER event_billing_updated_at
  BEFORE UPDATE ON event_billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── schedule_items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_date   date NOT NULL,
  start_time  time,
  end_time    time,
  title       text NOT NULL,
  location    text,
  notes       text,
  created_by  uuid REFERENCES profiles(id),
  updated_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_items_event_id ON schedule_items(event_id);

CREATE OR REPLACE TRIGGER schedule_items_updated_at
  BEFORE UPDATE ON schedule_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- schedule_items changes also bump the parent event's updated_at / updated_by
CREATE OR REPLACE FUNCTION bump_event_on_schedule_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  affected_event_id uuid;
  changer_id        uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_event_id := OLD.event_id;
    changer_id        := OLD.updated_by;
  ELSE
    affected_event_id := NEW.event_id;
    changer_id        := NEW.updated_by;
  END IF;

  UPDATE events
  SET updated_at = now(),
      updated_by = COALESCE(changer_id, updated_by)
  WHERE id = affected_event_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER schedule_items_bump_event
  AFTER INSERT OR UPDATE OR DELETE ON schedule_items
  FOR EACH ROW EXECUTE FUNCTION bump_event_on_schedule_change();

-- ── RLS for new tables ─────────────────────────────────────────────────────────

-- event_billing: admin + planner read AND write; viewers cannot see billing
ALTER TABLE event_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_select" ON event_billing
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','planner'));

CREATE POLICY "billing_insert" ON event_billing
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "billing_update" ON event_billing
  FOR UPDATE TO authenticated
  USING  (get_user_role() IN ('admin','planner'))
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "billing_delete" ON event_billing
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin','planner'));

-- schedule_items: any active user reads; admin + planner writes
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_items_select" ON schedule_items
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "schedule_items_insert" ON schedule_items
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "schedule_items_update" ON schedule_items
  FOR UPDATE TO authenticated
  USING  (get_user_role() IN ('admin','planner'))
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "schedule_items_delete" ON schedule_items
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin','planner'));

-- ── Seed additional departments ────────────────────────────────────────────────
INSERT INTO departments (name, color, sort_order) VALUES
  ('Set-Up',        '#7A6A5A', 7),
  ('Audio Visual',  '#5A6A7A', 8),
  ('Front Desk',    '#7A5A6A', 9),
  ('Bar',           '#6A4A3A', 10)
ON CONFLICT (name) DO NOTHING;
