import { createServerSupabase } from '@/lib/supabase/server'
import { listActivities } from '@/lib/db/activities'
import { ActivityTable } from './ActivityTable'

export default async function HistoryPage() {
  const supabase = await createServerSupabase()
  const activities = await listActivities(supabase, { limit: 100 })
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Activity log</p>
          <h1 className="page-title">Training history</h1>
          <p className="page-description">Every completed effort, whether it came from Strava or was logged by hand.</p>
        </div>
      </header>
      <ActivityTable initialActivities={activities} />
    </div>
  )
}
