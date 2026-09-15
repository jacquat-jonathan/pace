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
      athleteId: 42, accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-09-15T00:00:00Z',
    })
    expect(first.athleteId).toBe(42)

    const second = await upsertStravaTokens(supabase, {
      accessToken: 'a2', refreshToken: 'r2', expiresAt: '2026-09-15T06:00:00Z',
    })
    expect(second.accessToken).toBe('a2')
    expect(second.athleteId).toBe(42) // preserved from first upsert
  })

  it('deleteStravaTokens removes the row', async () => {
    const supabase = createFakeSupabase()
    await upsertStravaTokens(supabase, {
      athleteId: 42, accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-09-15T00:00:00Z',
    })
    await deleteStravaTokens(supabase)
    expect(await getStravaTokens(supabase)).toBeNull()
  })
})
