-- ── inventory_items ──────────────────────────────────────────────────────────
CREATE TABLE inventory_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  category         text        NOT NULL DEFAULT 'Other',
  quantity_owned   integer,                        -- NULL = "Not counted yet"
  qty_needs_repair integer     NOT NULL DEFAULT 0,
  qty_retired      integer     NOT NULL DEFAULT 0,
  storage_location text,
  notes            text,
  price_item_id    uuid        REFERENCES price_items(id) ON DELETE SET NULL,
  active           boolean     NOT NULL DEFAULT true,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_by       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_items_category_idx    ON inventory_items(category);
CREATE INDEX inventory_items_price_item_idx  ON inventory_items(price_item_id);
CREATE INDEX inventory_items_active_idx      ON inventory_items(active);

-- ── inventory_counts ─────────────────────────────────────────────────────────
CREATE TABLE inventory_counts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  counted_qty       integer     NOT NULL,
  counted_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  counted_at        timestamptz NOT NULL DEFAULT now(),
  notes             text,
  created_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_counts_item_idx ON inventory_counts(inventory_item_id, counted_at DESC);

-- ── trigger: sync quantity_owned when a count is inserted ────────────────────
CREATE OR REPLACE FUNCTION sync_quantity_from_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE inventory_items
  SET quantity_owned = NEW.counted_qty, updated_at = now()
  WHERE id = NEW.inventory_item_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_inventory_count_insert
  AFTER INSERT ON inventory_counts
  FOR EACH ROW EXECUTE FUNCTION sync_quantity_from_count();

-- ── updated_at trigger for inventory_items ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_inventory_item_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_inventory_items_update
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_inventory_item_updated_at();

-- ── extend event_charges with inventory link ─────────────────────────────────
ALTER TABLE event_charges
  ADD COLUMN inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL;

CREATE INDEX event_charges_inventory_item_idx ON event_charges(inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;

-- ── trigger: auto-set inventory_item_id on charges from price_item link ──────
CREATE OR REPLACE FUNCTION auto_set_inventory_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.price_item_id IS NOT NULL AND NEW.inventory_item_id IS NULL THEN
    SELECT id INTO NEW.inventory_item_id
    FROM inventory_items
    WHERE price_item_id = NEW.price_item_id
      AND active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_charge_upsert
  BEFORE INSERT OR UPDATE ON event_charges
  FOR EACH ROW EXECUTE FUNCTION auto_set_inventory_item();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE inventory_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;

-- All active users can view
CREATE POLICY "inventory_items_read" ON inventory_items FOR SELECT
  USING (get_user_role() IS NOT NULL);

-- admin + planner can insert/update
CREATE POLICY "inventory_items_insert" ON inventory_items FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'planner'));

CREATE POLICY "inventory_items_update" ON inventory_items FOR UPDATE
  USING (get_user_role() IN ('admin', 'planner'));

-- admin only can delete
CREATE POLICY "inventory_items_delete" ON inventory_items FOR DELETE
  USING (get_user_role() = 'admin');

-- All active users can view counts
CREATE POLICY "inventory_counts_read" ON inventory_counts FOR SELECT
  USING (get_user_role() IS NOT NULL);

-- admin + planner can record counts
CREATE POLICY "inventory_counts_insert" ON inventory_counts FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'planner'));

-- ── seed four items (runs after price_items are populated via seed script) ───
DO $$
DECLARE
  v_round_tables    uuid;
  v_cocktail_tables uuid;
  v_chairs          uuid;
  v_wine_barrels    uuid;
BEGIN
  SELECT id INTO v_round_tables    FROM price_items WHERE name = 'Round Table Rental' LIMIT 1;
  SELECT id INTO v_cocktail_tables FROM price_items WHERE name = 'Cocktail Table'     LIMIT 1;
  SELECT id INTO v_chairs          FROM price_items WHERE name = 'Chair Rental'       LIMIT 1;
  SELECT id INTO v_wine_barrels    FROM price_items WHERE name = 'Wine Barrel'        LIMIT 1;

  INSERT INTO inventory_items (name, category, quantity_owned, notes, price_item_id, sort_order)
  VALUES
    ('Round Tables',    'Tables',  NULL, 'Price sheet says max 11', v_round_tables,    10),
    ('Cocktail Tables', 'Tables',  NULL, NULL,                      v_cocktail_tables, 20),
    ('Chairs',          'Seating', NULL, NULL,                      v_chairs,          10),
    ('Wine Barrels',    'Décor',   NULL, NULL,                      v_wine_barrels,    10)
  ON CONFLICT DO NOTHING;
END $$;
