-- Migration: viewer completion permissions + completion-aware triggers

-- 1. RLS: viewers can UPDATE assignments (restricted to completion fields by trigger below)
CREATE POLICY "assignments_update_viewer" ON assignments
  FOR UPDATE TO authenticated
  USING  (get_user_role() = 'viewer')
  WITH CHECK (get_user_role() = 'viewer');

-- 2. BEFORE UPDATE: for viewers, force non-completion fields back to OLD values.
--    Named a_... so it fires before assignments_updated_at alphabetically.
CREATE OR REPLACE FUNCTION restrict_viewer_assignment_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF get_user_role() = 'viewer' THEN
    NEW.task             := OLD.task;
    NEW.department_id    := OLD.department_id;
    NEW.task_date        := OLD.task_date;
    NEW.task_time        := OLD.task_time;
    NEW.time_type        := OLD.time_type;
    NEW.notes            := OLD.notes;
    NEW.repeat_group_id  := OLD.repeat_group_id;
    NEW.created_by       := OLD.created_by;
    NEW.updated_by       := OLD.updated_by;
    NEW.updated_at       := OLD.updated_at;
    NEW.created_at       := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER a_restrict_viewer_assignment_update
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION restrict_viewer_assignment_update();

-- 3. Replace assignments_updated_at with a function that detects completion-only
--    updates and skips the timestamp bump for those.
CREATE OR REPLACE FUNCTION update_assignment_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (
    NEW.task              IS NOT DISTINCT FROM OLD.task AND
    NEW.department_id     IS NOT DISTINCT FROM OLD.department_id AND
    NEW.task_date         IS NOT DISTINCT FROM OLD.task_date AND
    NEW.task_time         IS NOT DISTINCT FROM OLD.task_time AND
    NEW.time_type         IS NOT DISTINCT FROM OLD.time_type AND
    NEW.notes             IS NOT DISTINCT FROM OLD.notes AND
    NEW.repeat_group_id   IS NOT DISTINCT FROM OLD.repeat_group_id
  ) THEN
    NEW.updated_at := OLD.updated_at;
    NEW.updated_by := OLD.updated_by;
    RETURN NEW;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assignments_updated_at ON assignments;
CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_assignment_timestamps();

-- 4. Replace bump_event_on_assignment_change to skip completion-only updates
CREATE OR REPLACE FUNCTION bump_event_on_assignment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF TG_OP = 'UPDATE' AND (
    NEW.task              IS NOT DISTINCT FROM OLD.task AND
    NEW.department_id     IS NOT DISTINCT FROM OLD.department_id AND
    NEW.task_date         IS NOT DISTINCT FROM OLD.task_date AND
    NEW.task_time         IS NOT DISTINCT FROM OLD.task_time AND
    NEW.time_type         IS NOT DISTINCT FROM OLD.time_type AND
    NEW.notes             IS NOT DISTINCT FROM OLD.notes AND
    NEW.repeat_group_id   IS NOT DISTINCT FROM OLD.repeat_group_id
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE events
  SET updated_at = now(),
      updated_by = COALESCE(changer_id, updated_by)
  WHERE id = affected_event_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Replace log_assignment_change to handle completion separately
CREATE OR REPLACE FUNCTION log_assignment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id           uuid;
  v_actor_name         text;
  v_dept_name          text;
  v_is_completion_only bool;
BEGIN
  SELECT name INTO v_dept_name FROM departments
    WHERE id = COALESCE(NEW.department_id, OLD.department_id);

  v_is_completion_only := (TG_OP = 'UPDATE') AND (
    NEW.task              IS NOT DISTINCT FROM OLD.task AND
    NEW.department_id     IS NOT DISTINCT FROM OLD.department_id AND
    NEW.task_date         IS NOT DISTINCT FROM OLD.task_date AND
    NEW.task_time         IS NOT DISTINCT FROM OLD.task_time AND
    NEW.time_type         IS NOT DISTINCT FROM OLD.time_type AND
    NEW.notes             IS NOT DISTINCT FROM OLD.notes AND
    NEW.repeat_group_id   IS NOT DISTINCT FROM OLD.repeat_group_id
  );

  IF v_is_completion_only THEN
    v_actor_id := auth.uid();
    SELECT full_name INTO v_actor_name FROM profiles WHERE id = v_actor_id;
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
      INSERT INTO event_activity (event_id, actor_id, actor_name, action, entity_type, summary)
      VALUES (NEW.event_id, v_actor_id, COALESCE(v_actor_name, 'Unknown'), 'edited', 'assignment',
              'Marked done: ' || COALESCE(v_dept_name || ': ', '') || NEW.task);
    ELSIF NEW.completed_at IS NULL AND OLD.completed_at IS NOT NULL THEN
      INSERT INTO event_activity (event_id, actor_id, actor_name, action, entity_type, summary)
      VALUES (NEW.event_id, v_actor_id, COALESCE(v_actor_name, 'Unknown'), 'edited', 'assignment',
              'Marked undone: ' || COALESCE(v_dept_name || ': ', '') || NEW.task);
    END IF;
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_actor_name FROM profiles WHERE id = NEW.updated_by;
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
