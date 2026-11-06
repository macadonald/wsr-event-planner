-- Billing Waves 1 + 2: price_items, billing_settings, event_charges, events.price_level

-- ── 1. price_items ─────────────────────────────────────────────────────────────

CREATE TABLE price_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category                  text NOT NULL,
  name                      text NOT NULL,
  unit                      text NOT NULL CHECK (unit IN ('per_event','per_person','each','per_hour')),
  dmc_price                 numeric(10,2) NOT NULL,
  regular_price             numeric(10,2),          -- NULL → falls back to dmc_price
  included_people           integer,
  additional_per_person_dmc numeric(10,2),
  additional_per_person_regular numeric(10,2),
  max_capacity              integer,
  minimum                   numeric(10,2),          -- e.g. 2 for a 2-hour minimum
  service_pct               numeric(5,2)  NOT NULL DEFAULT 0,
  taxable                   boolean       NOT NULL DEFAULT true,
  notes                     text,
  active                    boolean       NOT NULL DEFAULT true,
  sort_order                integer       NOT NULL DEFAULT 0,
  created_at                timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_items_category  ON price_items(category);
CREATE INDEX idx_price_items_active    ON price_items(active);

ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_items_select" ON price_items
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','planner'));

CREATE POLICY "price_items_insert" ON price_items
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "price_items_update" ON price_items
  FOR UPDATE TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "price_items_delete" ON price_items
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ── 2. billing_settings (single row) ───────────────────────────────────────────

CREATE TABLE billing_settings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_pct              numeric(5,2)  NOT NULL DEFAULT 6.1,
  tax_on_service       boolean       NOT NULL DEFAULT false,
  regular_markup_note  text,
  updated_at           timestamptz   NOT NULL DEFAULT now(),
  updated_by           uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_settings_select" ON billing_settings
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','planner'));

CREATE POLICY "billing_settings_update" ON billing_settings
  FOR UPDATE TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Seed the single row
INSERT INTO billing_settings (tax_pct, tax_on_service, regular_markup_note)
VALUES (6.1, false, null);

-- ── 3. events.price_level ──────────────────────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS price_level text NOT NULL DEFAULT 'regular'
    CHECK (price_level IN ('dmc','regular'));

-- ── 4. event_charges ───────────────────────────────────────────────────────────

CREATE TABLE event_charges (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  price_item_id        uuid REFERENCES price_items(id) ON DELETE SET NULL,
  category             text NOT NULL,
  name                 text NOT NULL,
  unit                 text NOT NULL CHECK (unit IN ('per_event','per_person','each','per_hour')),
  quantity             numeric(10,2),
  hours                numeric(10,2),
  people               integer,
  charge_date          date,
  notes                text,
  -- Price snapshot taken at line-add time (never changes with the price list)
  unit_price           numeric(10,2) NOT NULL,
  list_price           numeric(10,2),               -- original price when overridden
  additional_per_person numeric(10,2),
  included_people      integer,
  service_pct          numeric(5,2)  NOT NULL DEFAULT 0,
  taxable              boolean       NOT NULL DEFAULT true,
  price_overridden     boolean       NOT NULL DEFAULT false,
  sort_order           integer       NOT NULL DEFAULT 0,
  created_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_charges_event_id ON event_charges(event_id);

ALTER TABLE event_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_charges_select" ON event_charges
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','planner'));

CREATE POLICY "event_charges_insert" ON event_charges
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "event_charges_update" ON event_charges
  FOR UPDATE TO authenticated
  USING  (get_user_role() IN ('admin','planner'))
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "event_charges_delete" ON event_charges
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin','planner'));

-- ── 5. event_charges: updated_at trigger ───────────────────────────────────────

CREATE TRIGGER event_charges_updated_at
  BEFORE UPDATE ON event_charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. event_charges: bump parent event ────────────────────────────────────────

CREATE OR REPLACE FUNCTION bump_event_on_charge_change()
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

CREATE TRIGGER event_charges_bump_event
  AFTER INSERT OR UPDATE OR DELETE ON event_charges
  FOR EACH ROW EXECUTE FUNCTION bump_event_on_charge_change();

-- ── 7. event_activity: extend entity_type to include 'charge' ──────────────────

ALTER TABLE event_activity
  DROP CONSTRAINT IF EXISTS event_activity_entity_type_check;

ALTER TABLE event_activity
  ADD CONSTRAINT event_activity_entity_type_check
  CHECK (entity_type IN ('assignment','schedule_item','note','event','charge'));

-- ── 8. event_charges: activity log (INSERT and UPDATE only) ────────────────────

CREATE OR REPLACE FUNCTION log_charge_change()
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
    'charge',
    CASE WHEN TG_OP = 'INSERT' THEN 'Charge added: ' ELSE 'Charge updated: ' END || NEW.name
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_charge_change_trigger
  AFTER INSERT OR UPDATE ON event_charges
  FOR EACH ROW EXECUTE FUNCTION log_charge_change();
