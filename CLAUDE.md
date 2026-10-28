# WSR Event Planner — Project Guide for Claude Code

## Working folder (read this first)
- This project lives ONLY in: `~/Downloads/wsr-event-planner`
- Before doing anything, run `pwd` and confirm you are in that folder. If not, `cd` there.
- Never read, edit, or run commands in any other project folder — especially `~/Downloads/Ranch App Main/ranch-horse-app`, which is a separate live app.

## What this app is
An internal web app for White Stallion Ranch. Event planners create BEO-style events (Banquet Event Orders), add a guest-facing schedule, assign department tasks, and print PDFs: a compact Full Event Plan and per-department run sheets.

Primary flow, all on ONE event page: **Create Event → Edit BEO Details → Add Schedule → Add Assignments → Review → Print PDFs**

## Users and roles
- **admin** — T Mac. Everything, plus managing users and departments.
- **planner** — 2 to start, growing to ~8+. Create, edit, duplicate, and delete events, schedule items, and assignments.
- **viewer** — read-only for now. (Future: can mark assignments done.) Viewers never see billing.
- **Invite-only.** Public sign-up must be disabled. Only an admin can invite or deactivate users, from an in-app Users page.
- Bootstrap: the first admin is set by a one-time SQL update on their `profiles` row (document this in README).
- Show "Last edited by {name} at {time}" on every event.

## Tech stack (match the existing Ranch App)
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase: Auth, Postgres, Row Level Security
- Hosting: Vercel. Code: GitHub.
- PDFs: `@react-pdf/renderer`, generated **server-side** in route handlers (`app/api/pdf/...`). The same PDF code will later be reused for email attachments, so keep PDF components in `lib/pdf/` and independent of the UI.
- Supabase migrations live in `supabase/migrations/`. Every schema change is a new migration file.

## Secrets
- `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `.env.local` must be in `.gitignore`. Never commit keys.
- The service role key is used ONLY in server code (route handlers / server actions), never in client components.

## TIME RULES (critical — Arizona has no daylight saving)
- Event and task dates/times are **local ranch values**, not moments in UTC.
  - Dates: Postgres `date`. Times: Postgres `time` (no time zone).
  - NEVER store event or task scheduling as `timestamptz`.
  - NEVER do `new Date('2026-10-31')` — it parses as UTC and shifts the day. Use helpers in `lib/time.ts` that treat dates/times as plain strings and format them (e.g. `Oct 31, 2026`, `5:00 PM`).
- Audit fields (`created_at`, `updated_at`, `completed_at`) ARE `timestamptz`, and are always displayed in `America/Phoenix`.
- "Today" means today in `America/Phoenix`, computed by one helper.

## Database schema
```
profiles
  id uuid PK → auth.users.id
  full_name text, email text
  role text CHECK (role IN ('admin','planner','viewer')) DEFAULT 'viewer'
  active boolean DEFAULT true
  created_at timestamptz

departments
  id uuid PK, name text UNIQUE, color text (hex)
  sort_order int, active boolean DEFAULT true, created_at timestamptz

department_recipients          -- stored now, used by email in a later phase
  id uuid PK, department_id → departments ON DELETE CASCADE
  name text, email text, created_at timestamptz

events
  id uuid PK, name text NOT NULL
  event_type text CHECK (event_type IN ('In-House Group','Outside Group','Wedding','Ranch Event','Other'))
  start_date date NOT NULL, end_date date NOT NULL   -- multi-day; day count is calculated not stored
  start_time time, end_time time                      -- optional
  pax integer                                         -- guest count
  location text                                       -- e.g. "Longhorn/Sunrise"
  contact_name text, contact_phone text, contact_email text
  onsite_contact text
  description text, special_notes text
  status text CHECK (status IN ('planning','finalized')) DEFAULT 'planning'
  created_by, updated_by → profiles
  created_at, updated_at timestamptz

event_billing                                          -- one row per event; admin+planner only, never on dept PDFs
  id uuid PK, event_id → events ON DELETE CASCADE
  room_rental numeric
  billing_due_date date
  billing_method text, package text, notes text
  created_by, updated_by → profiles
  created_at, updated_at timestamptz

schedule_items                                         -- guest-facing agenda, shown day by day
  id uuid PK, event_id → events ON DELETE CASCADE
  item_date date NOT NULL
  start_time time, end_time time                       -- end_time optional
  title text NOT NULL                                  -- e.g. "Group Ride"
  location text, notes text
  created_by, updated_by → profiles
  created_at, updated_at timestamptz

assignments
  id uuid PK, event_id → events ON DELETE CASCADE
  department_id → departments ON DELETE RESTRICT
  task text NOT NULL, task_date date NOT NULL           -- task_date defaults to event start_date
  task_time time                                        -- optional; NULL = untimed / "General"
  notes text
  completed_at timestamptz NULL, completed_by → profiles NULL   -- future "mark done"
  created_by, updated_by → profiles
  created_at, updated_at timestamptz
```
- Triggers keep `updated_at` / `updated_by` current. Any insert/update/delete on `assignments` or `schedule_items` also bumps the parent event's `updated_at` / `updated_by`.
- Displayed status: **Completed** is derived (start_date before today in Phoenix), not stored. Otherwise show Planning or Finalized.
- Seed departments (10 total): Corral, Activities, Kitchen, Office, Housekeeping, Maintenance, Set-Up, Audio Visual, Front Desk, Bar — each with a distinct earthy/muted color.
- Indexes: `assignments(event_id)`, `assignments(department_id)`, `schedule_items(event_id)`, `events(start_date)`, `events(end_date)`.

## Row Level Security
- Helper SQL function `get_user_role()` (security definer) returns the caller's role if their profile is active, else null.
- Any active user: read events, assignments, schedule_items, departments, profiles.
- admin + planner: insert/update/delete events, assignments, schedule_items.
- **event_billing: admin + planner read AND write. Viewers cannot see billing at all.**
- admin only: departments, department_recipients, and profile role/active changes.
- viewer: read-only. (Future: may update only `completed_at` / `completed_by` on assignments.)
- Inactive users get nothing.

## Features (v1)
**Dashboard**
- Upcoming events (soonest first by start_date), then past events. Search by name.
- Status badge per event. "Create New Event" button.

**Event page** (everything happens here)

*BEO header:* Group name, event type, dates (start–end with day count), pax, times, location. Inline editable.

*Contact section:* contact_name, contact_phone, contact_email, onsite_contact. Inline editable.

*Billing section (admin + planner only — hidden from viewers entirely):* room_rental, billing_due_date, billing_method, package, notes. Inline editable. Never appears on department PDFs or run sheets.

*Schedule section:* Day-by-day list of schedule_items. Add/edit/delete per item. Shows title, time(s), location.

*Assignments section:* Add-assignment form: Task, Department (dropdown of active departments), Date (defaults to event start_date), Time (optional), Notes. Assignment list grouped by department or by date — user can toggle. Within each group, untimed tasks appear first under a "General" heading, then timed tasks in chronological order. Department color chips, filter by department, edit, delete (with confirm).

*"Duplicate event":* copies details, billing, schedule items, and all assignments into a new event. Prompt for new start date; shift all dates by the same number of days (preserving relative offsets for multi-day events).

*"Last edited by {name} at {time}"* shown on the page.

**Settings** (admin)
- Departments: add, rename, recolor, reorder (drag or arrows), deactivate (deactivated departments stay on old events but aren't offered for new tasks). Add/remove recipient emails per department.
- Users: invite by email with role, change role, deactivate.

**PDFs** (server-generated, open in a new tab for print/download)

Goal: **less paper**. Compact, efficient layouts. Small but readable type (9–10pt body). Skip any section or department that has nothing in it. No empty boxes or blank field labels.

1. **Full Event Plan** — aim for ONE page per event. Sections in BEO order:
   - Header: group name, dates, event type, "Last updated by X at T"
   - Contact: name, phone, email, onsite contact
   - Event details: day count, dates, times, pax, location
   - Billing: room rental, due date, method, package, notes *(admin+planner only — omit entirely if viewer generates PDF)*
   - Schedule: grouped by day, each item one line (time – title – location)
   - Department coordination: for each department that has tasks, list them in order (untimed "General" first, then timed). Skip departments with no tasks. Department order: Set-Up, Audio Visual, Front Desk, Housekeeping, Maintenance, Kitchen, Activities, Corral, Bar.
   - Special notes

2. **Department sheet** (one event, one department) — compact event header + condensed schedule + only that department's tasks (untimed first, then timed). No billing.

3. **Department Run Sheet** — pick a department + date range (default: this week Mon–Sun). Lists that department's tasks across **all events** in that range, grouped by day, then by time. Each line: time (or "General"), task, event name, location. No billing. Also an **"All departments"** option that prints each department's run sheet on its own page — this is the main printout for busy multi-group weeks.

- Letter size, print-friendly. Ranch logo from `public/logo.png` if present; fall back to text header.
- PDF route handlers live in `app/api/pdf/`. PDF React components live in `lib/pdf/` (no UI imports).

## Design
- Clean, simple, minimal training needed. Subtle ranch feel: warm neutrals, saddle-brown primary (~#5A3A22), cream backgrounds, simple serif for headings.
- Desktop first, but must work on a phone.
- No feature bloat.

## LATER — do NOT build until asked
- Email via Resend: send each department its PDF, preview before sending, send log with delivery status, "Send Updated Assignments" (only to departments whose tasks changed, marked REVISED). Never auto-send on edit.
- Viewer "mark done" on assignments.
- Calendar tab: month/week view of all events.
- Reminders, reusable task templates.

## How to work
- Build in the phases below. After each phase: `npm run build` must pass, commit to git with a clear message, then STOP and tell T Mac what to test.
- Ask before adding any new paid service or dependency not listed here.

### Phases
1. ✅ Scaffold Next.js app, connect Supabase, migrations for all tables + RLS + seeds, login page, invite-only auth, role loading, protected routes.
2. Settings: departments (and recipients) + users page.
3. Dashboard + create/edit/duplicate events (BEO fields, contacts, billing, schedule items).
4. Assignments on the event page (add, edit, delete, sort, filter; untimed "General" grouping).
5. PDFs (Full Event Plan, Department sheet, Department Run Sheet).
6. Deploy to Vercel, README with setup steps.
