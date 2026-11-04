-- event_activity: audit log for assignment/schedule/event changes
-- Filled by SECURITY DEFINER triggers (INSERT/UPDATE) and service role (DELETE from server actions).

CREATE TABLE IF NOT EXISTS event_activity (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name   text,
  action       text NOT NULL CHECK (action IN ('added', 'edited', 'deleted')),
  entity_type  text NOT NULL CHECK (entity_type IN ('assignment', 'schedule_item', 'note', 'event')),
  summary      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_activity_event_id    ON event_activity(event_id);
CREATE INDEX IF NOT EXISTS idx_event_activity_created_at  ON event_activity(created_at DESC);

ALTER TABLE event_activity ENABLE ROW LEVEL SECURITY;

-- Any active user can read; nobody can INSERT via RLS (triggers + service role only)
CREATE POLICY "event_activity_select" ON event_activity
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

-- ── Trigger: assignments ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_assignment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor_name text;
  v_dept_name  text;
BEGIN
  SELECT full_name INTO v_actor_name FROM profiles WHERE id = NEW.updated_by;
  SELECT name      INTO v_dept_name  FROM departments WHERE id = NEW.department_id;
  INSERT INTO event_activity (event_id, actor_id, actor_name, action, entity_type, summary)
  VALUES (
    NEW.event_id,
    NEW.updated_by,
    COALESCE(v_actor_name, 'Unknown'),
    CASE WHEN TG_OP = 'INSERT' THEN 'added' ELSE 'edited' END,
    'assignment',
    COALESCE(v_dept_name || ': ', '') || NEW.task
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_assignment_change_trigger
  AFTER INSERT OR UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION log_assignment_change();

-- ── Trigger: schedule_items ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_schedule_item_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor_name text;
BEGIN
  SELECT full_name INTO v_actor_name FROM profiles WHERE id = NEW.updated_by;
  INSERT INTO event_activity (event_id, actor_id, actor_name, action, entity_type, summary)
  VALUES (
    NEW.event_id,
    NEW.updated_by,
    COALESCE(v_actor_name, 'Unknown'),
    CASE WHEN TG_OP = 'INSERT' THEN 'added' ELSE 'edited' END,
    'schedule_item',
    NEW.title || CASE WHEN NEW.location IS NOT NULL THEN '  (' || NEW.location || ')' ELSE '' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_schedule_item_change_trigger
  AFTER INSERT OR UPDATE ON schedule_items
  FOR EACH ROW EXECUTE FUNCTION log_schedule_item_change();

-- ── Trigger: events (direct edits only, skip cascade bumps) ─────────────────

CREATE OR REPLACE FUNCTION log_event_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor_name text;
BEGIN
  -- Skip cascade bumps from child-table triggers (only updated_at/updated_by differ)
  IF TG_OP = 'UPDATE' AND (
    OLD.name             IS NOT DISTINCT FROM NEW.name             AND
    OLD.start_date       IS NOT DISTINCT FROM NEW.start_date       AND
    OLD.end_date         IS NOT DISTINCT FROM NEW.end_date         AND
    OLD.pax              IS NOT DISTINCT FROM NEW.pax              AND
    OLD.location         IS NOT DISTINCT FROM NEW.location         AND
    OLD.status           IS NOT DISTINCT FROM NEW.status           AND
    OLD.event_type       IS NOT DISTINCT FROM NEW.event_type       AND
    OLD.contact_name     IS NOT DISTINCT FROM NEW.contact_name     AND
    OLD.contact_phone    IS NOT DISTINCT FROM NEW.contact_phone    AND
    OLD.contact_email    IS NOT DISTINCT FROM NEW.contact_email    AND
    OLD.onsite_contact   IS NOT DISTINCT FROM NEW.onsite_contact   AND
    OLD.special_notes    IS NOT DISTINCT FROM NEW.special_notes    AND
    OLD.start_time       IS NOT DISTINCT FROM NEW.start_time       AND
    OLD.end_time         IS NOT DISTINCT FROM NEW.end_time
  ) THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_actor_name FROM profiles WHERE id = NEW.updated_by;
  INSERT INTO event_activity (event_id, actor_id, actor_name, action, entity_type, summary)
  VALUES (
    NEW.id,
    NEW.updated_by,
    COALESCE(v_actor_name, 'Unknown'),
    CASE WHEN TG_OP = 'INSERT' THEN 'added' ELSE 'edited' END,
    'event',
    CASE WHEN TG_OP = 'INSERT' THEN 'Event created' ELSE 'Event details updated' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_event_change_trigger
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION log_event_change();
