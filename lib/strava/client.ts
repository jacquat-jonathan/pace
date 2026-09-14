const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

export interface StravaTokenSet {
  accessToken: string
  refreshToken: string
  expiresAt: number // unix seconds
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  // Local time at the activity's location, no UTC offset suffix (e.g.
  // "2026-09-15T20:30:00Z" is printed but represents local wall-clock
  // time — Strava's documented quirk). Use this, not `start_date`, for
  // calendar-day comparisons: `start_date` is UTC and would misfile an
  // evening activity into the wrong day for anyone outside UTC.
  start_date_local: string
  moving_time: number
  distance: number
  total_elevation_gain: number
  average_heartrate?: number
  average_speed: number
}

export async function exchangeCodeForToken(
  code: string,
): Promise<StravaTokenSet & { athleteId: number }> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`)
  const json = await res.json()
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_at,
    athleteId: json.athlete.id,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenSet> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)
  const json = await res.json()
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_at,
  }
}

export async function fetchActivitiesSince(
  accessToken: string,
  afterUnixSeconds: number,
): Promise<StravaActivity[]> {
  const url = `${STRAVA_API_BASE}/athlete/activities?after=${afterUnixSeconds}&per_page=100`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`)
  return res.json()
}
