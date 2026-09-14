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
