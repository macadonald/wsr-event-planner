# WSR Event Planner — Project Guide for Claude Code

## Working folder (read this first)
- This project lives ONLY in: `~/Downloads/wsr-event-planner`
- Before doing anything, run `pwd` and confirm you are in that folder. If not, `cd` there.
- Never read, edit, or run commands in any other project folder — especially `~/Downloads/Ranch App Main/ranch-horse-app`, which is a separate live app.

## What this app is
An internal web app for White Stallion Ranch. Event planners create an event, add tasks ("what needs to be done"), assign each task to a department with a date and time, and print PDFs: one full event plan, and one page per department.

Primary flow, all on ONE event page: **Create Event → Add Assignments → Review → Print PDFs**

## Users and roles
- **admin** — T Mac. Everything, plus managing users and departments.
- **planner** — 2 to start, growing to ~8+. Create, edit, duplicate, and delete events and assignments.
- **viewer** — read-only for now. (Future: can mark assignments done.)
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
  event_date date NOT NULL, start_time time, end_time time
  location text, description text
  status text CHECK (status IN ('planning','finalized')) DEFAULT 'planning'
  created_by, updated_by → profiles
  created_at, updated_at timestamptz

assignments
  id uuid PK, event_id → events ON DELETE CASCADE
  department_id → departments ON DELETE RESTRICT
  task text NOT NULL, task_date date NOT NULL, task_time time NOT NULL
  notes text
  completed_at timestamptz NULL, completed_by → profiles NULL   -- future "mark done"
  created_by, updated_by → profiles
  created_at, updated_at timestamptz
```
- Triggers keep `updated_at` / `updated_by` current. Any insert/update/delete on `assignments` also bumps the parent event's `updated_at` / `updated_by`.
- Displayed status: **Completed** is derived (event_date before today in Phoenix), not stored. Otherwise show Planning or Finalized.
- Seed departments: Corral, Activities, Kitchen, Office, Housekeeping, Maintenance, each with a distinct earthy color.
- Add indexes on `assignments(event_id)`, `assignments(department_id)`, `events(event_date)`.

## Row Level Security
- Helper SQL function `current_role()` (security definer) returns the caller's role if their profile is active, else null.
- Any active user: read everything.
- admin + planner: insert/update/delete events and assignments.
- admin only: departments, department_recipients, and profile role/active changes.
- viewer: read-only. (Future: may update only `completed_at` / `completed_by` on assignments.)
- Inactive users get nothing.

## Features (v1)
**Dashboard**
- Upcoming events (soonest first), then past events. Search by name.
- Status badge per event. "Create New Event" button.

**Event page** (everything happens here)
- Event details, editable inline.
- Add-assignment form right on the page: Task, Department (dropdown of active departments), Date (defaults to event date), Time, Notes.
- Assignment list: chronological by date + time, department color chips, filter by department, edit, delete (with confirm).
- "Duplicate event": copies details and all assignments into a new event. Ask for the new date and shift every task date by the same number of days.
- Print buttons (see PDFs).

**Settings** (admin)
- Departments: add, rename, recolor, reorder, deactivate (deactivated departments stay on old events but aren't offered for new tasks). Add/remove recipient emails per department.
- Users: invite by email with role, change role, deactivate.

**PDFs** (server-generated, open in a new tab for print/download)
1. **Full Event Plan** — ranch name, event name, date, time, location, description, then all assignments. Toggle: chronological, or grouped by department.
2. **Single department** — event info header plus only that department's tasks.
3. **All departments packet** — one PDF, each department on its own page. For printing everything at once.
- Clean, readable, print-friendly (Letter size). Ranch logo from `public/logo.png` if present; fall back to text.

## Design
- Clean, simple, minimal training needed. Subtle ranch feel: warm neutrals, saddle-brown primary (~#5A3A22), cream backgrounds, simple serif for headings.
- Desktop first, but must work on a phone.
- No feature bloat.

## LATER — do NOT build until asked
- Email via Resend: send each department its PDF, preview before sending, send log with delivery status, "Send Updated Assignments" (only to departments whose tasks changed, marked REVISED). Never auto-send on edit.
- Viewer "mark done" on assignments.
- Calendar view, reminders, reusable task templates.

## How to work
- Build in the phases below. After each phase: `npm run build` must pass, commit to git with a clear message, then STOP and tell T Mac what to test.
- Ask before adding any new paid service or dependency not listed here.

### Phases
1. Scaffold Next.js app, connect Supabase, migrations for all tables + RLS + seeds, login page, invite-only auth, role loading, protected routes.
2. Settings: departments (and recipients) + users page.
3. Dashboard + create/edit/duplicate events.
4. Assignments on the event page (add, edit, delete, sort, filter).
5. PDFs (full plan, single department, all-departments packet).
6. Deploy to Vercel, README with setup steps.
