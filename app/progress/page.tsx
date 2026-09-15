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
