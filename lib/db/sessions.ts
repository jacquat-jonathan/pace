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
