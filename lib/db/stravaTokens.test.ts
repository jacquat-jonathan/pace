import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import { getStravaTokens, upsertStravaTokens, deleteStravaTokens } from './stravaTokens'

describe('strava tokens db', () => {
  it('getStravaTokens returns null when never connected', async () => {
    const supabase = createFakeSupabase()
    expect(await getStravaTokens(supabase)).toBeNull()
  })

  it('upsertStravaTokens creates then updates the same row', async () => {
    const supabase = createFakeSupabase()
    const first = await upsertStravaTokens(supabase, {
      userId: 'user-1', athleteId: 42, accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-09-15T00:00:00Z',
    })
    expect(first.athleteId).toBe(42)

    const second = await upsertStravaTokens(supabase, {
      userId: 'user-1', accessToken: 'a2', refreshToken: 'r2', expiresAt: '2026-09-15T06:00:00Z',
    })
    expect(second.accessToken).toBe('a2')
    expect(second.athleteId).toBe(42) // preserved from first upsert
  })

  it('upsertStravaTokens always sends a user_id, even on the token-refresh path with no session', async () => {
    // The `user_id` column defaults to auth.uid(), which is null when this
    // runs under the service-role client (sync/cron have no session) — the
    // row must set it explicitly or the not-null constraint rejects the insert.
    const supabase = createFakeSupabase()
    await upsertStravaTokens(supabase, {
      userId: 'user-1', accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-09-15T00:00:00Z',
    })
    expect(supabase._tables.strava_tokens[0].user_id).toBe('user-1')
  })

  it('deleteStravaTokens removes the row', async () => {
    const supabase = createFakeSupabase()
    await upsertStravaTokens(supabase, {
      userId: 'user-1', athleteId: 42, accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-09-15T00:00:00Z',
    })
    await deleteStravaTokens(supabase)
    expect(await getStravaTokens(supabase)).toBeNull()
  })
})
