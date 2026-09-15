import { config } from 'dotenv'
config({ path: '.env.local' })

import { createAdminSupabase } from '../lib/supabase/admin'
import { PLAN, PHASES, RAW_SESSIONS } from './seedData'

async function main() {
  const userId = process.env.SPORT_TRACKER_USER_ID
  if (!userId) throw new Error('SPORT_TRACKER_USER_ID is not set in .env.local')

  const supabase = createAdminSupabase()

  // This migration is a one-time import, but nothing stops it being run twice.
  // A second run would insert a second active plan, and `getActivePlan`'s
  // `.eq('status','active').maybeSingle()` errors outright on multiple rows —
  // breaking /plan. Refuse to run rather than corrupt the invariant.
  const { data: existingPlan, error: checkError } = await supabase
    .from('plans')
    .select('id')
    .eq('status', 'active')
    .maybeSingle()
  if (checkError) throw checkError
  if (existingPlan) {
    console.error(
      `An active plan already exists (id: ${existingPlan.id}). Aborting to avoid creating a duplicate. ` +
        'Delete it in the Supabase Table Editor first if you intend to re-run this migration.',
    )
    process.exit(1)
  }

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
