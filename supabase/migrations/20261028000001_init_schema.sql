-- Phase 1: Core schema

-- profiles mirrors auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text,
  role        text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','planner','viewer')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- departments
CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  color       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- department_recipients (stored now, used for email in a later phase)
CREATE TABLE IF NOT EXISTS department_recipients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- events
-- event_date and start_time/end_time are local ranch values, no time zone.
CREATE TABLE IF NOT EXISTS events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  event_date  date NOT NULL,
  start_time  time,
  end_time    time,
  location    text,
  description text,
  status      text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','finalized')),
  created_by  uuid REFERENCES profiles(id),
  updated_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- assignments
-- task_date and task_time are local ranch values, no time zone.
CREATE TABLE IF NOT EXISTS assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  department_id   uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  task            text NOT NULL,
  task_date       date NOT NULL,
  task_time       time NOT NULL,
  notes           text,
  completed_at    timestamptz,
  completed_by    uuid REFERENCES profiles(id),
  created_by      uuid REFERENCES profiles(id),
  updated_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_event_id      ON assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_department_id ON assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date         ON events(event_date);

-- Trigger: keep updated_at current on events and assignments
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: any assignment change bumps the parent event's updated_at / updated_by
CREATE OR REPLACE FUNCTION bump_event_on_assignment_change()
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

CREATE OR REPLACE TRIGGER assignments_bump_event
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH ROW EXECUTE FUNCTION bump_event_on_assignment_change();

-- Trigger: auto-create profile row when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
