import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'

describe('Strava connect route', () => {
  beforeEach(() => {
    process.env.STRAVA_CLIENT_ID = 'client-123'
  })

  it('uses the public request origin for a production callback', async () => {
    const response = await GET(new Request('https://sport.jacquatjonathan.ch/api/strava/connect'))
    const authorizationUrl = new URL(response.headers.get('location')!)

    expect(authorizationUrl.origin).toBe('https://www.strava.com')
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'https://sport.jacquatjonathan.ch/api/strava/callback',
    )
  })

  it('keeps localhost for local development', async () => {
    const response = await GET(new Request('http://localhost:3000/api/strava/connect'))
    const authorizationUrl = new URL(response.headers.get('location')!)

    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/strava/callback',
    )
  })
})
