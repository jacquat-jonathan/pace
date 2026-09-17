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

export async function getActivityById(supabase: any, id: string): Promise<Activity | null> {
  const { data, error } = await supabase.from('activities').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapActivity(data) : null
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
  const { data, error } = await supabase.from('activities').insert(row).select().single()
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
  // Strava-sourced core metrics are never user-editable, per the spec's
  // global constraint — enforced here (not just in the UI) so every caller,
  // present and future, gets the same guarantee regardless of what it passes.
  const { data: existing, error: fetchError } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError

  const row: Record<string, any> = {}
  if ('rpe' in patch) row.rpe = patch.rpe
  if ('notes' in patch) row.notes = patch.notes
  if ('plannedSessionId' in patch) row.planned_session_id = patch.plannedSessionId
  if (existing?.source !== 'strava') {
    if ('date' in patch) row.date = patch.date
    if ('sportType' in patch) row.sport_type = patch.sportType
    if ('durationMin' in patch) row.duration_min = patch.durationMin
    if ('distanceKm' in patch) row.distance_km = patch.distanceKm
    if ('dplusM' in patch) row.dplus_m = patch.dplusM
    if ('avgHr' in patch) row.avg_hr = patch.avgHr
  }

  const { data, error } = await supabase.from('activities').update(row).eq('id', id).select().single()
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
  const { data, error } = await supabase.from('activities').upsert(row).select().single()
  if (error) throw error
  return mapActivity(data)
}

export async function linkActivityToSession(
  supabase: any,
  activityId: string,
  sessionId: string,
): Promise<void> {
  // Clear this activity's previous session link, if any, so the old session
  // doesn't keep a stale linked_activity_id pointing at an activity that has
  // since moved elsewhere.
  const { data: activity, error: activityFetchError } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .maybeSingle()
  if (activityFetchError) throw activityFetchError
  if (activity?.planned_session_id && activity.planned_session_id !== sessionId) {
    const { error: staleSessionError } = await supabase
      .from('planned_sessions')
      .update({ linked_activity_id: null })
      .eq('id', activity.planned_session_id)
    if (staleSessionError) throw staleSessionError
  }

  // Clear the target session's previous activity link, if any, so two
  // activities can never both claim to be linked to the same session.
  const { data: session, error: sessionFetchError } = await supabase
    .from('planned_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessionFetchError) throw sessionFetchError
  if (session?.linked_activity_id && session.linked_activity_id !== activityId) {
    const { error: staleActivityError } = await supabase
      .from('activities')
      .update({ planned_session_id: null })
      .eq('id', session.linked_activity_id)
    if (staleActivityError) throw staleActivityError
  }

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
