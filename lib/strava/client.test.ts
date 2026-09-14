import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exchangeCodeForToken, refreshAccessToken, fetchActivitiesSince } from './client'

describe('strava client', () => {
  const originalFetch = global.fetch
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.STRAVA_CLIENT_ID = 'test-client-id'
    process.env.STRAVA_CLIENT_SECRET = 'test-secret'
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('exchangeCodeForToken parses tokens and athlete id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_at: 1234567890,
        athlete: { id: 42 },
      }),
    }) as any

    const result = await exchangeCodeForToken('auth-code')
    expect(result).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: 1234567890,
      athleteId: 42,
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.strava.com/oauth/token',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('exchangeCodeForToken throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 }) as any
    await expect(exchangeCodeForToken('bad-code')).rejects.toThrow('Strava token exchange failed: 400')
  })

  it('refreshAccessToken parses the refreshed token set', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'access-2', refresh_token: 'refresh-2', expires_at: 1234567999 }),
    }) as any
    const result = await refreshAccessToken('refresh-1')
    expect(result).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresAt: 1234567999 })
  })

  it('fetchActivitiesSince passes the bearer token and after cursor', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1, name: 'Run', type: 'Run', sport_type: 'Run',
          start_date: '2026-09-15T06:00:00Z', start_date_local: '2026-09-15T07:00:00Z',
          moving_time: 2700, distance: 8000, total_elevation_gain: 150, average_speed: 2.96,
        },
      ],
    }) as any
    const result = await fetchActivitiesSince('access-1', 1757894400)
    expect(result).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('after=1757894400'),
      expect.objectContaining({ headers: { Authorization: 'Bearer access-1' } }),
    )
  })
})
