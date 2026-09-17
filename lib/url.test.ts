import { afterEach, describe, expect, it } from 'vitest'
import { appUrl } from './url'

describe('appUrl', () => {
  afterEach(() => {
    delete process.env.APP_URL
  })

  it('prefers APP_URL over the request origin when set', () => {
    process.env.APP_URL = 'https://sport.jacquatjonathan.ch'
    const url = appUrl('/settings/strava?connected=1', new Request('https://localhost:3000/api/strava/callback'))

    expect(url.toString()).toBe('https://sport.jacquatjonathan.ch/settings/strava?connected=1')
  })

  it('falls back to the request origin when APP_URL is unset', () => {
    const url = appUrl('/login', new Request('http://localhost:3000/logout'))

    expect(url.toString()).toBe('http://localhost:3000/login')
  })
})
