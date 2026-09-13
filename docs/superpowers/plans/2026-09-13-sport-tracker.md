# Sport Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal Next.js website that replaces the current Google
Sheet: a calendar of planned training sessions, an editable training plan,
automatic Strava activity sync, and a running progression chart.

**Architecture:** Next.js (App Router, TypeScript) deployed on Vercel, with
Supabase (Postgres + Auth) as the only backend. Server Actions call
Supabase directly — no separate REST API. A Vercel Cron job plus a manual
button both call one `syncActivities` function that pulls new activities
from Strava (read-only) and auto-matches them to planned sessions.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS ·
Supabase (`@supabase/supabase-js`, `@supabase/ssr`) · FullCalendar
(`@fullcalendar/react` + `daygrid` + `interaction`) · Recharts · date-fns ·
Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-09-13-sport-tracker-design.md`

## Global Constraints

- Single user only — no public sign-up flow; the one account is created
  manually in the Supabase dashboard (see Prerequisites).
- Strava access is **read-only** (`activity:read_all` scope) — the app
  never calls Strava write endpoints.
- Strava-sourced activity metrics (distance, duration, D+, HR, pace) are
  never edited by the app after import; only `rpe`, `notes`, and
  `planned_session_id` are user-editable on those rows.
- All dates stored as ISO `date` strings (`YYYY-MM-DD`), no timezone
  component — this is a single-timezone personal app.
- All tables use Postgres RLS scoped to `user_id = auth.uid()`; the cron/
  sync path uses the Supabase **secret (service_role) key**, which bypasses
  RLS, and must set `user_id` explicitly from `SPORT_TRACKER_USER_ID`.

---

## Prerequisites (you do this before Task 1 — not agent-executable)

1. **Supabase project**: create one at supabase.com. Record:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable/anon key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret/service_role key → `SUPABASE_SECRET_KEY` (server-only, never
     exposed to the browser)
2. **Your login**: in Supabase Dashboard → Authentication → Users → Add
   user, create one user with your email + a password. Copy its UUID →
   `SPORT_TRACKER_USER_ID`. There is no self-service sign-up page in this
   app.
3. **Strava API app**: at strava.com/settings/api, create an app. Record:
   - Client ID → `STRAVA_CLIENT_ID`
   - Client Secret → `STRAVA_CLIENT_SECRET`
   - Authorization Callback Domain: set to your Vercel deployment's domain
     once you have one (Task 22); for local dev, Strava allows
     `localhost`, so set it to `localhost` during development and add the
     production domain later (Strava supports only one callback domain at
     a time — update it when you deploy, or create a second dev app).
4. **Vercel project**: create a project linked to this repo (needed for
   Task 22's Cron config); note it doesn't need to be done before local
   development starts.
5. Copy `.env.example` (created in Task 1) to `.env.local` and fill in the
   values above as they become available (Supabase values now, Strava
   values before Task 15).

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.env.example`, `.eslintrc.json` (or `eslint.config.mjs`), `vitest.config.ts`
- Create: `lib/health.ts`
- Test: `lib/health.test.ts`

**Interfaces:**
- Produces: `export function ping(): string` in `lib/health.ts`, returning `'pong'` — a trivial smoke-test target confirming Vitest + TS + the module resolution config all work together before later tasks build on them.

- [ ] **Step 1: Scaffold the Next.js app**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```
Accept defaults when prompted. This creates `package.json`, `app/`, `tsconfig.json`, `next.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`.

- [ ] **Step 2: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
  },
})
```

Add to `package.json` `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 3: Write the health check module and its failing test**

`lib/health.ts`:
```typescript
export function ping(): string {
  throw new Error('not implemented')
}
```

`lib/health.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { ping } from './health'

describe('ping', () => {
  it('returns pong', () => {
    expect(ping()).toBe('pong')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- lib/health.test.ts`
Expected: FAIL (throws 'not implemented')

- [ ] **Step 5: Implement and verify**

`lib/health.ts`:
```typescript
export function ping(): string {
  return 'pong'
}
```

Run: `npm test -- lib/health.test.ts` → PASS
Run: `npm run build` → succeeds
Run: `npm run lint` → no errors

- [ ] **Step 6: Create `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SPORT_TRACKER_USER_ID=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback
CRON_SECRET=
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Shared domain types

**Files:**
- Create: `lib/types.ts`

**Interfaces:**
- Produces: `PlanStatus`, `ActivityType`, `SessionPriority`, `SessionStatus`, `ActivitySource`, `Plan`, `PlanPhase`, `PlannedSession`, `Activity` — used by every later task.

- [ ] **Step 1: Write the types**

`lib/types.ts`:
```typescript
export type PlanStatus = 'active' | 'archived'
export type ActivityType = 'running' | 'flag_football' | 'other'
export type SessionPriority = 'fixed' | 'essential' | 'optional'
export type SessionStatus = 'todo' | 'done' | 'skipped'
export type ActivitySource = 'strava' | 'manual'

export interface Plan {
  id: string
  userId: string
  name: string
  status: PlanStatus
  raceName: string | null
  raceDate: string | null
  raceDistanceKm: number | null
  raceElevationM: number | null
  currentBenchmark: string | null
  notes: string | null
  createdAt: string
}

export interface PlanPhase {
  id: string
  userId: string
  planId: string
  name: string
  startDate: string
  endDate: string
  priorityDescription: string | null
  targetLongRunMinKm: number | null
  targetLongRunMaxKm: number | null
  targetWeeklyDplusMinM: number | null
  targetWeeklyDplusMaxM: number | null
  sortOrder: number
}

export interface PlannedSession {
  id: string
  userId: string
  planId: string | null
  date: string
  activityType: ActivityType
  sessionName: string
  priority: SessionPriority
  targetDurationMin: number | null
  targetDistanceKm: number | null
  targetDplusM: number | null
  intensity: string | null
  instructions: string | null
  status: SessionStatus
  linkedActivityId: string | null
  createdAt: string
}

export interface Activity {
  id: string
  userId: string
  source: ActivitySource
  stravaActivityId: number | null
  date: string
  sportType: string
  durationMin: number | null
  distanceKm: number | null
  dplusM: number | null
  avgHr: number | null
  pace: string | null
  rpe: number | null
  notes: string | null
  stravaLink: string | null
  plannedSessionId: string | null
  createdAt: string
}
```

There's no meaningful test for a pure type file — TypeScript compilation is the check.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared domain types"
```

---

### Task 3: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: Postgres tables `plans`, `plan_phases`, `planned_sessions`, `activities`, `strava_tokens` with columns matching `lib/types.ts` (snake_case) plus `user_id uuid`, and RLS policies scoped to `auth.uid() = user_id`. Later `lib/db/*.ts` tasks read/write these tables and map rows to the camelCase types from Task 2.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0001_init.sql`:
```sql
create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  status text not null default 'active' check (status in ('active','archived')),
  race_name text,
  race_date date,
  race_distance_km numeric,
  race_elevation_m numeric,
  current_benchmark text,
  notes text,
  created_at timestamptz not null default now()
);

create table plan_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  plan_id uuid not null references plans(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  priority_description text,
  target_long_run_min_km numeric,
  target_long_run_max_km numeric,
  target_weekly_dplus_min_m numeric,
  target_weekly_dplus_max_m numeric,
  sort_order int not null default 0
);

create table planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  plan_id uuid references plans(id) on delete set null,
  date date not null,
  activity_type text not null check (activity_type in ('running','flag_football','other')),
  session_name text not null,
  priority text not null check (priority in ('fixed','essential','optional')),
  target_duration_min numeric,
  target_distance_km numeric,
  target_dplus_m numeric,
  intensity text,
  instructions text,
  status text not null default 'todo' check (status in ('todo','done','skipped')),
  linked_activity_id uuid,
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  source text not null check (source in ('strava','manual')),
  strava_activity_id bigint unique,
  date date not null,
  sport_type text not null,
  duration_min numeric,
  distance_km numeric,
  dplus_m numeric,
  avg_hr numeric,
  pace text,
  rpe int check (rpe between 1 and 10),
  notes text,
  strava_link text,
  planned_session_id uuid references planned_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table planned_sessions
  add constraint planned_sessions_linked_activity_fkey
  foreign key (linked_activity_id) references activities(id) on delete set null;

create table strava_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id),
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  last_synced_at timestamptz
);

create index planned_sessions_date_idx on planned_sessions (user_id, date);
create index activities_date_idx on activities (user_id, date);

alter table plans enable row level security;
alter table plan_phases enable row level security;
alter table planned_sessions enable row level security;
alter table activities enable row level security;
alter table strava_tokens enable row level security;

create policy plans_owner on plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy plan_phases_owner on plan_phases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy planned_sessions_owner on planned_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy activities_owner on activities for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy strava_tokens_owner on strava_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

In the Supabase Dashboard → SQL Editor, paste and run the file's contents
against your project (or, if you have the Supabase CLI linked:
`supabase db push`). Verify in Table Editor that all five tables exist
with RLS enabled (shown as "RLS enabled" badge).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add initial database schema and RLS policies"
```

---

### Task 4: Supabase client helpers

**Files:**
- Create: `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`

**Interfaces:**
- Produces: `createBrowserSupabase(): SupabaseClient` (browser.ts), `createServerSupabase(): Promise<SupabaseClient>` (server.ts, reads/writes cookies via `next/headers`), `createAdminSupabase(): SupabaseClient` (admin.ts, service-role key, used only by the cron/sync path and the migration script — never imported by any client component).
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` env vars from Task 1's `.env.example`.

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Browser client**

`lib/supabase/browser.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
```

- [ ] **Step 3: Server client (Server Components, Server Actions, Route Handlers)**

`lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // called from a Server Component with no write access;
            // middleware (Task 5) refreshes the session instead
          }
        },
      },
    },
  )
}
```

- [ ] **Step 4: Admin client (service role, bypasses RLS)**

`lib/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  )
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (env vars are asserted with `!`, not validated at this
stage — Task 5's middleware is the first thing that actually calls these
against a live project).

- [ ] **Step 6: Commit**

```bash
git add lib/supabase package.json package-lock.json
git commit -m "feat: add Supabase browser/server/admin client helpers"
```

---

### Task 5: Auth — middleware, login page, logout, route protection

**Files:**
- Create: `middleware.ts`, `app/login/page.tsx`, `app/login/actions.ts`, `app/logout/route.ts`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 4).
- Produces: `middleware.ts` redirects any unauthenticated request (except `/login` and its assets) to `/login`; `POST /logout` clears the session and redirects to `/login`.

- [ ] **Step 1: Middleware — refresh session, protect routes**

`middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginRoute = request.nextUrl.pathname.startsWith('/login')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && !isLoginRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

(API routes are excluded from the redirect because Task 18's cron route
authenticates via `CRON_SECRET`, not a browser session.)

- [ ] **Step 2: Login server action**

`app/login/actions.ts`:
```typescript
'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/calendar')
}
```

- [ ] **Step 3: Login page**

`app/login/page.tsx`:
```typescript
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-xl font-semibold">Sign in</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <form action={login} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required className="rounded border px-3 py-2" />
        <input name="password" type="password" placeholder="Password" required className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Sign in
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Logout route**

`app/logout/route.ts`:
```typescript
import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. Visit `http://localhost:3000/calendar` (doesn't exist
yet, but middleware should still redirect) → confirm you land on
`/login`. Sign in with the user created in Prerequisites step 2 → confirm
you're redirected past login (404 on `/calendar` is expected until Task
9). `POST /logout` (a small "Sign out" button can be added once a layout
exists in Task 9) clears the session.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts app/login app/logout
git commit -m "feat: add Supabase auth login/logout and route protection"
```

---

### Task 6: Fake Supabase test double + `lib/db/plans.ts`

**Files:**
- Create: `tests/helpers/fakeSupabase.ts`
- Create: `lib/db/plans.ts`
- Test: `lib/db/plans.test.ts`

**Interfaces:**
- Produces (fakeSupabase.ts): `createFakeSupabase(initial?: Record<string, Row[]>): FakeSupabaseClient` — an in-memory double supporting `.from(table).select().eq().order().insert().update().upsert().delete().single()/.maybeSingle()`, and plain `await` on the builder. Reused by Tasks 7, 8, 17, 19.
- Produces (plans.ts): `getActivePlan(supabase): Promise<Plan | null>`, `updatePlan(supabase, id, patch): Promise<Plan>`, `listPhases(supabase, planId): Promise<PlanPhase[]>`, `upsertPhase(supabase, phase): Promise<PlanPhase>`, `deletePhase(supabase, id): Promise<void>`.
- Consumes: `Plan`, `PlanPhase` types (Task 2).

- [ ] **Step 1: Write the fake Supabase client**

`tests/helpers/fakeSupabase.ts`:
```typescript
type Row = Record<string, any>

export function createFakeSupabase(initial: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
  )

  function from(table: string) {
    tables[table] ??= []
    const filters: Array<(r: Row) => boolean> = []
    let orderBy: { col: string; ascending: boolean } | null = null
    let pendingOp:
      | null
      | { type: 'insert' | 'upsert' | 'update' | 'delete'; payload?: Row } = null

    function applyFilters(list: Row[]) {
      return list.filter((r) => filters.every((f) => f(r)))
    }

    function currentResult(): { data: any; error: null } {
      if (pendingOp?.type === 'insert') {
        const row = { id: crypto.randomUUID(), ...pendingOp.payload }
        tables[table].push(row)
        return { data: [row], error: null }
      }
      if (pendingOp?.type === 'upsert') {
        const payload = pendingOp.payload!
        const idx = tables[table].findIndex((r) => r.id === payload.id)
        const row = { id: payload.id ?? crypto.randomUUID(), ...payload }
        if (idx >= 0) tables[table][idx] = { ...tables[table][idx], ...row }
        else tables[table].push(row)
        return { data: [tables[table].find((r) => r.id === row.id)], error: null }
      }
      if (pendingOp?.type === 'update') {
        const matched = applyFilters(tables[table])
        matched.forEach((r) => Object.assign(r, pendingOp!.payload))
        return { data: matched, error: null }
      }
      if (pendingOp?.type === 'delete') {
        const matched = applyFilters(tables[table])
        tables[table] = tables[table].filter((r) => !matched.includes(r))
        return { data: matched, error: null }
      }
      let result = applyFilters(tables[table])
      if (orderBy) {
        const { col, ascending } = orderBy
        result = [...result].sort((a, b) => {
          const dir = ascending ? 1 : -1
          return a[col] > b[col] ? dir : a[col] < b[col] ? -dir : 0
        })
      }
      return { data: result, error: null }
    }

    const builder: any = {
      select() {
        return builder
      },
      eq(col: string, val: any) {
        filters.push((r) => r[col] === val)
        return builder
      },
      order(col: string, opts: { ascending: boolean }) {
        orderBy = { col, ascending: opts.ascending }
        return builder
      },
      insert(payload: Row) {
        pendingOp = { type: 'insert', payload }
        return builder
      },
      upsert(payload: Row) {
        pendingOp = { type: 'upsert', payload }
        return builder
      },
      update(payload: Row) {
        pendingOp = { type: 'update', payload }
        return builder
      },
      delete() {
        pendingOp = { type: 'delete' }
        return builder
      },
      maybeSingle() {
        const { data, error } = currentResult()
        return Promise.resolve({ data: data?.[0] ?? null, error })
      },
      single() {
        const { data, error } = currentResult()
        return Promise.resolve({ data: data?.[0] ?? null, error })
      },
      then(resolve: any, reject: any) {
        return Promise.resolve(currentResult()).then(resolve, reject)
      },
    }

    return builder
  }

  return { from, _tables: tables }
}
```

- [ ] **Step 2: Write `lib/db/plans.ts` mapping + functions**

```typescript
import type { Plan, PlanPhase } from '@/lib/types'

function mapPlan(row: any): Plan {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    raceName: row.race_name,
    raceDate: row.race_date,
    raceDistanceKm: row.race_distance_km,
    raceElevationM: row.race_elevation_m,
    currentBenchmark: row.current_benchmark,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function mapPhase(row: any): PlanPhase {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    priorityDescription: row.priority_description,
    targetLongRunMinKm: row.target_long_run_min_km,
    targetLongRunMaxKm: row.target_long_run_max_km,
    targetWeeklyDplusMinM: row.target_weekly_dplus_min_m,
    targetWeeklyDplusMaxM: row.target_weekly_dplus_max_m,
    sortOrder: row.sort_order,
  }
}

export async function getActivePlan(supabase: any): Promise<Plan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data ? mapPlan(data) : null
}

export async function updatePlan(
  supabase: any,
  id: string,
  patch: Partial<
    Pick<Plan, 'name' | 'raceName' | 'raceDate' | 'raceDistanceKm' | 'raceElevationM' | 'currentBenchmark' | 'notes'>
  >,
): Promise<Plan> {
  const row: Record<string, any> = {}
  if ('name' in patch) row.name = patch.name
  if ('raceName' in patch) row.race_name = patch.raceName
  if ('raceDate' in patch) row.race_date = patch.raceDate
  if ('raceDistanceKm' in patch) row.race_distance_km = patch.raceDistanceKm
  if ('raceElevationM' in patch) row.race_elevation_m = patch.raceElevationM
  if ('currentBenchmark' in patch) row.current_benchmark = patch.currentBenchmark
  if ('notes' in patch) row.notes = patch.notes

  const { data, error } = await supabase.from('plans').update(row).eq('id', id).single()
  if (error) throw error
  return mapPlan(data)
}

export async function listPhases(supabase: any, planId: string): Promise<PlanPhase[]> {
  const { data, error } = await supabase
    .from('plan_phases')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapPhase)
}

export async function upsertPhase(
  supabase: any,
  phase: Omit<PlanPhase, 'id' | 'userId'> & { id?: string },
): Promise<PlanPhase> {
  const row = {
    id: phase.id,
    plan_id: phase.planId,
    name: phase.name,
    start_date: phase.startDate,
    end_date: phase.endDate,
    priority_description: phase.priorityDescription,
    target_long_run_min_km: phase.targetLongRunMinKm,
    target_long_run_max_km: phase.targetLongRunMaxKm,
    target_weekly_dplus_min_m: phase.targetWeeklyDplusMinM,
    target_weekly_dplus_max_m: phase.targetWeeklyDplusMaxM,
    sort_order: phase.sortOrder,
  }
  const { data, error } = await supabase.from('plan_phases').upsert(row).single()
  if (error) throw error
  return mapPhase(data)
}

export async function deletePhase(supabase: any, id: string): Promise<void> {
  const { error } = await supabase.from('plan_phases').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 3: Write failing tests**

`lib/db/plans.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import { getActivePlan, updatePlan, listPhases, upsertPhase, deletePhase } from './plans'

const plan = {
  id: 'p1', user_id: 'u1', name: 'Sierre-Zinal 2027', status: 'active',
  race_name: 'Sierre-Zinal', race_date: '2027-08-07', race_distance_km: 31,
  race_elevation_m: 2200, current_benchmark: '7 km en 45 min', notes: null,
  created_at: '2026-09-01T00:00:00Z',
}

describe('plans db', () => {
  it('getActivePlan returns the active plan', async () => {
    const supabase = createFakeSupabase({ plans: [plan] })
    const result = await getActivePlan(supabase)
    expect(result?.id).toBe('p1')
    expect(result?.raceDate).toBe('2027-08-07')
  })

  it('getActivePlan returns null when none is active', async () => {
    const supabase = createFakeSupabase({ plans: [{ ...plan, status: 'archived' }] })
    expect(await getActivePlan(supabase)).toBeNull()
  })

  it('updatePlan patches only given fields', async () => {
    const supabase = createFakeSupabase({ plans: [plan] })
    const result = await updatePlan(supabase, 'p1', { currentBenchmark: '8 km en 48 min' })
    expect(result.currentBenchmark).toBe('8 km en 48 min')
    expect(result.raceName).toBe('Sierre-Zinal')
  })

  it('listPhases orders by sortOrder', async () => {
    const supabase = createFakeSupabase({
      plan_phases: [
        { id: 'ph2', user_id: 'u1', plan_id: 'p1', name: 'B', start_date: '2027-01-01', end_date: '2027-03-01', priority_description: null, target_long_run_min_km: null, target_long_run_max_km: null, target_weekly_dplus_min_m: null, target_weekly_dplus_max_m: null, sort_order: 2 },
        { id: 'ph1', user_id: 'u1', plan_id: 'p1', name: 'A', start_date: '2026-09-01', end_date: '2026-12-31', priority_description: null, target_long_run_min_km: null, target_long_run_max_km: null, target_weekly_dplus_min_m: null, target_weekly_dplus_max_m: null, sort_order: 1 },
      ],
    })
    const result = await listPhases(supabase, 'p1')
    expect(result.map((p) => p.name)).toEqual(['A', 'B'])
  })

  it('upsertPhase creates then updates', async () => {
    const supabase = createFakeSupabase()
    const created = await upsertPhase(supabase, {
      planId: 'p1', name: 'Base', startDate: '2026-09-01', endDate: '2026-12-31',
      priorityDescription: null, targetLongRunMinKm: 10, targetLongRunMaxKm: 14,
      targetWeeklyDplusMinM: 200, targetWeeklyDplusMaxM: 500, sortOrder: 1,
    })
    expect(created.name).toBe('Base')

    const updated = await upsertPhase(supabase, { ...created, name: 'Base phase' })
    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Base phase')
  })

  it('deletePhase removes it', async () => {
    const supabase = createFakeSupabase({
      plan_phases: [{ id: 'ph1', user_id: 'u1', plan_id: 'p1', name: 'A', start_date: '2026-09-01', end_date: '2026-12-31', priority_description: null, target_long_run_min_km: null, target_long_run_max_km: null, target_weekly_dplus_min_m: null, target_weekly_dplus_max_m: null, sort_order: 1 }],
    })
    await deletePhase(supabase, 'ph1')
    expect(await listPhases(supabase, 'p1')).toEqual([])
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- lib/db/plans.test.ts`
Expected: FAIL (module `./plans` incomplete or missing — write Step 2's
file first if you haven't, then re-run to confirm PASS instead; the fail
checkpoint applies to whichever of Step 2/Step 3 you haven't written yet)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- lib/db/plans.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/helpers/fakeSupabase.ts lib/db/plans.ts lib/db/plans.test.ts
git commit -m "feat: add plans/phases data access with fake-Supabase tests"
```

---

### Task 7: `lib/db/sessions.ts`

**Files:**
- Modify: `tests/helpers/fakeSupabase.ts` (add `gte`/`lte` range filters)
- Create: `lib/db/sessions.ts`
- Test: `lib/db/sessions.test.ts`

**Interfaces:**
- Consumes: `PlannedSession` type (Task 2), `createFakeSupabase` (Task 6, extended here).
- Produces: `listSessionsInRange(supabase, startDate, endDate): Promise<PlannedSession[]>`, `createSession(supabase, input): Promise<PlannedSession>`, `updateSession(supabase, id, patch): Promise<PlannedSession>`, `deleteSession(supabase, id): Promise<void>`, `rescheduleSession(supabase, id, newDate): Promise<PlannedSession>` — used by the calendar UI (Tasks 9–11).

- [ ] **Step 1: Add range filters to the fake client**

In `tests/helpers/fakeSupabase.ts`, add two methods to the `builder` object (alongside `eq`):
```typescript
      gte(col: string, val: any) {
        filters.push((r) => r[col] >= val)
        return builder
      },
      lte(col: string, val: any) {
        filters.push((r) => r[col] <= val)
        return builder
      },
```

- [ ] **Step 2: Write `lib/db/sessions.ts`**

```typescript
import type { PlannedSession } from '@/lib/types'

function mapSession(row: any): PlannedSession {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    date: row.date,
    activityType: row.activity_type,
    sessionName: row.session_name,
    priority: row.priority,
    targetDurationMin: row.target_duration_min,
    targetDistanceKm: row.target_distance_km,
    targetDplusM: row.target_dplus_m,
    intensity: row.intensity,
    instructions: row.instructions,
    status: row.status,
    linkedActivityId: row.linked_activity_id,
    createdAt: row.created_at,
  }
}

export async function listSessionsInRange(
  supabase: any,
  startDate: string,
  endDate: string,
): Promise<PlannedSession[]> {
  const { data, error } = await supabase
    .from('planned_sessions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapSession)
}

export async function createSession(
  supabase: any,
  input: Omit<PlannedSession, 'id' | 'userId' | 'createdAt' | 'linkedActivityId' | 'status'> & {
    status?: PlannedSession['status']
  },
): Promise<PlannedSession> {
  const row = {
    plan_id: input.planId,
    date: input.date,
    activity_type: input.activityType,
    session_name: input.sessionName,
    priority: input.priority,
    target_duration_min: input.targetDurationMin,
    target_distance_km: input.targetDistanceKm,
    target_dplus_m: input.targetDplusM,
    intensity: input.intensity,
    instructions: input.instructions,
    status: input.status ?? 'todo',
  }
  const { data, error } = await supabase.from('planned_sessions').insert(row).single()
  if (error) throw error
  return mapSession(data)
}

export async function updateSession(
  supabase: any,
  id: string,
  patch: Partial<Omit<PlannedSession, 'id' | 'userId' | 'createdAt'>>,
): Promise<PlannedSession> {
  const row: Record<string, any> = {}
  if ('planId' in patch) row.plan_id = patch.planId
  if ('date' in patch) row.date = patch.date
  if ('activityType' in patch) row.activity_type = patch.activityType
  if ('sessionName' in patch) row.session_name = patch.sessionName
  if ('priority' in patch) row.priority = patch.priority
  if ('targetDurationMin' in patch) row.target_duration_min = patch.targetDurationMin
  if ('targetDistanceKm' in patch) row.target_distance_km = patch.targetDistanceKm
  if ('targetDplusM' in patch) row.target_dplus_m = patch.targetDplusM
  if ('intensity' in patch) row.intensity = patch.intensity
  if ('instructions' in patch) row.instructions = patch.instructions
  if ('status' in patch) row.status = patch.status
  if ('linkedActivityId' in patch) row.linked_activity_id = patch.linkedActivityId

  const { data, error } = await supabase.from('planned_sessions').update(row).eq('id', id).single()
  if (error) throw error
  return mapSession(data)
}

export async function deleteSession(supabase: any, id: string): Promise<void> {
  const { error } = await supabase.from('planned_sessions').delete().eq('id', id)
  if (error) throw error
}

export async function rescheduleSession(
  supabase: any,
  id: string,
  newDate: string,
): Promise<PlannedSession> {
  return updateSession(supabase, id, { date: newDate })
}
```

- [ ] **Step 3: Write failing tests**

`lib/db/sessions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import { listSessionsInRange, createSession, updateSession, deleteSession, rescheduleSession } from './sessions'

const base = {
  user_id: 'u1', plan_id: 'p1', priority: 'essential', target_duration_min: 45,
  target_distance_km: null, target_dplus_m: null, intensity: 'Facile',
  instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z',
}

describe('sessions db', () => {
  it('listSessionsInRange filters and orders by date', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [
        { ...base, id: 's2', date: '2026-09-20', activity_type: 'running', session_name: 'Long run' },
        { ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' },
        { ...base, id: 's3', date: '2026-10-05', activity_type: 'running', session_name: 'Out of range' },
      ],
    })
    const result = await listSessionsInRange(supabase, '2026-09-01', '2026-09-30')
    expect(result.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('createSession defaults status to todo', async () => {
    const supabase = createFakeSupabase()
    const created = await createSession(supabase, {
      planId: 'p1', date: '2026-09-15', activityType: 'running', sessionName: 'Easy run',
      priority: 'essential', targetDurationMin: 45, targetDistanceKm: null, targetDplusM: null,
      intensity: 'Facile', instructions: null,
    })
    expect(created.status).toBe('todo')
    expect(created.sessionName).toBe('Easy run')
  })

  it('updateSession patches given fields only', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [{ ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' }],
    })
    const updated = await updateSession(supabase, 's1', { status: 'done' })
    expect(updated.status).toBe('done')
    expect(updated.sessionName).toBe('Easy run')
  })

  it('rescheduleSession changes only the date', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [{ ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' }],
    })
    const rescheduled = await rescheduleSession(supabase, 's1', '2026-09-16')
    expect(rescheduled.date).toBe('2026-09-16')
  })

  it('deleteSession removes it', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [{ ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' }],
    })
    await deleteSession(supabase, 's1')
    expect(await listSessionsInRange(supabase, '2026-01-01', '2026-12-31')).toEqual([])
  })
})
```

- [ ] **Step 4: Run tests to verify they fail, then pass**

Run: `npm test -- lib/db/sessions.test.ts`
Expected: first run FAILs against a missing/incomplete `sessions.ts`; after
writing Step 2 fully, re-run → PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/fakeSupabase.ts lib/db/sessions.ts lib/db/sessions.test.ts
git commit -m "feat: add planned-session data access with tests"
```

---

### Task 8: `lib/db/activities.ts`

**Files:**
- Modify: `tests/helpers/fakeSupabase.ts` (add `lt` filter and `limit`)
- Create: `lib/db/activities.ts`
- Test: `lib/db/activities.test.ts`

**Interfaces:**
- Consumes: `Activity` type (Task 2), `createFakeSupabase` (extended here).
- Produces: `listActivities(supabase, opts?): Promise<Activity[]>`, `createManualActivity(supabase, input): Promise<Activity>`, `updateActivity(supabase, id, patch): Promise<Activity>`, `upsertStravaActivity(supabase, input, userId?): Promise<Activity>`, `linkActivityToSession(supabase, activityId, sessionId): Promise<void>`, `unlinkActivity(supabase, activityId): Promise<void>` — `upsertStravaActivity`'s `userId` is required on the admin-client sync path (Task 17: no session JWT exists there for the `user_id` column's `default auth.uid()` to use); the rest is consumed by the history UI (Task 13/14).

- [ ] **Step 1: Add `lt` filter and `limit` to the fake client**

In `tests/helpers/fakeSupabase.ts`, add alongside `gte`/`lte`:
```typescript
      lt(col: string, val: any) {
        filters.push((r) => r[col] < val)
        return builder
      },
```
Add a `limitN` variable next to `orderBy`, a `limit` method, and apply it in
`currentResult()`'s default (select) branch:
```typescript
    let limitN: number | null = null
```
```typescript
      limit(n: number) {
        limitN = n
        return builder
      },
```
In `currentResult()`, right before `return { data: result, error: null }` in
the default branch, add:
```typescript
      if (limitN != null) result = result.slice(0, limitN)
```

- [ ] **Step 2: Write `lib/db/activities.ts`**

```typescript
import type { Activity } from '@/lib/types'

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    stravaActivityId: row.strava_activity_id,
    date: row.date,
    sportType: row.sport_type,
    durationMin: row.duration_min,
    distanceKm: row.distance_km,
    dplusM: row.dplus_m,
    avgHr: row.avg_hr,
    pace: row.pace,
    rpe: row.rpe,
    notes: row.notes,
    stravaLink: row.strava_link,
    plannedSessionId: row.planned_session_id,
    createdAt: row.created_at,
  }
}

export async function listActivities(
  supabase: any,
  opts: { limit?: number; before?: string } = {},
): Promise<Activity[]> {
  let query = supabase.from('activities').select('*').order('date', { ascending: false })
  if (opts.before) query = query.lt('date', opts.before)
  if (opts.limit) query = query.limit(opts.limit)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapActivity)
}

export async function createManualActivity(
  supabase: any,
  input: {
    date: string
    sportType: string
    durationMin: number | null
    distanceKm: number | null
    dplusM: number | null
    avgHr: number | null
    rpe: number | null
    notes: string | null
    plannedSessionId: string | null
  },
): Promise<Activity> {
  const row = {
    source: 'manual',
    strava_activity_id: null,
    date: input.date,
    sport_type: input.sportType,
    duration_min: input.durationMin,
    distance_km: input.distanceKm,
    dplus_m: input.dplusM,
    avg_hr: input.avgHr,
    pace: null,
    rpe: input.rpe,
    notes: input.notes,
    strava_link: null,
    planned_session_id: input.plannedSessionId,
  }
  const { data, error } = await supabase.from('activities').insert(row).single()
  if (error) throw error
  return mapActivity(data)
}

export async function updateActivity(
  supabase: any,
  id: string,
  patch: { rpe?: number | null; notes?: string | null; plannedSessionId?: string | null } & Partial<
    Pick<Activity, 'date' | 'sportType' | 'durationMin' | 'distanceKm' | 'dplusM' | 'avgHr'>
  >,
): Promise<Activity> {
  const row: Record<string, any> = {}
  if ('rpe' in patch) row.rpe = patch.rpe
  if ('notes' in patch) row.notes = patch.notes
  if ('plannedSessionId' in patch) row.planned_session_id = patch.plannedSessionId
  if ('date' in patch) row.date = patch.date
  if ('sportType' in patch) row.sport_type = patch.sportType
  if ('durationMin' in patch) row.duration_min = patch.durationMin
  if ('distanceKm' in patch) row.distance_km = patch.distanceKm
  if ('dplusM' in patch) row.dplus_m = patch.dplusM
  if ('avgHr' in patch) row.avg_hr = patch.avgHr

  const { data, error } = await supabase.from('activities').update(row).eq('id', id).single()
  if (error) throw error
  return mapActivity(data)
}

export async function upsertStravaActivity(
  supabase: any,
  input: {
    stravaActivityId: number
    date: string
    sportType: string
    durationMin: number | null
    distanceKm: number | null
    dplusM: number | null
    avgHr: number | null
    pace: string | null
    stravaLink: string
  },
  userId?: string,
): Promise<Activity> {
  const { data: existing } = await supabase
    .from('activities')
    .select('*')
    .eq('strava_activity_id', input.stravaActivityId)
    .maybeSingle()

  const row = {
    id: existing?.id,
    // `userId` is required on the admin-client (cron/manual sync) path, where there's
    // no session JWT for the `user_id` column's `default auth.uid()` to fall back on —
    // see Task 17. When called from a session-authenticated context it's omitted and
    // the column default applies as usual.
    user_id: existing?.user_id ?? userId,
    source: 'strava',
    strava_activity_id: input.stravaActivityId,
    date: input.date,
    sport_type: input.sportType,
    duration_min: input.durationMin,
    distance_km: input.distanceKm,
    dplus_m: input.dplusM,
    avg_hr: input.avgHr,
    pace: input.pace,
    rpe: existing?.rpe ?? null,
    notes: existing?.notes ?? null,
    strava_link: input.stravaLink,
    planned_session_id: existing?.planned_session_id ?? null,
  }
  const { data, error } = await supabase.from('activities').upsert(row).single()
  if (error) throw error
  return mapActivity(data)
}

export async function linkActivityToSession(
  supabase: any,
  activityId: string,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .update({ planned_session_id: sessionId })
    .eq('id', activityId)
  if (error) throw error

  const { error: sessionError } = await supabase
    .from('planned_sessions')
    .update({ linked_activity_id: activityId, status: 'done' })
    .eq('id', sessionId)
  if (sessionError) throw sessionError
}

export async function unlinkActivity(supabase: any, activityId: string): Promise<void> {
  const { data: activity, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .maybeSingle()
  if (error) throw error
  if (!activity?.planned_session_id) return

  const { error: clearError } = await supabase
    .from('activities')
    .update({ planned_session_id: null })
    .eq('id', activityId)
  if (clearError) throw clearError

  const { error: sessionError } = await supabase
    .from('planned_sessions')
    .update({ linked_activity_id: null })
    .eq('id', activity.planned_session_id)
  if (sessionError) throw sessionError
}
```

- [ ] **Step 3: Write failing tests**

`lib/db/activities.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import {
  listActivities,
  createManualActivity,
  updateActivity,
  upsertStravaActivity,
  linkActivityToSession,
  unlinkActivity,
} from './activities'

const baseActivity = {
  user_id: 'u1', source: 'manual', strava_activity_id: null, sport_type: 'running',
  duration_min: 45, distance_km: 8, dplus_m: 150, avg_hr: null, pace: null,
  rpe: null, notes: null, strava_link: null, planned_session_id: null,
  created_at: '2026-09-15T00:00:00Z',
}

describe('activities db', () => {
  it('listActivities orders newest first and respects limit', async () => {
    const supabase = createFakeSupabase({
      activities: [
        { ...baseActivity, id: 'a1', date: '2026-09-10' },
        { ...baseActivity, id: 'a2', date: '2026-09-20' },
      ],
    })
    const result = await listActivities(supabase, { limit: 1 })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a2')
  })

  it('createManualActivity defaults source to manual', async () => {
    const supabase = createFakeSupabase()
    const created = await createManualActivity(supabase, {
      date: '2026-09-15', sportType: 'flag_football', durationMin: 60,
      distanceKm: null, dplusM: null, avgHr: null, rpe: 7, notes: 'Good session',
      plannedSessionId: null,
    })
    expect(created.source).toBe('manual')
    expect(created.rpe).toBe(7)
  })

  it('updateActivity only touches editable fields', async () => {
    const supabase = createFakeSupabase({
      activities: [{ ...baseActivity, id: 'a1', date: '2026-09-15', source: 'strava' }],
    })
    const updated = await updateActivity(supabase, 'a1', { rpe: 6, notes: 'Felt easy' })
    expect(updated.rpe).toBe(6)
    expect(updated.distanceKm).toBe(8)
  })

  it('upsertStravaActivity inserts new, then updates same row on re-sync', async () => {
    const supabase = createFakeSupabase()
    const first = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 45,
      distanceKm: 8, dplusM: 150, avgHr: 150, pace: '5:37/km', stravaLink: 'https://strava.com/activities/999',
    })
    const second = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 46,
      distanceKm: 8.1, dplusM: 150, avgHr: 151, pace: '5:40/km', stravaLink: 'https://strava.com/activities/999',
    })
    expect(second.id).toBe(first.id)
    expect(second.distanceKm).toBe(8.1)
    const all = await listActivities(supabase)
    expect(all).toHaveLength(1)
  })

  it('upsertStravaActivity preserves existing rpe/notes on re-sync', async () => {
    const supabase = createFakeSupabase()
    const created = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 45,
      distanceKm: 8, dplusM: 150, avgHr: 150, pace: '5:37/km', stravaLink: 'https://strava.com/activities/999',
    })
    await updateActivity(supabase, created.id, { rpe: 8, notes: 'Hard' })
    const resynced = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 45,
      distanceKm: 8, dplusM: 150, avgHr: 150, pace: '5:37/km', stravaLink: 'https://strava.com/activities/999',
    })
    expect(resynced.rpe).toBe(8)
    expect(resynced.notes).toBe('Hard')
  })

  it('linkActivityToSession links both sides and marks session done', async () => {
    const supabase = createFakeSupabase({
      activities: [{ ...baseActivity, id: 'a1', date: '2026-09-15' }],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Long run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    await linkActivityToSession(supabase, 'a1', 's1')
    const [activity] = await listActivities(supabase)
    expect(activity.plannedSessionId).toBe('s1')
  })

  it('unlinkActivity clears both sides', async () => {
    const supabase = createFakeSupabase({
      activities: [{ ...baseActivity, id: 'a1', date: '2026-09-15', planned_session_id: 's1' }],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Long run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'done', linked_activity_id: 'a1', created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    await unlinkActivity(supabase, 'a1')
    const [activity] = await listActivities(supabase)
    expect(activity.plannedSessionId).toBeNull()
  })
})
```

- [ ] **Step 4: Run tests to verify they fail, then pass**

Run: `npm test -- lib/db/activities.test.ts`
Expected: FAIL before `activities.ts` is written, PASS (8 tests) after

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/fakeSupabase.ts lib/db/activities.ts lib/db/activities.test.ts
git commit -m "feat: add activities data access with tests"
```

---

### Task 9: Calendar page — layout, event mapping, month view

**Files:**
- Modify: `app/layout.tsx` (replace generated content with app shell + nav)
- Create: `lib/calendar/mapSessionsToEvents.ts`
- Test: `lib/calendar/mapSessionsToEvents.test.ts`
- Create: `app/calendar/actions.ts`, `app/calendar/page.tsx`, `app/calendar/CalendarClient.tsx`

**Interfaces:**
- Consumes: `listSessionsInRange`, `createSession`, `updateSession`, `deleteSession`, `rescheduleSession` (Task 7); `createServerSupabase` (Task 4); `PlannedSession` (Task 2).
- Produces: `mapSessionsToEvents(sessions): CalendarEvent[]` (used again by no other task, but kept isolated for testability); Server Actions `getSessionsForRange`, `saveSession`, `removeSession`, `moveSession` in `app/calendar/actions.ts` — Task 10 uses `saveSession`/`removeSession`, Task 11 uses `moveSession`.

- [ ] **Step 1: Install calendar + date libraries**

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/interaction date-fns
```

- [ ] **Step 2: App shell with navigation**

`app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sport Tracker',
  description: 'Personal training plan and activity log',
}

const NAV_LINKS = [
  { href: '/calendar', label: 'Calendar' },
  { href: '/plan', label: 'Plan' },
  { href: '/history', label: 'History' },
  { href: '/progress', label: 'Progress' },
  { href: '/settings/strava', label: 'Strava' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="flex items-center justify-between border-b px-4 py-3">
          <nav className="flex gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:underline">
                {link.label}
              </a>
            ))}
          </nav>
          <form action="/logout" method="post">
            <button type="submit" className="text-sm text-gray-500 hover:underline">
              Sign out
            </button>
          </form>
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Write the failing event-mapping test**

`lib/calendar/mapSessionsToEvents.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mapSessionsToEvents } from './mapSessionsToEvents'
import type { PlannedSession } from '@/lib/types'

const session: PlannedSession = {
  id: 's1', userId: 'u1', planId: 'p1', date: '2026-09-15', activityType: 'running',
  sessionName: 'Easy run', priority: 'essential', targetDurationMin: 45,
  targetDistanceKm: null, targetDplusM: null, intensity: 'Facile', instructions: null,
  status: 'todo', linkedActivityId: null, createdAt: '2026-09-01T00:00:00Z',
}

describe('mapSessionsToEvents', () => {
  it('maps a todo session without a checkmark', () => {
    const [event] = mapSessionsToEvents([session])
    expect(event.title).toBe('Easy run')
    expect(event.start).toBe('2026-09-15')
  })

  it('appends a checkmark for done sessions', () => {
    const [event] = mapSessionsToEvents([{ ...session, status: 'done' }])
    expect(event.title).toBe('Easy run ✓')
  })

  it('colors by priority', () => {
    const [fixedEvent] = mapSessionsToEvents([{ ...session, priority: 'fixed' }])
    const [optionalEvent] = mapSessionsToEvents([{ ...session, priority: 'optional' }])
    expect(fixedEvent.backgroundColor).not.toBe(optionalEvent.backgroundColor)
  })
})
```

Run: `npm test -- lib/calendar/mapSessionsToEvents.test.ts` → FAIL (module missing)

- [ ] **Step 4: Implement the mapping function**

`lib/calendar/mapSessionsToEvents.ts`:
```typescript
import type { PlannedSession } from '@/lib/types'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  allDay: true
  backgroundColor: string
  extendedProps: { sessionId: string; status: PlannedSession['status'] }
}

const PRIORITY_COLOR: Record<PlannedSession['priority'], string> = {
  fixed: '#6b7280',
  essential: '#2563eb',
  optional: '#93c5fd',
}

export function mapSessionsToEvents(sessions: PlannedSession[]): CalendarEvent[] {
  return sessions.map((s) => ({
    id: s.id,
    title: s.status === 'done' ? `${s.sessionName} ✓` : s.sessionName,
    start: s.date,
    allDay: true,
    backgroundColor: PRIORITY_COLOR[s.priority],
    extendedProps: { sessionId: s.id, status: s.status },
  }))
}
```

Run: `npm test -- lib/calendar/mapSessionsToEvents.test.ts` → PASS (3 tests)

- [ ] **Step 5: Server Actions for the calendar**

`app/calendar/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  listSessionsInRange,
  createSession,
  updateSession,
  deleteSession,
  rescheduleSession,
} from '@/lib/db/sessions'
import type { PlannedSession } from '@/lib/types'

export async function getSessionsForRange(start: string, end: string): Promise<PlannedSession[]> {
  const supabase = await createServerSupabase()
  return listSessionsInRange(supabase, start, end)
}

export async function saveSession(
  input: (Parameters<typeof createSession>[1] & { id?: undefined }) | ({ id: string } & Partial<Parameters<typeof createSession>[1]>),
) {
  const supabase = await createServerSupabase()
  const result = 'id' in input && input.id
    ? await updateSession(supabase, input.id, input)
    : await createSession(supabase, input as Parameters<typeof createSession>[1])
  revalidatePath('/calendar')
  return result
}

export async function removeSession(id: string) {
  const supabase = await createServerSupabase()
  await deleteSession(supabase, id)
  revalidatePath('/calendar')
}

export async function moveSession(id: string, newDate: string) {
  const supabase = await createServerSupabase()
  const result = await rescheduleSession(supabase, id, newDate)
  revalidatePath('/calendar')
  return result
}
```

- [ ] **Step 6: Calendar page (Server Component) and client wrapper**

`app/calendar/page.tsx`:
```typescript
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns'
import { createServerSupabase } from '@/lib/supabase/server'
import { listSessionsInRange } from '@/lib/db/sessions'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const anchor = new Date()
  const start = format(subMonths(startOfMonth(anchor), 1), 'yyyy-MM-dd')
  const end = format(addMonths(endOfMonth(anchor), 1), 'yyyy-MM-dd')

  const supabase = await createServerSupabase()
  const sessions = await listSessionsInRange(supabase, start, end)

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Calendar</h1>
      <CalendarClient initialSessions={sessions} />
    </div>
  )
}
```

`app/calendar/CalendarClient.tsx`:
```typescript
'use client'

import { useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg } from '@fullcalendar/core'
import type { PlannedSession } from '@/lib/types'
import { mapSessionsToEvents } from '@/lib/calendar/mapSessionsToEvents'
import { getSessionsForRange } from './actions'

export function CalendarClient({ initialSessions }: { initialSessions: PlannedSession[] }) {
  const [sessions, setSessions] = useState(initialSessions)

  const handleDatesSet = useCallback(async (arg: DatesSetArg) => {
    const start = arg.startStr.slice(0, 10)
    const end = arg.endStr.slice(0, 10)
    setSessions(await getSessionsForRange(start, end))
  }, [])

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={mapSessionsToEvents(sessions)}
      datesSet={handleDatesSet}
      height="auto"
    />
  )
}
```

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, sign in, visit `/calendar`. Confirm the month grid
renders with no sessions yet (none seeded until Task 21). Confirm
navigating to the next/previous month doesn't error (network tab shows a
call to the `getSessionsForRange` action).

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/calendar lib/calendar package.json package-lock.json
git commit -m "feat: add calendar month view backed by planned sessions"
```

---

### Task 10: Add/edit session dialog

**Files:**
- Create: `app/calendar/SessionDialog.tsx`
- Modify: `app/calendar/CalendarClient.tsx`

**Interfaces:**
- Consumes: `saveSession`, `removeSession` (Task 9's `actions.ts`); `PlannedSession`, `ActivityType`, `SessionPriority` (Task 2).
- Produces: `SessionDialogState` type (`{ mode: 'create'|'edit'; date: string; session?: PlannedSession }`) — reused by Task 11 when wiring drag-drop confirmation is *not* needed (reschedule stays dialog-free per the approved design), so no other task consumes this export beyond this one.

This is UI-only (a form over already-tested server actions), so per the
spec's testing section this task is verified manually rather than with
component tests.

- [ ] **Step 1: Build the dialog**

`app/calendar/SessionDialog.tsx`:
```typescript
'use client'

import { useTransition } from 'react'
import type { ActivityType, SessionPriority, PlannedSession } from '@/lib/types'
import { saveSession, removeSession } from './actions'

export interface SessionDialogState {
  mode: 'create' | 'edit'
  date: string
  session?: PlannedSession
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

export function SessionDialog({
  state,
  onClose,
  onSaved,
}: {
  state: SessionDialogState
  onClose: () => void
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const s = state.session

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveSession({
        id: s?.id,
        planId: s?.planId ?? null,
        date: (formData.get('date') as string) || state.date,
        activityType: formData.get('activityType') as ActivityType,
        sessionName: formData.get('sessionName') as string,
        priority: formData.get('priority') as SessionPriority,
        targetDurationMin: numberOrNull(formData.get('targetDurationMin')),
        targetDistanceKm: numberOrNull(formData.get('targetDistanceKm')),
        targetDplusM: numberOrNull(formData.get('targetDplusM')),
        intensity: (formData.get('intensity') as string) || null,
        instructions: (formData.get('instructions') as string) || null,
      } as any)
      onSaved()
    })
  }

  function handleDelete() {
    if (!s) return
    startTransition(async () => {
      await removeSession(s.id)
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        action={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-96 flex-col gap-2 rounded bg-white p-4"
      >
        <h2 className="text-lg font-semibold">
          {state.mode === 'create' ? 'New session' : 'Edit session'}
        </h2>
        <label className="text-sm">
          Date
          <input name="date" type="date" defaultValue={s?.date ?? state.date} required className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Type
          <select name="activityType" defaultValue={s?.activityType ?? 'running'} className="block w-full rounded border px-2 py-1">
            <option value="running">Running</option>
            <option value="flag_football">Flag football</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm">
          Session name
          <input name="sessionName" defaultValue={s?.sessionName} required className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Priority
          <select name="priority" defaultValue={s?.priority ?? 'essential'} className="block w-full rounded border px-2 py-1">
            <option value="fixed">Fixed</option>
            <option value="essential">Essential</option>
            <option value="optional">Optional</option>
          </select>
        </label>
        <label className="text-sm">
          Target duration (min)
          <input name="targetDurationMin" type="number" defaultValue={s?.targetDurationMin ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Target distance (km)
          <input name="targetDistanceKm" type="number" step="0.1" defaultValue={s?.targetDistanceKm ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Target D+ (m)
          <input name="targetDplusM" type="number" defaultValue={s?.targetDplusM ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Intensity
          <input name="intensity" defaultValue={s?.intensity ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Instructions
          <textarea name="instructions" defaultValue={s?.instructions ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <div className="mt-2 flex justify-between">
          {state.mode === 'edit' ? (
            <button type="button" onClick={handleDelete} disabled={isPending} className="text-sm text-red-600">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="rounded bg-black px-3 py-1 text-sm text-white">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into the calendar**

Replace `app/calendar/CalendarClient.tsx` with:
```typescript
'use client'

import { useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import type { PlannedSession } from '@/lib/types'
import { mapSessionsToEvents } from '@/lib/calendar/mapSessionsToEvents'
import { getSessionsForRange } from './actions'
import { SessionDialog, type SessionDialogState } from './SessionDialog'

export function CalendarClient({ initialSessions }: { initialSessions: PlannedSession[] }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [range, setRange] = useState<{ start: string; end: string } | null>(null)
  const [dialog, setDialog] = useState<SessionDialogState | null>(null)

  const refetch = useCallback(async (start: string, end: string) => {
    setRange({ start, end })
    setSessions(await getSessionsForRange(start, end))
  }, [])

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => refetch(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10)),
    [refetch],
  )

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setDialog({ mode: 'create', date: arg.dateStr })
  }, [])

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const session = sessions.find((s) => s.id === arg.event.id)
      if (session) setDialog({ mode: 'edit', date: session.date, session })
    },
    [sessions],
  )

  const handleSaved = useCallback(() => {
    setDialog(null)
    if (range) refetch(range.start, range.end)
  }, [range, refetch])

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={mapSessionsToEvents(sessions)}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="auto"
      />
      {dialog && <SessionDialog state={dialog} onClose={() => setDialog(null)} onSaved={handleSaved} />}
    </>
  )
}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in, go to `/calendar`. Click an empty day → dialog
opens in create mode with that date pre-filled; fill in a session name and
save → event appears on the calendar. Click the new event → dialog opens
in edit mode with existing values; change the session name and save →
event updates. Click Delete → event disappears.

- [ ] **Step 4: Commit**

```bash
git add app/calendar/SessionDialog.tsx app/calendar/CalendarClient.tsx
git commit -m "feat: add create/edit/delete dialog for planned sessions"
```

---

### Task 11: Drag-to-reschedule

**Files:**
- Modify: `app/calendar/CalendarClient.tsx`

**Interfaces:**
- Consumes: `moveSession` (Task 9's `actions.ts`).

- [ ] **Step 1: Add the drop handler**

In `app/calendar/CalendarClient.tsx`, add the import and handler, and pass
`editable`/`eventDrop` to `<FullCalendar>`:

```typescript
import type { DateClickArg, EventDropArg } from '@fullcalendar/interaction'
```
(replace the existing `import type { DateClickArg } from '@fullcalendar/interaction'` line)

```typescript
import { getSessionsForRange, moveSession } from './actions'
```
(replace the existing `import { getSessionsForRange } from './actions'` line)

Add inside the component, alongside the other handlers:
```typescript
  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const newDate = arg.event.startStr.slice(0, 10)
      try {
        await moveSession(arg.event.id, newDate)
        if (range) refetch(range.start, range.end)
      } catch {
        arg.revert()
      }
    },
    [range, refetch],
  )
```

Add `editable` and `eventDrop={handleEventDrop}` to the `<FullCalendar>` element:
```typescript
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={mapSessionsToEvents(sessions)}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        editable
        height="auto"
      />
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`, go to `/calendar`, drag an existing session to a
different day → it moves and stays moved after a page refresh (confirms
the server action persisted it, not just local state).

- [ ] **Step 3: Commit**

```bash
git add app/calendar/CalendarClient.tsx
git commit -m "feat: support drag-to-reschedule on the calendar"
```

---

### Task 12: Phase editing page

**Files:**
- Create: `app/plan/actions.ts`, `app/plan/page.tsx`, `app/plan/PlanClient.tsx`

**Interfaces:**
- Consumes: `getActivePlan`, `updatePlan`, `listPhases`, `upsertPhase`, `deletePhase` (Task 6); `createServerSupabase` (Task 4); `Plan`, `PlanPhase` (Task 2).

UI-only over already-tested data access — verified manually.

- [ ] **Step 1: Server actions**

`app/plan/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { updatePlan, upsertPhase, deletePhase } from '@/lib/db/plans'

export async function savePlanDetails(id: string, patch: Parameters<typeof updatePlan>[2]) {
  const supabase = await createServerSupabase()
  const result = await updatePlan(supabase, id, patch)
  revalidatePath('/plan')
  return result
}

export async function savePhase(phase: Parameters<typeof upsertPhase>[1]) {
  const supabase = await createServerSupabase()
  const result = await upsertPhase(supabase, phase)
  revalidatePath('/plan')
  return result
}

export async function removePhase(id: string) {
  const supabase = await createServerSupabase()
  await deletePhase(supabase, id)
  revalidatePath('/plan')
}
```

- [ ] **Step 2: Plan page (Server Component)**

`app/plan/page.tsx`:
```typescript
import { createServerSupabase } from '@/lib/supabase/server'
import { getActivePlan, listPhases } from '@/lib/db/plans'
import { PlanClient } from './PlanClient'

export default async function PlanPage() {
  const supabase = await createServerSupabase()
  const plan = await getActivePlan(supabase)
  if (!plan) {
    return <p>No active plan yet. Run the migration script (Task 21) or create one in Supabase.</p>
  }
  const phases = await listPhases(supabase, plan.id)
  return <PlanClient plan={plan} phases={phases} />
}
```

- [ ] **Step 3: Plan client component**

`app/plan/PlanClient.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import type { Plan, PlanPhase } from '@/lib/types'
import { savePlanDetails, savePhase, removePhase } from './actions'

function numberOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export function PlanClient({ plan, phases: initialPhases }: { plan: Plan; phases: PlanPhase[] }) {
  const [phases, setPhases] = useState(initialPhases)
  const [isPending, startTransition] = useTransition()

  function handlePlanSubmit(formData: FormData) {
    startTransition(async () => {
      await savePlanDetails(plan.id, {
        name: formData.get('name') as string,
        raceName: (formData.get('raceName') as string) || null,
        raceDate: (formData.get('raceDate') as string) || null,
        raceDistanceKm: numberOrNull(formData.get('raceDistanceKm')),
        raceElevationM: numberOrNull(formData.get('raceElevationM')),
        currentBenchmark: (formData.get('currentBenchmark') as string) || null,
        notes: (formData.get('notes') as string) || null,
      })
    })
  }

  function handlePhaseSubmit(phase: PlanPhase, formData: FormData) {
    startTransition(async () => {
      const saved = await savePhase({
        id: phase.id.startsWith('new-') ? undefined : phase.id,
        planId: plan.id,
        name: formData.get('name') as string,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        priorityDescription: (formData.get('priorityDescription') as string) || null,
        targetLongRunMinKm: numberOrNull(formData.get('targetLongRunMinKm')),
        targetLongRunMaxKm: numberOrNull(formData.get('targetLongRunMaxKm')),
        targetWeeklyDplusMinM: numberOrNull(formData.get('targetWeeklyDplusMinM')),
        targetWeeklyDplusMaxM: numberOrNull(formData.get('targetWeeklyDplusMaxM')),
        sortOrder: phase.sortOrder,
      })
      setPhases((prev) => prev.map((p) => (p.id === phase.id ? saved : p)))
    })
  }

  function handleAddPhase() {
    setPhases((prev) => [
      ...prev,
      {
        id: `new-${prev.length}`,
        userId: plan.userId,
        planId: plan.id,
        name: '',
        startDate: plan.raceDate ?? new Date().toISOString().slice(0, 10),
        endDate: plan.raceDate ?? new Date().toISOString().slice(0, 10),
        priorityDescription: null,
        targetLongRunMinKm: null,
        targetLongRunMaxKm: null,
        targetWeeklyDplusMinM: null,
        targetWeeklyDplusMaxM: null,
        sortOrder: prev.length + 1,
      },
    ])
  }

  function handleRemovePhase(phase: PlanPhase) {
    if (phase.id.startsWith('new-')) {
      setPhases((prev) => prev.filter((p) => p.id !== phase.id))
      return
    }
    startTransition(async () => {
      await removePhase(phase.id)
      setPhases((prev) => prev.filter((p) => p.id !== phase.id))
    })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Plan</h1>
        <form action={handlePlanSubmit} className="flex flex-col gap-2">
          <label className="text-sm">
            Name
            <input name="name" defaultValue={plan.name} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race name
            <input name="raceName" defaultValue={plan.raceName ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race date
            <input name="raceDate" type="date" defaultValue={plan.raceDate ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race distance (km)
            <input name="raceDistanceKm" type="number" step="0.1" defaultValue={plan.raceDistanceKm ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race elevation (m)
            <input name="raceElevationM" type="number" defaultValue={plan.raceElevationM ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Current benchmark
            <input name="currentBenchmark" defaultValue={plan.currentBenchmark ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Notes / adjustment rules
            <textarea name="notes" defaultValue={plan.notes ?? ''} rows={4} className="block w-full rounded border px-2 py-1" />
          </label>
          <button type="submit" disabled={isPending} className="mt-2 w-fit rounded bg-black px-3 py-1 text-sm text-white">
            Save plan
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Phases</h2>
        <div className="flex flex-col gap-4">
          {phases.map((phase) => (
            <form
              key={phase.id}
              action={(formData) => handlePhaseSubmit(phase, formData)}
              className="flex flex-col gap-2 rounded border p-3"
            >
              <input name="name" defaultValue={phase.name} placeholder="Phase name" required className="rounded border px-2 py-1" />
              <div className="flex gap-2">
                <input name="startDate" type="date" defaultValue={phase.startDate} required className="rounded border px-2 py-1" />
                <input name="endDate" type="date" defaultValue={phase.endDate} required className="rounded border px-2 py-1" />
              </div>
              <input name="priorityDescription" defaultValue={phase.priorityDescription ?? ''} placeholder="Priority description" className="rounded border px-2 py-1" />
              <div className="flex gap-2">
                <input name="targetLongRunMinKm" type="number" step="0.1" defaultValue={phase.targetLongRunMinKm ?? ''} placeholder="Long run min (km)" className="w-1/2 rounded border px-2 py-1" />
                <input name="targetLongRunMaxKm" type="number" step="0.1" defaultValue={phase.targetLongRunMaxKm ?? ''} placeholder="Long run max (km)" className="w-1/2 rounded border px-2 py-1" />
              </div>
              <div className="flex gap-2">
                <input name="targetWeeklyDplusMinM" type="number" defaultValue={phase.targetWeeklyDplusMinM ?? ''} placeholder="Weekly D+ min (m)" className="w-1/2 rounded border px-2 py-1" />
                <input name="targetWeeklyDplusMaxM" type="number" defaultValue={phase.targetWeeklyDplusMaxM ?? ''} placeholder="Weekly D+ max (m)" className="w-1/2 rounded border px-2 py-1" />
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={() => handleRemovePhase(phase)} className="text-sm text-red-600">
                  Remove
                </button>
                <button type="submit" disabled={isPending} className="rounded bg-black px-3 py-1 text-sm text-white">
                  Save phase
                </button>
              </div>
            </form>
          ))}
        </div>
        <button type="button" onClick={handleAddPhase} className="mt-4 rounded border px-3 py-1 text-sm">
          + Add phase
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Manual verification**

Visit `/plan`. Edit the plan's current benchmark and save → reload the
page, confirm it persisted. Add a phase, fill it in, save → reload,
confirm it persisted with the right `sortOrder`. Remove a phase → confirm
it's gone after reload.

- [ ] **Step 5: Commit**

```bash
git add app/plan
git commit -m "feat: add plan and phase editing page"
```

---

### Task 13: Activity history page

**Files:**
- Create: `app/history/actions.ts`, `app/history/page.tsx`, `app/history/ActivityDialog.tsx`, `app/history/ActivityTable.tsx`

**Interfaces:**
- Consumes: `listActivities`, `createManualActivity`, `updateActivity` (Task 8); `createServerSupabase` (Task 4); `Activity` (Task 2).
- Produces: `ActivityDialogState` type, `fetchActivities` Server Action — reused by Task 14 when adding link/unlink controls to this same table.

UI-only over already-tested data access — verified manually.

- [ ] **Step 1: Server actions**

`app/history/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { listActivities, createManualActivity, updateActivity } from '@/lib/db/activities'

export async function fetchActivities(opts?: Parameters<typeof listActivities>[1]) {
  const supabase = await createServerSupabase()
  return listActivities(supabase, opts)
}

export async function addManualActivity(input: Parameters<typeof createManualActivity>[1]) {
  const supabase = await createServerSupabase()
  const result = await createManualActivity(supabase, input)
  revalidatePath('/history')
  return result
}

export async function saveActivityEdits(id: string, patch: Parameters<typeof updateActivity>[2]) {
  const supabase = await createServerSupabase()
  const result = await updateActivity(supabase, id, patch)
  revalidatePath('/history')
  return result
}
```

- [ ] **Step 2: History page (Server Component)**

`app/history/page.tsx`:
```typescript
import { createServerSupabase } from '@/lib/supabase/server'
import { listActivities } from '@/lib/db/activities'
import { ActivityTable } from './ActivityTable'

export default async function HistoryPage() {
  const supabase = await createServerSupabase()
  const activities = await listActivities(supabase, { limit: 100 })
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">History</h1>
      <ActivityTable initialActivities={activities} />
    </div>
  )
}
```

- [ ] **Step 3: Activity dialog (add manual / edit)**

`app/history/ActivityDialog.tsx`:
```typescript
'use client'

import { useTransition } from 'react'
import type { Activity } from '@/lib/types'
import { addManualActivity, saveActivityEdits } from './actions'

export interface ActivityDialogState {
  mode: 'create' | 'edit'
  activity?: Activity
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export function ActivityDialog({
  state,
  onClose,
  onSaved,
}: {
  state: ActivityDialogState
  onClose: () => void
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const a = state.activity
  const readOnly = state.mode === 'edit' && a?.source === 'strava'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (state.mode === 'create') {
        await addManualActivity({
          date: formData.get('date') as string,
          sportType: formData.get('sportType') as string,
          durationMin: numberOrNull(formData.get('durationMin')),
          distanceKm: numberOrNull(formData.get('distanceKm')),
          dplusM: numberOrNull(formData.get('dplusM')),
          avgHr: numberOrNull(formData.get('avgHr')),
          rpe: numberOrNull(formData.get('rpe')),
          notes: (formData.get('notes') as string) || null,
          plannedSessionId: null,
        })
      } else if (a) {
        const patch: Record<string, unknown> = {
          rpe: numberOrNull(formData.get('rpe')),
          notes: (formData.get('notes') as string) || null,
        }
        if (a.source === 'manual') {
          patch.date = formData.get('date') as string
          patch.sportType = formData.get('sportType') as string
          patch.durationMin = numberOrNull(formData.get('durationMin'))
          patch.distanceKm = numberOrNull(formData.get('distanceKm'))
          patch.dplusM = numberOrNull(formData.get('dplusM'))
          patch.avgHr = numberOrNull(formData.get('avgHr'))
        }
        await saveActivityEdits(a.id, patch as any)
      }
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form action={handleSubmit} onClick={(e) => e.stopPropagation()} className="flex w-96 flex-col gap-2 rounded bg-white p-4">
        <h2 className="text-lg font-semibold">{state.mode === 'create' ? 'Add activity' : 'Edit activity'}</h2>
        <label className="text-sm">
          Date
          <input name="date" type="date" defaultValue={a?.date} disabled={readOnly} required className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Sport
          <input name="sportType" defaultValue={a?.sportType} disabled={readOnly} required className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Duration (min)
          <input name="durationMin" type="number" defaultValue={a?.durationMin ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Distance (km)
          <input name="distanceKm" type="number" step="0.1" defaultValue={a?.distanceKm ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          D+ (m)
          <input name="dplusM" type="number" defaultValue={a?.dplusM ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Avg HR
          <input name="avgHr" type="number" defaultValue={a?.avgHr ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          RPE (1-10)
          <input name="rpe" type="number" min={1} max={10} defaultValue={a?.rpe ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Notes
          <textarea name="notes" defaultValue={a?.notes ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        {readOnly && (
          <p className="text-xs text-gray-500">Core metrics come from Strava and can&apos;t be edited here.</p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="rounded bg-black px-3 py-1 text-sm text-white">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Activity table**

`app/history/ActivityTable.tsx`:
```typescript
'use client'

import { useState } from 'react'
import type { Activity } from '@/lib/types'
import { fetchActivities } from './actions'
import { ActivityDialog, type ActivityDialogState } from './ActivityDialog'

export function ActivityTable({ initialActivities }: { initialActivities: Activity[] }) {
  const [activities, setActivities] = useState(initialActivities)
  const [dialog, setDialog] = useState<ActivityDialogState | null>(null)

  async function handleSaved() {
    setDialog(null)
    setActivities(await fetchActivities({ limit: 100 }))
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setDialog({ mode: 'create' })}
        className="mb-4 rounded border px-3 py-1 text-sm"
      >
        + Add activity
      </button>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-2">Date</th>
            <th className="py-1 pr-2">Sport</th>
            <th className="py-1 pr-2">Duration</th>
            <th className="py-1 pr-2">Distance</th>
            <th className="py-1 pr-2">D+</th>
            <th className="py-1 pr-2">RPE</th>
            <th className="py-1 pr-2">Source</th>
            <th className="py-1 pr-2" />
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="py-1 pr-2">{a.date}</td>
              <td className="py-1 pr-2">{a.sportType}</td>
              <td className="py-1 pr-2">{a.durationMin ?? '—'} min</td>
              <td className="py-1 pr-2">{a.distanceKm ?? '—'} km</td>
              <td className="py-1 pr-2">{a.dplusM ?? '—'} m</td>
              <td className="py-1 pr-2">{a.rpe ?? '—'}</td>
              <td className="py-1 pr-2">{a.source}</td>
              <td className="py-1 pr-2">
                <button
                  type="button"
                  onClick={() => setDialog({ mode: 'edit', activity: a })}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dialog && <ActivityDialog state={dialog} onClose={() => setDialog(null)} onSaved={handleSaved} />}
    </div>
  )
}
```

- [ ] **Step 5: Manual verification**

Visit `/history`. Click "+ Add activity", fill in a manual entry (e.g. the
flag football session), save → row appears. Click "Edit" on it, change the
RPE → persists on reload. Confirm that once a Strava-sourced row exists
(after Task 17), its Edit dialog shows core fields disabled.

- [ ] **Step 6: Commit**

```bash
git add app/history
git commit -m "feat: add activity history table with manual add/edit"
```

---

### Task 14: Link/unlink an activity to a planned session

**Files:**
- Modify: `app/history/actions.ts`
- Modify: `app/history/ActivityDialog.tsx`

**Interfaces:**
- Consumes: `listSessionsInRange` (Task 7), `linkActivityToSession`, `unlinkActivity` (Task 8).

- [ ] **Step 1: Add server actions**

In `app/history/actions.ts`, add these imports:
```typescript
import { addDays, subDays, format } from 'date-fns'
import { listSessionsInRange } from '@/lib/db/sessions'
import { linkActivityToSession, unlinkActivity } from '@/lib/db/activities'
```

And these exports:
```typescript
export async function fetchNearbySessions(date: string) {
  const supabase = await createServerSupabase()
  const start = format(subDays(new Date(date), 3), 'yyyy-MM-dd')
  const end = format(addDays(new Date(date), 3), 'yyyy-MM-dd')
  return listSessionsInRange(supabase, start, end)
}

export async function linkActivity(activityId: string, sessionId: string) {
  const supabase = await createServerSupabase()
  await linkActivityToSession(supabase, activityId, sessionId)
  revalidatePath('/history')
  revalidatePath('/calendar')
}

export async function unlinkActivityAction(activityId: string) {
  const supabase = await createServerSupabase()
  await unlinkActivity(supabase, activityId)
  revalidatePath('/history')
  revalidatePath('/calendar')
}
```

- [ ] **Step 2: Add link/unlink UI to the dialog**

In `app/history/ActivityDialog.tsx`, change the imports at the top to:
```typescript
'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Activity, PlannedSession } from '@/lib/types'
import {
  addManualActivity,
  saveActivityEdits,
  fetchNearbySessions,
  linkActivity,
  unlinkActivityAction,
} from './actions'
```

Inside the component, after the `const a = state.activity` line, add:
```typescript
  const [nearbySessions, setNearbySessions] = useState<PlannedSession[]>([])

  useEffect(() => {
    if (state.mode === 'edit' && a && !a.plannedSessionId) {
      fetchNearbySessions(a.date).then(setNearbySessions)
    }
  }, [state.mode, a])

  function handleLink(sessionId: string) {
    if (!a) return
    startTransition(async () => {
      await linkActivity(a.id, sessionId)
      onSaved()
    })
  }

  function handleUnlink() {
    if (!a) return
    startTransition(async () => {
      await unlinkActivityAction(a.id)
      onSaved()
    })
  }
```

In the JSX, right before the closing `{readOnly && (...)}` block's sibling
`<div className="mt-2 flex justify-end gap-2">`, insert:
```typescript
        {state.mode === 'edit' && a && (
          <div className="rounded border p-2 text-sm">
            {a.plannedSessionId ? (
              <button type="button" onClick={handleUnlink} disabled={isPending} className="text-red-600">
                Unlink from planned session
              </button>
            ) : nearbySessions.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span>Link to a planned session:</span>
                {nearbySessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleLink(s.id)}
                    disabled={isPending}
                    className="text-left text-blue-600 hover:underline"
                  >
                    {s.date} — {s.sessionName}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">No nearby planned sessions to link.</span>
            )}
          </div>
        )}
```

- [ ] **Step 3: Manual verification**

Create a planned session and a manual activity a day apart. Edit the
activity → confirm the nearby session shows as a link option; click it →
dialog closes, and on the calendar (Task 9) that session now shows the
"done" checkmark. Edit the activity again → confirm "Unlink" appears and
works.

- [ ] **Step 4: Commit**

```bash
git add app/history/actions.ts app/history/ActivityDialog.tsx
git commit -m "feat: link/unlink activities to planned sessions"
```

---

### Task 15: Strava API client

**Files:**
- Create: `lib/strava/client.ts`
- Test: `lib/strava/client.test.ts`

**Interfaces:**
- Produces: `StravaTokenSet` (`{ accessToken, refreshToken, expiresAt }`), `StravaActivity` type, `exchangeCodeForToken(code): Promise<StravaTokenSet & { athleteId: number }>`, `refreshAccessToken(refreshToken): Promise<StravaTokenSet>`, `fetchActivitiesSince(accessToken, afterUnixSeconds): Promise<StravaActivity[]>` — consumed by Task 16 (connect flow) and Task 17 (sync).
- Consumes: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` env vars.

- [ ] **Step 1: Write the client**

`lib/strava/client.ts`:
```typescript
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

export interface StravaTokenSet {
  accessToken: string
  refreshToken: string
  expiresAt: number // unix seconds
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  // Local time at the activity's location, no UTC offset suffix (e.g.
  // "2026-09-15T20:30:00Z" is printed but represents local wall-clock
  // time — Strava's documented quirk). Use this, not `start_date`, for
  // calendar-day comparisons: `start_date` is UTC and would misfile an
  // evening activity into the wrong day for anyone outside UTC.
  start_date_local: string
  moving_time: number
  distance: number
  total_elevation_gain: number
  average_heartrate?: number
  average_speed: number
}

export async function exchangeCodeForToken(
  code: string,
): Promise<StravaTokenSet & { athleteId: number }> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`)
  const json = await res.json()
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_at,
    athleteId: json.athlete.id,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenSet> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)
  const json = await res.json()
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_at,
  }
}

export async function fetchActivitiesSince(
  accessToken: string,
  afterUnixSeconds: number,
): Promise<StravaActivity[]> {
  const url = `${STRAVA_API_BASE}/athlete/activities?after=${afterUnixSeconds}&per_page=100`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 2: Write failing tests**

`lib/strava/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exchangeCodeForToken, refreshAccessToken, fetchActivitiesSince } from './client'

describe('strava client', () => {
  const originalFetch = global.fetch
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.STRAVA_CLIENT_ID = 'test-client-id'
    process.env.STRAVA_CLIENT_SECRET = 'test-secret'
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('exchangeCodeForToken parses tokens and athlete id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_at: 1234567890,
        athlete: { id: 42 },
      }),
    }) as any

    const result = await exchangeCodeForToken('auth-code')
    expect(result).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: 1234567890,
      athleteId: 42,
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.strava.com/oauth/token',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('exchangeCodeForToken throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 }) as any
    await expect(exchangeCodeForToken('bad-code')).rejects.toThrow('Strava token exchange failed: 400')
  })

  it('refreshAccessToken parses the refreshed token set', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'access-2', refresh_token: 'refresh-2', expires_at: 1234567999 }),
    }) as any
    const result = await refreshAccessToken('refresh-1')
    expect(result).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresAt: 1234567999 })
  })

  it('fetchActivitiesSince passes the bearer token and after cursor', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1, name: 'Run', type: 'Run', sport_type: 'Run',
          start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z',
          moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96,
        },
      ],
    }) as any
    const result = await fetchActivitiesSince('access-1', 1757894400)
    expect(result).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('after=1757894400'),
      expect.objectContaining({ headers: { Authorization: 'Bearer access-1' } }),
    )
  })
})
```

- [ ] **Step 3: Run tests to verify they fail, then pass**

Run: `npm test -- lib/strava/client.test.ts`
Expected: FAIL before Step 1's file exists, PASS (4 tests) after

- [ ] **Step 4: Commit**

```bash
git add lib/strava/client.ts lib/strava/client.test.ts
git commit -m "feat: add Strava API client (read-only)"
```

---

### Task 16: Strava OAuth connect flow

**Files:**
- Create: `lib/db/stravaTokens.ts`
- Test: `lib/db/stravaTokens.test.ts`
- Create: `app/api/strava/connect/route.ts`, `app/api/strava/callback/route.ts`
- Create: `app/settings/strava/actions.ts`, `app/settings/strava/page.tsx`

**Interfaces:**
- Consumes: `exchangeCodeForToken` (Task 15), `createServerSupabase` (Task 4).
- Produces: `StravaTokens` type, `getStravaTokens(supabase)`, `upsertStravaTokens(supabase, tokens)`, `deleteStravaTokens(supabase)` — consumed by Task 17/18's sync and this task's own routes/page.

- [ ] **Step 1: Write `lib/db/stravaTokens.ts`**

```typescript
export interface StravaTokens {
  athleteId: number | null
  accessToken: string
  refreshToken: string
  expiresAt: string
  lastSyncedAt: string | null
}

function mapTokens(row: any): StravaTokens {
  return {
    athleteId: row.athlete_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
    lastSyncedAt: row.last_synced_at,
  }
}

export async function getStravaTokens(supabase: any): Promise<StravaTokens | null> {
  const { data, error } = await supabase.from('strava_tokens').select('*').maybeSingle()
  if (error) throw error
  return data ? mapTokens(data) : null
}

export async function upsertStravaTokens(
  supabase: any,
  tokens: {
    athleteId?: number | null
    accessToken: string
    refreshToken: string
    expiresAt: string
    lastSyncedAt?: string | null
  },
): Promise<StravaTokens> {
  const { data: existing } = await supabase.from('strava_tokens').select('*').maybeSingle()
  const row = {
    id: existing?.id,
    athlete_id: tokens.athleteId ?? existing?.athlete_id ?? null,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt,
    last_synced_at: tokens.lastSyncedAt ?? existing?.last_synced_at ?? null,
  }
  const { data, error } = await supabase.from('strava_tokens').upsert(row).single()
  if (error) throw error
  return mapTokens(data)
}

export async function deleteStravaTokens(supabase: any): Promise<void> {
  const { data } = await supabase.from('strava_tokens').select('*').maybeSingle()
  if (!data) return
  const { error } = await supabase.from('strava_tokens').delete().eq('id', data.id)
  if (error) throw error
}
```

- [ ] **Step 2: Write failing tests, then verify they pass**

`lib/db/stravaTokens.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import { getStravaTokens, upsertStravaTokens, deleteStravaTokens } from './stravaTokens'

describe('strava tokens db', () => {
  it('getStravaTokens returns null when never connected', async () => {
    const supabase = createFakeSupabase()
    expect(await getStravaTokens(supabase)).toBeNull()
  })

  it('upsertStravaTokens creates then updates the same row', async () => {
    const supabase = createFakeSupabase()
    const first = await upsertStravaTokens(supabase, {
      athleteId: 42, accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-09-15T00:00:00Z',
    })
    expect(first.athleteId).toBe(42)

    const second = await upsertStravaTokens(supabase, {
      accessToken: 'a2', refreshToken: 'r2', expiresAt: '2026-09-15T06:00:00Z',
    })
    expect(second.accessToken).toBe('a2')
    expect(second.athleteId).toBe(42) // preserved from first upsert
  })

  it('deleteStravaTokens removes the row', async () => {
    const supabase = createFakeSupabase()
    await upsertStravaTokens(supabase, {
      athleteId: 42, accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-09-15T00:00:00Z',
    })
    await deleteStravaTokens(supabase)
    expect(await getStravaTokens(supabase)).toBeNull()
  })
})
```

Run: `npm test -- lib/db/stravaTokens.test.ts` → FAIL then PASS (3 tests)

- [ ] **Step 3: OAuth start route**

`app/api/strava/connect/route.ts`:
```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}
```

- [ ] **Step 4: OAuth callback route**

`app/api/strava/callback/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/strava/client'
import { upsertStravaTokens } from '@/lib/db/stravaTokens'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings/strava?error=denied', request.url))
  }

  const tokens = await exchangeCodeForToken(code)
  const supabase = await createServerSupabase()
  await upsertStravaTokens(supabase, {
    athleteId: tokens.athleteId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: new Date(tokens.expiresAt * 1000).toISOString(),
  })

  return NextResponse.redirect(new URL('/settings/strava?connected=1', request.url))
}
```

- [ ] **Step 5: Settings page**

`app/settings/strava/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { deleteStravaTokens } from '@/lib/db/stravaTokens'

export async function disconnectStrava() {
  const supabase = await createServerSupabase()
  await deleteStravaTokens(supabase)
  revalidatePath('/settings/strava')
}
```

`app/settings/strava/page.tsx`:
```typescript
import { createServerSupabase } from '@/lib/supabase/server'
import { getStravaTokens } from '@/lib/db/stravaTokens'
import { disconnectStrava } from './actions'

export default async function StravaSettingsPage() {
  const supabase = await createServerSupabase()
  const tokens = await getStravaTokens(supabase)

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Strava</h1>
      {tokens ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            Connected (athlete #{tokens.athleteId}).{' '}
            {tokens.lastSyncedAt ? `Last synced ${tokens.lastSyncedAt}.` : 'Not synced yet.'}
          </p>
          <form action={disconnectStrava}>
            <button type="submit" className="rounded border px-3 py-1 text-sm">
              Disconnect
            </button>
          </form>
        </div>
      ) : (
        <a href="/api/strava/connect" className="inline-block rounded bg-[#fc4c02] px-3 py-1 text-sm text-white">
          Connect Strava
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Manual verification**

Fill in `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET`/`STRAVA_REDIRECT_URI` in
`.env.local` (Prerequisites step 3). Run `npm run dev`, visit
`/settings/strava`, click "Connect Strava", authorize on Strava's site →
confirm you land back on `/settings/strava` showing "Connected (athlete
#...)". Check the Supabase `strava_tokens` table has one row. Click
"Disconnect" → row is deleted, page shows the connect button again.

- [ ] **Step 7: Commit**

```bash
git add lib/db/stravaTokens.ts lib/db/stravaTokens.test.ts app/api/strava app/settings/strava
git commit -m "feat: add Strava OAuth connect/disconnect flow"
```

---

### Task 17: Strava sync logic (fetch, upsert, auto-match)

**Files:**
- Create: `lib/strava/sync.ts`
- Test: `lib/strava/sync.test.ts`

**Interfaces:**
- Consumes: `getStravaTokens`, `upsertStravaTokens` (Task 16); `refreshAccessToken`, `fetchActivitiesSince` (Task 15); `upsertStravaActivity`, `linkActivityToSession` (Task 8); `listSessionsInRange` (Task 7).
- Produces: `SyncResult` (`{ imported: number; matched: number }`), `syncActivities(supabase, userId: string): Promise<SyncResult>` — consumed by Task 18's cron route and manual sync button, both of which run on the admin (service-role) client and so must pass `SPORT_TRACKER_USER_ID` explicitly (see Task 8's `upsertStravaActivity`).

- [ ] **Step 1: Write `lib/strava/sync.ts`**

```typescript
import { getStravaTokens, upsertStravaTokens } from '@/lib/db/stravaTokens'
import { refreshAccessToken, fetchActivitiesSince } from './client'
import { upsertStravaActivity, linkActivityToSession } from '@/lib/db/activities'
import { listSessionsInRange } from '@/lib/db/sessions'
import type { ActivityType } from '@/lib/types'

export interface SyncResult {
  imported: number
  matched: number
}

const TOKEN_REFRESH_MARGIN_SECONDS = 300
const FIRST_SYNC_LOOKBACK_SECONDS = 90 * 24 * 60 * 60

function mapStravaTypeToActivityType(sportType: string): ActivityType {
  return sportType.toLowerCase().includes('run') ? 'running' : 'other'
}

function metersToKm(meters: number): number {
  return Math.round((meters / 1000) * 100) / 100
}

function paceFromSpeed(metersPerSecond: number): string | null {
  if (!metersPerSecond) return null
  const secondsPerKm = 1000 / metersPerSecond
  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.round(secondsPerKm % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`
}

export async function syncActivities(supabase: any, userId: string): Promise<SyncResult> {
  const tokens = await getStravaTokens(supabase)
  if (!tokens) return { imported: 0, matched: 0 }

  let accessToken = tokens.accessToken
  let refreshToken = tokens.refreshToken
  let expiresAtIso = tokens.expiresAt

  const expiresAtSeconds = Math.floor(new Date(expiresAtIso).getTime() / 1000)
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (expiresAtSeconds - nowSeconds < TOKEN_REFRESH_MARGIN_SECONDS) {
    const refreshed = await refreshAccessToken(refreshToken)
    accessToken = refreshed.accessToken
    refreshToken = refreshed.refreshToken
    expiresAtIso = new Date(refreshed.expiresAt * 1000).toISOString()
  }

  const afterUnixSeconds = tokens.lastSyncedAt
    ? Math.floor(new Date(tokens.lastSyncedAt).getTime() / 1000)
    : nowSeconds - FIRST_SYNC_LOOKBACK_SECONDS

  const stravaActivities = await fetchActivitiesSince(accessToken, afterUnixSeconds)

  let imported = 0
  let matched = 0

  for (const activity of stravaActivities) {
    // start_date_local, not start_date: the latter is UTC and would file an
    // evening activity under the wrong calendar day outside UTC.
    const date = activity.start_date_local.slice(0, 10)
    const saved = await upsertStravaActivity(supabase, {
      stravaActivityId: activity.id,
      date,
      sportType: activity.sport_type,
      durationMin: Math.round(activity.moving_time / 60),
      distanceKm: metersToKm(activity.distance),
      dplusM: Math.round(activity.total_elevation_gain),
      avgHr: activity.average_heartrate ?? null,
      pace: paceFromSpeed(activity.average_speed),
      stravaLink: `https://www.strava.com/activities/${activity.id}`,
    }, userId)
    imported += 1

    if (!saved.plannedSessionId) {
      const activityType = mapStravaTypeToActivityType(activity.sport_type)
      const candidates = (await listSessionsInRange(supabase, date, date)).filter(
        (s) => s.status !== 'done' && s.activityType === activityType,
      )
      // Auto-link only on an unambiguous match. Zero candidates or several
      // same-day/same-type candidates are both left unlinked for the user to
      // resolve manually via the history page's link control (Task 14).
      if (candidates.length === 1) {
        await linkActivityToSession(supabase, saved.id, candidates[0].id)
        matched += 1
      }
    }
  }

  await upsertStravaTokens(supabase, {
    accessToken,
    refreshToken,
    expiresAt: expiresAtIso,
    lastSyncedAt: new Date().toISOString(),
  })

  return { imported, matched }
}
```

- [ ] **Step 2: Write failing tests**

`lib/strava/sync.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import { syncActivities } from './sync'
import * as stravaClient from './client'

vi.mock('./client', () => ({
  refreshAccessToken: vi.fn(),
  fetchActivitiesSince: vi.fn(),
}))

const futureIso = new Date(Date.now() + 3600_000).toISOString()
const soonIso = new Date(Date.now() + 60_000).toISOString() // under the 5-minute refresh margin

describe('syncActivities', () => {
  beforeEach(() => {
    vi.mocked(stravaClient.fetchActivitiesSince).mockReset()
    vi.mocked(stravaClient.refreshAccessToken).mockReset()
  })

  it('does nothing when Strava is not connected', async () => {
    const supabase = createFakeSupabase()
    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 0, matched: 0 })
    expect(stravaClient.fetchActivitiesSince).not.toHaveBeenCalled()
  })

  it('imports new activities and matches a same-day compatible session', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: futureIso, last_synced_at: null },
      ],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([
      { id: 999, name: 'Morning run', type: 'Run', sport_type: 'Run', start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z', moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96 },
    ])

    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 1, matched: 1 })
    expect(stravaClient.refreshAccessToken).not.toHaveBeenCalled()
  })

  it('leaves an activity unmatched when no compatible session exists that day', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: futureIso, last_synced_at: null },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([
      { id: 999, name: 'Morning run', type: 'Run', sport_type: 'Run', start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z', moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96 },
    ])

    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 1, matched: 0 })
  })

  it('leaves an activity unmatched when several compatible sessions exist that day (ambiguous)', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: futureIso, last_synced_at: null },
      ],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
        { id: 's2', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Hill repeats', priority: 'optional', target_duration_min: 40, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([
      { id: 999, name: 'Morning run', type: 'Run', sport_type: 'Run', start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z', moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96 },
    ])

    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 1, matched: 0 })
  })

  it('refreshes the token when it is about to expire', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: soonIso, last_synced_at: null },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([])
    vi.mocked(stravaClient.refreshAccessToken).mockResolvedValue({
      accessToken: 'a2',
      refreshToken: 'r2',
      expiresAt: Math.floor(Date.now() / 1000) + 21600,
    })

    await syncActivities(supabase, 'u1')
    expect(stravaClient.refreshAccessToken).toHaveBeenCalledWith('r1')
    expect(stravaClient.fetchActivitiesSince).toHaveBeenCalledWith('a2', expect.any(Number))
  })
})
```

- [ ] **Step 3: Run tests to verify they fail, then pass**

Run: `npm test -- lib/strava/sync.test.ts`
Expected: FAIL before Step 1's file exists, PASS (5 tests) after

- [ ] **Step 4: Commit**

```bash
git add lib/strava/sync.ts lib/strava/sync.test.ts
git commit -m "feat: add Strava sync with same-day activity-type matching"
```

---

### Task 18: Cron sync + manual "Sync now" button

**Files:**
- Create: `app/api/cron/strava-sync/route.ts`, `vercel.json`
- Modify: `app/settings/strava/actions.ts`, `app/settings/strava/page.tsx`
- Create: `app/settings/strava/SyncNowButton.tsx`

**Interfaces:**
- Consumes: `createAdminSupabase` (Task 4), `syncActivities` (Task 17), `SPORT_TRACKER_USER_ID`/`CRON_SECRET` env vars.

- [ ] **Step 1: Cron route**

`app/api/cron/strava-sync/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { syncActivities } from '@/lib/strava/sync'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminSupabase()
    const result = await syncActivities(supabase, process.env.SPORT_TRACKER_USER_ID!)
    return NextResponse.json(result)
  } catch (err) {
    // Surface failures (e.g. a revoked Strava token) as a failed invocation
    // in Vercel's Cron Jobs log rather than an unlogged crash, per the
    // spec's "surface, don't fail silently" error-handling requirement.
    console.error('Strava cron sync failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown sync error' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Vercel Cron config**

`vercel.json` (repo root):
```json
{
  "crons": [
    { "path": "/api/cron/strava-sync", "schedule": "0 */3 * * *" }
  ]
}
```

Vercel automatically sends `Authorization: Bearer <value>` using your
project's `CRON_SECRET` environment variable when calling scheduled cron
routes, so no extra configuration is needed beyond setting that env var
in Vercel (Task 22).

- [ ] **Step 3: Manual sync server action**

In `app/settings/strava/actions.ts`, add:
```typescript
import { createAdminSupabase } from '@/lib/supabase/admin'
import { syncActivities } from '@/lib/strava/sync'

export async function syncNow(): Promise<
  { ok: true; imported: number; matched: number } | { ok: false; error: string }
> {
  try {
    const supabase = createAdminSupabase()
    const result = await syncActivities(supabase, process.env.SPORT_TRACKER_USER_ID!)
    revalidatePath('/settings/strava')
    revalidatePath('/history')
    revalidatePath('/calendar')
    return { ok: true, ...result }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown sync error' }
  }
}
```

- [ ] **Step 4: Sync now button**

`app/settings/strava/SyncNowButton.tsx`:
```typescript
'use client'

import { useState, useTransition } from 'react'
import { syncNow } from './actions'

export function SyncNowButton() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    startTransition(async () => {
      const result = await syncNow()
      setMessage(
        result.ok
          ? `Imported ${result.imported}, matched ${result.matched}.`
          : `Sync failed: ${result.error}. Try disconnecting and reconnecting Strava above.`,
      )
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-fit rounded border px-3 py-1 text-sm"
      >
        {isPending ? 'Syncing…' : 'Sync now'}
      </button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  )
}
```

In `app/settings/strava/page.tsx`, import it and render it next to the
Disconnect form:
```typescript
import { SyncNowButton } from './SyncNowButton'
```
```typescript
          <form action={disconnectStrava}>
            <button type="submit" className="rounded border px-3 py-1 text-sm">
              Disconnect
            </button>
          </form>
          <SyncNowButton />
```
(replace the existing `<form action={disconnectStrava}>...</form>` block
with the above, which adds `<SyncNowButton />` right after it)

- [ ] **Step 5: Manual verification**

With Strava connected (Task 16) and `SPORT_TRACKER_USER_ID` set in
`.env.local`, click "Sync now" → message shows imported/matched counts;
check `/history` for the new Strava-sourced row(s). Deploy to Vercel
(Task 22) and confirm the cron job appears under the project's Cron Jobs
tab and its first run succeeds (200 response in the invocation log).

- [ ] **Step 6: Commit**

```bash
git add app/api/cron vercel.json app/settings/strava
git commit -m "feat: add cron-driven and manual Strava sync triggers"
```

---

### Task 19: Weekly volume aggregation

**Files:**
- Create: `lib/progress/weeklyVolume.ts`
- Test: `lib/progress/weeklyVolume.test.ts`

**Interfaces:**
- Consumes: `Activity` (Task 2).
- Produces: `WeeklyVolumePoint` (`{ weekStart: string; distanceKm: number; dplusM: number }`), `computeWeeklyVolume(activities): WeeklyVolumePoint[]` — consumed by Task 20's chart.

- [ ] **Step 1: Write the aggregation function**

`lib/progress/weeklyVolume.ts`:
```typescript
import { startOfWeek, format } from 'date-fns'
import type { Activity } from '@/lib/types'

export interface WeeklyVolumePoint {
  weekStart: string
  distanceKm: number
  dplusM: number
}

export function computeWeeklyVolume(activities: Activity[]): WeeklyVolumePoint[] {
  const running = activities.filter((a) => a.sportType.toLowerCase().includes('run'))
  const byWeek = new Map<string, { distanceKm: number; dplusM: number }>()

  for (const a of running) {
    const weekStart = format(startOfWeek(new Date(a.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const bucket = byWeek.get(weekStart) ?? { distanceKm: 0, dplusM: 0 }
    bucket.distanceKm += a.distanceKm ?? 0
    bucket.dplusM += a.dplusM ?? 0
    byWeek.set(weekStart, bucket)
  }

  return Array.from(byWeek.entries())
    .map(([weekStart, totals]) => ({
      weekStart,
      distanceKm: Math.round(totals.distanceKm * 10) / 10,
      dplusM: Math.round(totals.dplusM),
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}
```

- [ ] **Step 2: Write failing tests**

`lib/progress/weeklyVolume.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeWeeklyVolume } from './weeklyVolume'
import type { Activity } from '@/lib/types'

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 'a', userId: 'u1', source: 'strava', stravaActivityId: 1, date: '2026-09-15',
    sportType: 'Run', durationMin: 45, distanceKm: 8, dplusM: 150, avgHr: null, pace: null,
    rpe: null, notes: null, stravaLink: null, plannedSessionId: null, createdAt: '2026-09-15T00:00:00Z',
    ...overrides,
  }
}

describe('computeWeeklyVolume', () => {
  it('sums distance and D+ within the same week (Monday start)', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', date: '2026-09-15', distanceKm: 8, dplusM: 150 }), // Tuesday
      makeActivity({ id: 'a2', date: '2026-09-20', distanceKm: 10, dplusM: 250 }), // Sunday, same week
    ])
    expect(result).toEqual([{ weekStart: '2026-09-14', distanceKm: 18, dplusM: 400 }])
  })

  it('splits activities in different weeks', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', date: '2026-09-15', distanceKm: 8, dplusM: 150 }),
      makeActivity({ id: 'a2', date: '2026-09-22', distanceKm: 9, dplusM: 200 }),
    ])
    expect(result).toEqual([
      { weekStart: '2026-09-14', distanceKm: 8, dplusM: 150 },
      { weekStart: '2026-09-21', distanceKm: 9, dplusM: 200 },
    ])
  })

  it('ignores non-running activities', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', sportType: 'WeightTraining', date: '2026-09-15', distanceKm: null, dplusM: null }),
    ])
    expect(result).toEqual([])
  })

  it('sorts weeks chronologically', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', date: '2026-09-22', distanceKm: 9, dplusM: 200 }),
      makeActivity({ id: 'a2', date: '2026-09-15', distanceKm: 8, dplusM: 150 }),
    ])
    expect(result.map((p) => p.weekStart)).toEqual(['2026-09-14', '2026-09-21'])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail, then pass**

Run: `npm test -- lib/progress/weeklyVolume.test.ts`
Expected: FAIL before Step 1's file exists, PASS (4 tests) after

- [ ] **Step 4: Commit**

```bash
git add lib/progress/weeklyVolume.ts lib/progress/weeklyVolume.test.ts
git commit -m "feat: add weekly running volume aggregation"
```

---

### Task 20: Progress page with weekly volume chart

**Files:**
- Create: `app/progress/page.tsx`, `app/progress/WeeklyVolumeChart.tsx`

**Interfaces:**
- Consumes: `listActivities` (Task 8), `computeWeeklyVolume`, `WeeklyVolumePoint` (Task 19), `createServerSupabase` (Task 4).

UI-only over an already-tested aggregation function — verified manually.

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Chart component**

`app/progress/WeeklyVolumeChart.tsx`:
```typescript
'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { WeeklyVolumePoint } from '@/lib/progress/weeklyVolume'

export function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="weekStart" />
        <YAxis yAxisId="left" label={{ value: 'km', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: 'D+ (m)', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="distanceKm" name="Distance (km)" fill="#2563eb" />
        <Line yAxisId="right" dataKey="dplusM" name="D+ (m)" stroke="#16a34a" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Progress page**

`app/progress/page.tsx`:
```typescript
import { createServerSupabase } from '@/lib/supabase/server'
import { listActivities } from '@/lib/db/activities'
import { computeWeeklyVolume } from '@/lib/progress/weeklyVolume'
import { WeeklyVolumeChart } from './WeeklyVolumeChart'

export default async function ProgressPage() {
  const supabase = await createServerSupabase()
  const activities = await listActivities(supabase, { limit: 500 })
  const weeklyVolume = computeWeeklyVolume(activities)

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Progress</h1>
      {weeklyVolume.length === 0 ? (
        <p className="text-sm text-gray-500">No running activity yet.</p>
      ) : (
        <WeeklyVolumeChart data={weeklyVolume} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Manual verification**

With a few running activities in the database (manual or Strava-synced),
visit `/progress` → confirm the chart renders bars for weekly distance and
a line for weekly D+, one point per week, in chronological order.

- [ ] **Step 5: Commit**

```bash
git add app/progress package.json package-lock.json
git commit -m "feat: add weekly volume progress chart"
```

---

### Task 21: One-time migration from the Google Sheet

**Files:**
- Create: `scripts/seedData.ts`, `scripts/migrate-from-sheet.ts`
- Modify: `package.json` (add `migrate:sheet` script)

**Interfaces:**
- Consumes: `createAdminSupabase` (Task 4); `SPORT_TRACKER_USER_ID` env var.

This script writes directly to `plans`/`plan_phases`/`planned_sessions` via
raw table calls (not the `lib/db` wrappers), setting `user_id` explicitly —
the service-role client has no session JWT for those tables' `default
auth.uid()` to fall back on, the same issue documented in Task 8.

- [ ] **Step 1: Install a TS script runner**

```bash
npm install -D tsx dotenv
```

- [ ] **Step 2: Seed data transcribed from the sheet**

`scripts/seedData.ts`:
```typescript
export const PLAN = {
  name: 'Sierre-Zinal 2027',
  raceName: 'Sierre-Zinal',
  raceDate: '2027-08-07',
  raceDistanceKm: 31,
  raceElevationM: 2200,
  currentBenchmark: '7 km en 45 min',
  notes:
    'Autres entraînements: Flag football lundi et mercredi.\n\n' +
    "Règles d'ajustement:\n" +
    '- Fatigue élevée ou jambes lourdes: supprimer le vendredi et raccourcir la sortie longue de 20 à 30 %.\n' +
    '- Douleur qui modifie la foulée: arrêter la séance et ne pas compenser par une séance plus dure.\n' +
    '- Semaine très chargée au flag: garder le mardi facile et transformer le week-end en randonnée active.',
}

export const PHASES = [
  { name: 'Base', startDate: '2026-09-01', endDate: '2026-12-31', priorityDescription: 'Régularité et endurance facile', targetLongRunMinKm: 10, targetLongRunMaxKm: 14, targetWeeklyDplusMinM: 200, targetWeeklyDplusMaxM: 500, sortOrder: 1 },
  { name: 'Endurance vallonnée', startDate: '2027-01-01', endDate: '2027-03-31', priorityDescription: "Temps d'effort et sentiers", targetLongRunMinKm: 14, targetLongRunMaxKm: 18, targetWeeklyDplusMinM: 500, targetWeeklyDplusMaxM: 900, sortOrder: 2 },
  { name: 'Montée et résistance', startDate: '2027-04-01', endDate: '2027-05-31', priorityDescription: 'Côtes longues et renforcement', targetLongRunMinKm: 16, targetLongRunMaxKm: 22, targetWeeklyDplusMinM: 800, targetWeeklyDplusMaxM: 1400, sortOrder: 3 },
  { name: 'Spécifique trail', startDate: '2027-06-01', endDate: '2027-07-15', priorityDescription: 'Longues montées et descentes', targetLongRunMinKm: 20, targetLongRunMaxKm: 26, targetWeeklyDplusMinM: 1200, targetWeeklyDplusMaxM: 1800, sortOrder: 4 },
  { name: 'Affûtage', startDate: '2027-07-16', endDate: '2027-08-06', priorityDescription: 'Réduire le volume, garder du rythme', targetLongRunMinKm: 10, targetLongRunMaxKm: 16, targetWeeklyDplusMinM: 300, targetWeeklyDplusMaxM: 700, sortOrder: 5 },
]

export type RawSession = [
  date: string,
  activityType: 'flag_football' | 'running',
  sessionName: string,
  priority: 'fixed' | 'essential' | 'optional',
  targetDurationMin: number | null,
  targetDistanceKm: number | null,
  targetDplusM: number | null,
  intensity: string,
  instructions: string,
]

export const RAW_SESSIONS: RawSession[] = [
  ['2026-09-14', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-09-15', 'running', 'Footing facile', 'essential', 45, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-09-16', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-09-18', 'running', 'Footing très facile', 'optional', 35, null, null, 'Facile', 'Terrain plat'],
  ['2026-09-20', 'running', 'Sortie longue / trail', 'essential', null, 8, 150, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-09-21', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-09-22', 'running', 'Footing facile', 'essential', 45, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-09-23', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-09-25', 'running', 'Côtes courtes', 'optional', 40, null, null, 'Modéré', '6 × 45 s en côte, récupération en descente'],
  ['2026-09-27', 'running', 'Sortie longue / trail', 'essential', null, 9, 200, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-09-28', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-09-29', 'running', 'Footing facile', 'essential', 45, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-09-30', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-10-02', 'running', 'Repos ou mobilité', 'optional', null, null, null, 'Récupération', 'Option à supprimer en priorité'],
  ['2026-10-04', 'running', 'Sortie longue / trail', 'essential', null, 8, 150, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-10-05', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-10-06', 'running', 'Footing facile', 'essential', 50, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-10-07', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-10-09', 'running', 'Footing vallonné', 'optional', 40, null, null, 'Facile', 'Rester en aisance respiratoire'],
  ['2026-10-11', 'running', 'Sortie longue / trail', 'essential', null, 10, 250, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-10-12', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-10-13', 'running', 'Footing facile', 'essential', 50, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-10-14', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-10-16', 'running', 'Côtes courtes', 'optional', 40, null, null, 'Modéré', '8 × 45 s en côte'],
  ['2026-10-18', 'running', 'Sortie longue / trail', 'essential', null, 10, 300, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-10-19', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-10-20', 'running', 'Footing facile', 'essential', 45, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-10-21', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-10-23', 'running', 'Repos ou mobilité', 'optional', null, null, null, 'Récupération', 'Semaine allégée'],
  ['2026-10-25', 'running', 'Sortie longue / trail', 'essential', null, 8, 180, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-10-26', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-10-27', 'running', 'Footing facile', 'essential', 50, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-10-28', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-10-30', 'running', 'Footing vallonné', 'optional', 45, null, null, 'Facile', 'Sans chercher la vitesse'],
  ['2026-11-01', 'running', 'Sortie longue / trail', 'essential', null, 11, 350, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-11-02', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-11-03', 'running', 'Footing facile', 'essential', 50, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-11-04', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-11-06', 'running', 'Côtes', 'optional', 45, null, null, 'Modéré', '6 × 60 s en côte'],
  ['2026-11-08', 'running', 'Sortie longue / trail', 'essential', null, 12, 400, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-11-09', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-11-10', 'running', 'Footing facile', 'essential', 45, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-11-11', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-11-13', 'running', 'Repos ou mobilité', 'optional', null, null, null, 'Récupération', 'Semaine allégée'],
  ['2026-11-15', 'running', 'Sortie longue / trail', 'essential', null, 9, 220, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-11-16', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-11-17', 'running', 'Footing facile', 'essential', 55, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-11-18', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-11-20', 'running', 'Footing vallonné', 'optional', 45, null, null, 'Facile', 'Souple et relâché'],
  ['2026-11-22', 'running', 'Sortie longue / trail', 'essential', null, 12, 450, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-11-23', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-11-24', 'running', 'Footing facile', 'essential', 55, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-11-25', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-11-27', 'running', 'Côtes', 'optional', 45, null, null, 'Modéré', '8 × 60 s en côte'],
  ['2026-11-29', 'running', 'Sortie longue / trail', 'essential', null, 13, 500, 'Facile', 'Marcher dans les montées si nécessaire'],
  ['2026-11-30', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Échauffement complet'],
  ['2026-12-01', 'running', 'Footing facile', 'essential', 45, null, null, 'Facile', 'Allure conversationnelle'],
  ['2026-12-02', 'flag_football', 'Entraînement habituel', 'fixed', null, null, null, 'Intense', 'Hydratation et récupération après séance'],
  ['2026-12-04', 'running', 'Repos ou mobilité', 'optional', null, null, null, 'Récupération', 'Semaine allégée'],
  ['2026-12-06', 'running', 'Sortie longue / trail', 'essential', null, 10, 250, 'Facile', 'Marcher dans les montées si nécessaire'],
]
```

- [ ] **Step 3: Migration runner**

`scripts/migrate-from-sheet.ts`:
```typescript
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createAdminSupabase } from '../lib/supabase/admin'
import { PLAN, PHASES, RAW_SESSIONS } from './seedData'

async function main() {
  const userId = process.env.SPORT_TRACKER_USER_ID
  if (!userId) throw new Error('SPORT_TRACKER_USER_ID is not set in .env.local')

  const supabase = createAdminSupabase()

  const { data: planRow, error: planError } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      name: PLAN.name,
      status: 'active',
      race_name: PLAN.raceName,
      race_date: PLAN.raceDate,
      race_distance_km: PLAN.raceDistanceKm,
      race_elevation_m: PLAN.raceElevationM,
      current_benchmark: PLAN.currentBenchmark,
      notes: PLAN.notes,
    })
    .select()
    .single()
  if (planError) throw planError
  const planId: string = planRow.id
  console.log(`Created plan ${planId}`)

  for (const phase of PHASES) {
    const { error } = await supabase.from('plan_phases').insert({
      user_id: userId,
      plan_id: planId,
      name: phase.name,
      start_date: phase.startDate,
      end_date: phase.endDate,
      priority_description: phase.priorityDescription,
      target_long_run_min_km: phase.targetLongRunMinKm,
      target_long_run_max_km: phase.targetLongRunMaxKm,
      target_weekly_dplus_min_m: phase.targetWeeklyDplusMinM,
      target_weekly_dplus_max_m: phase.targetWeeklyDplusMaxM,
      sort_order: phase.sortOrder,
    })
    if (error) throw error
  }
  console.log(`Created ${PHASES.length} phases`)

  for (const [
    date, activityType, sessionName, priority,
    targetDurationMin, targetDistanceKm, targetDplusM,
    intensity, instructions,
  ] of RAW_SESSIONS) {
    const { error } = await supabase.from('planned_sessions').insert({
      user_id: userId,
      plan_id: planId,
      date,
      activity_type: activityType,
      session_name: sessionName,
      priority,
      target_duration_min: targetDurationMin,
      target_distance_km: targetDistanceKm,
      target_dplus_m: targetDplusM,
      intensity,
      instructions,
      status: 'todo',
    })
    if (error) throw error
  }
  console.log(`Created ${RAW_SESSIONS.length} planned sessions`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
```

- [ ] **Step 4: Add the npm script**

In `package.json`'s `"scripts"`, add:
```json
"migrate:sheet": "tsx scripts/migrate-from-sheet.ts"
```

- [ ] **Step 5: Run it and verify**

Run: `npm run migrate:sheet`
Expected output: `Created plan <uuid>`, `Created 5 phases`,
`Created 60 planned sessions`. Then visit `/plan` → confirm the Sierre-
Zinal 2027 plan and its 5 phases appear; visit `/calendar` and navigate to
September–December 2026 → confirm the Monday/Wednesday flag football
blocks and Tuesday/Friday/Sunday running sessions appear on the right
days.

This script is meant to run once. Re-running it would create a second
`plans` row (no `active`-uniqueness constraint prevents that) — if you
need to re-run it during testing, delete the previously created plan (its
phases and sessions cascade-delete with it) in the Supabase Table Editor
first.

- [ ] **Step 6: Commit**

```bash
git add scripts package.json package-lock.json
git commit -m "feat: add one-time migration script from the Google Sheet"
```

---

### Task 22: Deploy to Vercel

**Files:** none (configuration/deployment only)

**Interfaces:** none — this task wires up hosting for everything built in
Tasks 1–21.

- [ ] **Step 1: Push and connect**

Push the repo to GitHub (or your Vercel project's connected remote) and
confirm the Vercel project from Prerequisites step 4 is linked to it.

- [ ] **Step 2: Set environment variables in Vercel**

In the Vercel project's Settings → Environment Variables, add all of:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `SPORT_TRACKER_USER_ID`, `STRAVA_CLIENT_ID`,
`STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` (now
`https://<your-domain>/api/strava/callback`), `CRON_SECRET` (generate a
random value, e.g. `openssl rand -hex 32`).

- [ ] **Step 3: Update the Strava app's callback domain**

In your Strava API app settings (Prerequisites step 3), change the
Authorization Callback Domain from `localhost` to your Vercel deployment's
domain (bare domain, no `https://` or path).

- [ ] **Step 4: Deploy**

Trigger a deployment (push to the connected branch, or `vercel --prod`
from the Vercel CLI if installed). Confirm the build succeeds.

- [ ] **Step 5: Smoke test the deployed app**

Visit the deployed URL:
- `/login` → sign in with your Supabase user.
- `/calendar` → your migrated plan's sessions render (run Task 21's
  migration against production data first if you haven't already, using
  production env vars locally: `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SECRET_KEY`, and `SPORT_TRACKER_USER_ID` in `.env.local`
  pointed at the production Supabase project — the migration script and
  the deployed app share the same Supabase project, so there is nothing
  Vercel-specific to re-run).
- `/settings/strava` → connect Strava (with the updated callback domain)
  and click "Sync now" → confirms both the OAuth flow and the API call
  work from the deployed environment.
- Vercel project → Cron Jobs tab → confirm `/api/cron/strava-sync` is
  listed with the 3-hour schedule, and its first automatic invocation
  (visible in Deployments → Functions logs) returns `200`.

- [ ] **Step 6: Commit** (if Step 2's `vercel.json` or any config changed)

```bash
git add -A
git commit -m "chore: finalize Vercel deployment configuration" --allow-empty
```
