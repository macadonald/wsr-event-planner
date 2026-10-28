-- Phase 1: Row Level Security

-- Helper: returns the caller's app role if their profile is active, else null.
-- Named get_user_role() to avoid shadowing the PostgreSQL built-in current_role.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true;
$$;

-- Enable RLS on all tables
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_recipients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments            ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Any active user can read all profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

-- Admin can update any profile (role, active, name)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Any active user can update their own non-role/non-active fields (name, email)
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE TO authenticated
  USING  (id = auth.uid() AND get_user_role() IS NOT NULL)
  WITH CHECK (id = auth.uid());

-- ── departments ───────────────────────────────────────────────────────────────
CREATE POLICY "departments_select" ON departments
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "departments_insert" ON departments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "departments_update" ON departments
  FOR UPDATE TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "departments_delete" ON departments
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ── department_recipients ─────────────────────────────────────────────────────
CREATE POLICY "dept_recipients_select" ON department_recipients
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "dept_recipients_insert" ON department_recipients
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "dept_recipients_update" ON department_recipients
  FOR UPDATE TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "dept_recipients_delete" ON department_recipients
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ── events ────────────────────────────────────────────────────────────────────
CREATE POLICY "events_select" ON events
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "events_insert" ON events
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "events_update" ON events
  FOR UPDATE TO authenticated
  USING  (get_user_role() IN ('admin','planner'))
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "events_delete" ON events
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin','planner'));

-- ── assignments ───────────────────────────────────────────────────────────────
CREATE POLICY "assignments_select" ON assignments
  FOR SELECT TO authenticated
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "assignments_insert" ON assignments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "assignments_update" ON assignments
  FOR UPDATE TO authenticated
  USING  (get_user_role() IN ('admin','planner'))
  WITH CHECK (get_user_role() IN ('admin','planner'));

CREATE POLICY "assignments_delete" ON assignments
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin','planner'));
