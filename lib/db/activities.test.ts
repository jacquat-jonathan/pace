import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import {
  listActivities,
  createManualActivity,
  updateActivity,
  upsertStravaActivity,
  linkActivityToSession,
  unlinkActivity,
} from './activities'

const baseActivity = {
  user_id: 'u1', source: 'manual', strava_activity_id: null, sport_type: 'running',
  duration_min: 45, distance_km: 8, dplus_m: 150, avg_hr: null, pace: null,
  rpe: null, notes: null, strava_link: null, planned_session_id: null,
  created_at: '2026-09-15T00:00:00Z',
}

describe('activities db', () => {
  it('listActivities orders newest first and respects limit', async () => {
    const supabase = createFakeSupabase({
      activities: [
        { ...baseActivity, id: 'a1', date: '2026-09-10' },
        { ...baseActivity, id: 'a2', date: '2026-09-20' },
      ],
    })
    const result = await listActivities(supabase, { limit: 1 })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a2')
  })

  it('createManualActivity defaults source to manual', async () => {
    const supabase = createFakeSupabase()
    const created = await createManualActivity(supabase, {
      date: '2026-09-15', sportType: 'flag_football', durationMin: 60,
      distanceKm: null, dplusM: null, avgHr: null, rpe: 7, notes: 'Good session',
      plannedSessionId: null,
    })
    expect(created.source).toBe('manual')
    expect(created.rpe).toBe(7)
  })

  it('updateActivity only touches editable fields', async () => {
    const supabase = createFakeSupabase({
      activities: [{ ...baseActivity, id: 'a1', date: '2026-09-15', source: 'strava' }],
    })
    const updated = await updateActivity(supabase, 'a1', { rpe: 6, notes: 'Felt easy' })
    expect(updated.rpe).toBe(6)
    expect(updated.distanceKm).toBe(8)
  })

  it('upsertStravaActivity inserts new, then updates same row on re-sync', async () => {
    const supabase = createFakeSupabase()
    const first = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 45,
      distanceKm: 8, dplusM: 150, avgHr: 150, pace: '5:37/km', stravaLink: 'https://strava.com/activities/999',
    })
    const second = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 46,
      distanceKm: 8.1, dplusM: 150, avgHr: 151, pace: '5:40/km', stravaLink: 'https://strava.com/activities/999',
    })
    expect(second.id).toBe(first.id)
    expect(second.distanceKm).toBe(8.1)
    const all = await listActivities(supabase)
    expect(all).toHaveLength(1)
  })

  it('upsertStravaActivity preserves existing rpe/notes on re-sync', async () => {
    const supabase = createFakeSupabase()
    const created = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 45,
      distanceKm: 8, dplusM: 150, avgHr: 150, pace: '5:37/km', stravaLink: 'https://strava.com/activities/999',
    })
    await updateActivity(supabase, created.id, { rpe: 8, notes: 'Hard' })
    const resynced = await upsertStravaActivity(supabase, {
      stravaActivityId: 999, date: '2026-09-15', sportType: 'Run', durationMin: 45,
      distanceKm: 8, dplusM: 150, avgHr: 150, pace: '5:37/km', stravaLink: 'https://strava.com/activities/999',
    })
    expect(resynced.rpe).toBe(8)
    expect(resynced.notes).toBe('Hard')
  })

  it('linkActivityToSession links both sides and marks session done', async () => {
    const supabase = createFakeSupabase({
      activities: [{ ...baseActivity, id: 'a1', date: '2026-09-15' }],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Long run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    await linkActivityToSession(supabase, 'a1', 's1')
    const [activity] = await listActivities(supabase)
    expect(activity.plannedSessionId).toBe('s1')
  })

  it('unlinkActivity clears both sides', async () => {
    const supabase = createFakeSupabase({
      activities: [{ ...baseActivity, id: 'a1', date: '2026-09-15', planned_session_id: 's1' }],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Long run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'done', linked_activity_id: 'a1', created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    await unlinkActivity(supabase, 'a1')
    const [activity] = await listActivities(supabase)
    expect(activity.plannedSessionId).toBeNull()
  })
})
