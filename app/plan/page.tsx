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
