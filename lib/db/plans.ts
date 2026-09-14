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

  const { data, error } = await supabase.from('plans').update(row).eq('id', id).select().single()
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
  const { data, error } = await supabase.from('plan_phases').upsert(row).select().single()
  if (error) throw error
  return mapPhase(data)
}

export async function deletePhase(supabase: any, id: string): Promise<void> {
  const { error } = await supabase.from('plan_phases').delete().eq('id', id)
  if (error) throw error
}
