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
