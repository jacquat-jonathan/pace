import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import { syncActivities } from './sync'
import * as stravaClient from './client'

vi.mock('./client', () => ({
  refreshAccessToken: vi.fn(),
  fetchActivitiesSince: vi.fn(),
}))

const futureIso = new Date(Date.now() + 3600_000).toISOString()
const soonIso = new Date(Date.now() + 60_000).toISOString() // under the 5-minute refresh margin

describe('syncActivities', () => {
  beforeEach(() => {
    vi.mocked(stravaClient.fetchActivitiesSince).mockReset()
    vi.mocked(stravaClient.refreshAccessToken).mockReset()
  })

  it('does nothing when Strava is not connected', async () => {
    const supabase = createFakeSupabase()
    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 0, matched: 0 })
    expect(stravaClient.fetchActivitiesSince).not.toHaveBeenCalled()
  })

  it('imports new activities and matches a same-day compatible session', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: futureIso, last_synced_at: null },
      ],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([
      { id: 999, name: 'Morning run', type: 'Run', sport_type: 'Run', start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z', moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96 },
    ])

    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 1, matched: 1 })
    expect(stravaClient.refreshAccessToken).not.toHaveBeenCalled()
  })

  it('leaves an activity unmatched when no compatible session exists that day', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: futureIso, last_synced_at: null },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([
      { id: 999, name: 'Morning run', type: 'Run', sport_type: 'Run', start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z', moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96 },
    ])

    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 1, matched: 0 })
  })

  it('leaves an activity unmatched when several compatible sessions exist that day (ambiguous)', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: futureIso, last_synced_at: null },
      ],
      planned_sessions: [
        { id: 's1', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run', priority: 'essential', target_duration_min: 45, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
        { id: 's2', user_id: 'u1', plan_id: 'p1', date: '2026-09-15', activity_type: 'running', session_name: 'Hill repeats', priority: 'optional', target_duration_min: 40, target_distance_km: null, target_dplus_m: null, intensity: null, instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z' },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([
      { id: 999, name: 'Morning run', type: 'Run', sport_type: 'Run', start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z', moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96 },
    ])

    const result = await syncActivities(supabase, 'u1')
    expect(result).toEqual({ imported: 1, matched: 0 })
  })

  it('refreshes the token when it is about to expire', async () => {
    const supabase = createFakeSupabase({
      strava_tokens: [
        { id: 't1', user_id: 'u1', athlete_id: 42, access_token: 'a1', refresh_token: 'r1', expires_at: soonIso, last_synced_at: null },
      ],
    })
    vi.mocked(stravaClient.fetchActivitiesSince).mockResolvedValue([])
    vi.mocked(stravaClient.refreshAccessToken).mockResolvedValue({
      accessToken: 'a2',
      refreshToken: 'r2',
      expiresAt: Math.floor(Date.now() / 1000) + 21600,
    })

    await syncActivities(supabase, 'u1')
    expect(stravaClient.refreshAccessToken).toHaveBeenCalledWith('r1')
    expect(stravaClient.fetchActivitiesSince).toHaveBeenCalledWith('a2', expect.any(Number))
  })
})
