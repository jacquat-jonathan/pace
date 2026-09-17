import { beforeEach, describe, expect, it } from 'vitest'
import { GET } from './route'

describe('Strava connect route', () => {
  beforeEach(() => {
    process.env.STRAVA_CLIENT_ID = 'client-123'
  })

  it('prefers STRAVA_REDIRECT_URI when set, even if the request looks like it came from elsewhere', async () => {
    // Behind Infomaniak's reverse proxy, the request the Node process actually
    // sees carries `Host: localhost:3000` (the proxy's own upstream target),
    // not the public domain — so the env var must win over the request origin.
    process.env.STRAVA_REDIRECT_URI = 'https://sport.jacquatjonathan.ch/api/strava/callback'
    const response = await GET(new Request('https://localhost:3000/api/strava/connect'))
    const authorizationUrl = new URL(response.headers.get('location')!)

    expect(authorizationUrl.origin).toBe('https://www.strava.com')
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'https://sport.jacquatjonathan.ch/api/strava/callback',
    )
    delete process.env.STRAVA_REDIRECT_URI
  })

  it('falls back to the request origin for local development when no env var is set', async () => {
    delete process.env.STRAVA_REDIRECT_URI
    const response = await GET(new Request('http://localhost:3000/api/strava/connect'))
    const authorizationUrl = new URL(response.headers.get('location')!)

    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/strava/callback',
    )
  })
})
