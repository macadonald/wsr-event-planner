-- event_notes: replaces the flat special_notes field with a rich notes table
CREATE TABLE IF NOT EXISTS event_notes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  content              text NOT NULL,
  note_date            date NULL,
  print_on_dept_sheets boolean NOT NULL DEFAULT false,
  sort_order           int NOT NULL DEFAULT 0,
  created_by           uuid REFERENCES profiles(id),
  updated_by           uuid REFERENCES profiles(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON event_notes(event_id);

CREATE OR REPLACE TRIGGER event_notes_updated_at
  BEFORE UPDATE ON event_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Bumps parent event updated_at / updated_by when notes change
CREATE OR REPLACE FUNCTION bump_event_on_note_change()
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
  RETURN NULL;
END;
$$;

CREATE TRIGGER bump_event_on_note_insert_update
  AFTER INSERT OR UPDATE ON event_notes
  FOR EACH ROW EXECUTE FUNCTION bump_event_on_note_change();

CREATE TRIGGER bump_event_on_note_delete
  AFTER DELETE ON event_notes
  FOR EACH ROW EXECUTE FUNCTION bump_event_on_note_change();

-- RLS
ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_notes_select" ON event_notes
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "event_notes_insert" ON event_notes
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "event_notes_update" ON event_notes
  FOR UPDATE TO authenticated
  USING  (get_user_role() IN ('admin','planner'))
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "event_notes_delete" ON event_notes
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin','planner'));

-- Migrate existing special_notes into event_notes (sort_order=0, not on dept sheets)
INSERT INTO event_notes (event_id, content, print_on_dept_sheets, sort_order, created_by, updated_by)
SELECT id, special_notes, false, 0, created_by, updated_by
FROM events
WHERE special_notes IS NOT NULL AND trim(special_notes) != '';
