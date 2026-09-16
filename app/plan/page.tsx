import { createServerSupabase } from '@/lib/supabase/server'
import { getActivePlan, listPhases } from '@/lib/db/plans'
import { PlanClient } from './PlanClient'

export default async function PlanPage() {
  const supabase = await createServerSupabase()
  const plan = await getActivePlan(supabase)
  if (!plan) {
    return <div className="page page-narrow"><div className="card empty-state"><div><strong>No active plan yet</strong><p>Create one in Supabase or run the migration script to get started.</p></div></div></div>
  }
  const phases = await listPhases(supabase, plan.id)
  return <PlanClient plan={plan} phases={phases} />
}
