# Sport Tracker — Design

## Purpose

A personal website to replace the current Google Sheet training tracker. It
shows a calendar of planned training sessions (currently built around the
Sierre-Zinal 2027 trail race plan), lets that plan be edited, pulls completed
activities in automatically from Strava, and charts running progression over
time. Single user (the owner). Not a multi-user or coaching product.

## Source data (current Google Sheet)

The existing sheet has four tabs that this app replaces:

1. **Overview** — goal, target race date, race distance/elevation, current
   fitness benchmark, and aggregate history stats (sessions done, total
   distance, total D+, total duration, average RPE).
2. **Phase plan** — five training phases (Base, Endurance vallonnée, Montée
   et résistance, Spécifique trail, Affûtage), each with a date range,
   priority description, target long-run distance range, and target weekly
   D+ range.
3. **Weekly pattern + 12-week detailed plan** — a fixed weekly rhythm (Flag
   football Mon/Wed, easy run Tue, rest Thu, optional session Fri, long
   run/trail on the weekend) instantiated as 12 weeks of dated sessions, each
   with activity type, session name, priority, target duration/distance/D+,
   intensity, instructions, and status. Also includes free-text adjustment
   rules (e.g. "high fatigue → drop Friday and shorten the long run 20–30%").
4. **Training history** — date, sport, session, status, duration, distance,
   D+, avg HR, RPE, a Strava link, and notes. Currently empty except for
   header/placeholder rows.

## Scope decisions

- **Running-focused.** Running gets full structured fields and graphs.
  Other activity types (flag football, gym, etc.) are lightweight calendar
  entries — type, duration, priority, notes, RPE — with no dedicated
  metrics or graphs.
- **One active plan at a time**, plus history. The app does not support
  switching between multiple named training blocks; when a new goal
  replaces the current one, the old plan is archived (its data stays
  visible in history) and a new plan becomes active.
- **Adjustment rules stay as free-text notes** on the plan, read by the
  user — not an automated rules engine. No automatic plan modification.
- **Strava sync is read-only.** The app never writes to Strava.

## Architecture

- **Next.js (App Router), TypeScript, deployed on Vercel.**
- **Supabase**: Postgres for all data; Supabase Auth for login.
- **Server Actions** call Supabase directly from the server — no separate
  REST API layer, since there's a single consumer (this app's own UI).
- **Strava sync**: a Vercel Cron job runs every 3 hours and calls a sync
  function; a "Sync now" button in the UI calls the same function on
  demand. The function fetches activities since the last synced cursor,
  upserts them into `activities`, and attempts to auto-match each one to a
  same-day, compatible-type `planned_session`.
- **Charts**: Recharts, rendered client-side from server-fetched data.

## Data model

```
plans
  id, name, status ('active' | 'archived'),
  race_name, race_date, race_distance_km, race_elevation_m,
  current_benchmark (text), notes (text, adjustment rules etc.),
  created_at

plan_phases
  id, plan_id -> plans,
  name, start_date, end_date, priority_description,
  target_long_run_min_km, target_long_run_max_km,
  target_weekly_dplus_min_m, target_weekly_dplus_max_m,
  sort_order

planned_sessions
  id, plan_id -> plans (nullable — a session can exist outside any plan),
  date, activity_type ('running' | 'flag_football' | 'other'),
  session_name, priority ('fixed' | 'essential' | 'optional'),
  target_duration_min, target_distance_km, target_dplus_m,
  intensity (text), instructions (text),
  status ('todo' | 'done' | 'skipped'),
  linked_activity_id -> activities (nullable)

activities
  id, source ('strava' | 'manual'),
  strava_activity_id (unique, nullable),
  date, sport_type,
  duration_min, distance_km, dplus_m, avg_hr, pace,
  rpe (nullable, user-entered),
  notes (user-entered),
  strava_link,
  planned_session_id -> planned_sessions (nullable)

strava_tokens
  id, access_token, refresh_token, expires_at
```

Notes:
- `planned_sessions.linked_activity_id` and `activities.planned_session_id`
  are kept in sync by the app (denormalized both directions) so both the
  calendar and the history view can join in one direction without an extra
  lookup.
- For Strava-sourced activities, `distance_km`, `duration_min`, `dplus_m`,
  `avg_hr`, and `pace` are treated as read-only in the UI (re-syncing
  overwrites them); `rpe`, `notes`, and `planned_session_id` are
  user-editable regardless of source.

## Features

### Calendar

- Month view (week view optional/stretch) of `planned_sessions`, colored by
  activity type and/or priority.
- Click an empty day to add a new planned session.
- Click an existing session to edit its fields in place.
- Drag a session to a different day to reschedule it.
- A session with status `done` and a linked activity shows an indicator;
  clicking it shows the matched activity's actuals alongside the plan.

### Plan editing

- Edit phase definitions (name, dates, priority text, target ranges).
- Edit or delete individual planned sessions; add new ones outside the
  generated 12-week block (e.g. extending the plan, or a session not tied
  to any phase).
- Editing the plan never touches `activities` — plan and history are
  separate tables joined only through the optional link.

### Activity history

- Table/list of `activities`, mirroring the sheet's history tab.
- Manual activities: fully editable (all fields).
- Strava activities: core metrics read-only, `rpe`/`notes`/link editable.
- Manual "add activity" form for sessions not tracked on Strava (e.g. a
  flag football session).
- Re-link or unlink an activity from a planned session if auto-match was
  wrong or ambiguous.

### Strava sync

- One-time OAuth connect flow (read-only scope: `activity:read_all`).
- Automatic refresh of the access token using the stored refresh token.
- Cron-driven sync every 3 hours, plus a manual "Sync now" button that
  triggers the same server action.
- New activities are auto-matched to a planned session sharing the same
  date and a compatible activity type; ambiguous or missing matches are
  left unlinked for the user to resolve manually in the history view.

### Progression graphs

- Weekly volume chart: distance (km) and elevation gain (D+) per week,
  running only, as a bar/line chart over the active plan's timeline (with
  the ability to page back into prior history).
- Built as an isolated component/data query so additional views (pace
  trend, HR/RPE trend, planned-vs-actual overlay) can be added later
  without restructuring the data layer.

### Auth

- Supabase Auth, single email/password account, session-based.
- All application routes require an authenticated session.

## One-time data migration

A one-off script (run once, not part of the app's runtime) reads the
current Google Sheet and seeds:
- the active `plan` row (Sierre-Zinal 2027, race date, distance/elevation,
  current benchmark),
- its `plan_phases`,
- the 12 weeks of `planned_sessions`.

The sheet's history tab is currently empty, so there's nothing to migrate
there — activity history is populated going forward via Strava sync and
manual entry. After migration and verification, the Google Sheet is no
longer the source of truth.

## Non-goals

- No multi-user support, sharing, or coaching features.
- No automated plan adjustment based on fatigue/RPE — adjustment rules
  remain informational text for the user to act on manually.
- No write access to Strava.
- No dedicated graphs/metrics for non-running activity types (initially).
- No support for multiple concurrently active training plans.

## Error handling

- Strava token refresh failure (revoked access): surface a clear
  "reconnect Strava" prompt in the UI rather than failing silently; sync
  job logs and skips until reconnected.
- Strava API rate-limit/errors during sync: job retries on the next
  scheduled run; manual "Sync now" surfaces the error to the user.
- Auto-match ambiguity (e.g. two planned sessions same day/type): leave
  unlinked, surface both candidates for manual linking rather than
  guessing.

## Testing

- Unit tests for the Strava sync/matching logic (upsert, auto-match
  rules, token refresh) since it's the most failure-prone piece.
- Integration tests for plan/session CRUD server actions.
- Manual verification of calendar drag-reschedule and graph rendering
  (UI-heavy, lower value for automated coverage at this scale).
