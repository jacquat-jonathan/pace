import { createServerSupabase } from '@/lib/supabase/server'
import { listActivities } from '@/lib/db/activities'
import { computeWeeklyVolume } from '@/lib/progress/weeklyVolume'
import { WeeklyVolumeChart } from './WeeklyVolumeChart'

export default async function ProgressPage() {
  const supabase = await createServerSupabase()
  const activities = await listActivities(supabase, { limit: 500 })
  const weeklyVolume = computeWeeklyVolume(activities)
  const totalDistance = weeklyVolume.reduce((sum, week) => sum + week.distanceKm, 0)
  const totalElevation = weeklyVolume.reduce((sum, week) => sum + week.dplusM, 0)
  const averageDistance = weeklyVolume.length ? totalDistance / weeklyVolume.length : 0

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Performance</p>
          <h1 className="page-title">Your progress</h1>
          <p className="page-description">Weekly running volume and climbing load, together in one honest view.</p>
        </div>
      </header>
      {weeklyVolume.length === 0 ? (
        <div className="card empty-state"><div><strong>No running activity yet</strong><p>Your weekly volume will appear here after your first run.</p></div></div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card"><span className="stat-label">Weeks tracked</span><span className="stat-value">{weeklyVolume.length}</span></div>
            <div className="stat-card"><span className="stat-label">Total distance</span><span className="stat-value">{Math.round(totalDistance)}</span><span className="stat-unit">km</span></div>
            <div className="stat-card"><span className="stat-label">Total climbing</span><span className="stat-value">{Math.round(totalElevation).toLocaleString()}</span><span className="stat-unit">m</span></div>
            <div className="stat-card"><span className="stat-label">Weekly average</span><span className="stat-value">{averageDistance.toFixed(1)}</span><span className="stat-unit">km</span></div>
          </div>
          <div className="card">
            <div className="card-header"><div><h2 className="card-title">Weekly training load</h2><p className="card-kicker">Distance and elevation gain by week</p></div></div>
            <div className="card-body"><WeeklyVolumeChart data={weeklyVolume} /></div>
          </div>
        </>
      )}
    </div>
  )
}
