import { getStravaTokens, upsertStravaTokens } from '@/lib/db/stravaTokens'
import { refreshAccessToken, fetchActivitiesSince } from './client'
import { upsertStravaActivity, linkActivityToSession } from '@/lib/db/activities'
import { listSessionsInRange } from '@/lib/db/sessions'
import type { ActivityType } from '@/lib/types'

export interface SyncResult {
  imported: number
  matched: number
}

const TOKEN_REFRESH_MARGIN_SECONDS = 300
const FIRST_SYNC_LOOKBACK_SECONDS = 90 * 24 * 60 * 60

function mapStravaTypeToActivityType(sportType: string): ActivityType {
  return sportType.toLowerCase().includes('run') ? 'running' : 'other'
}

function metersToKm(meters: number): number {
  return Math.round((meters / 1000) * 100) / 100
}

function paceFromSpeed(metersPerSecond: number): string | null {
  if (!metersPerSecond) return null
  const secondsPerKm = 1000 / metersPerSecond
  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.round(secondsPerKm % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`
}

export async function syncActivities(supabase: any, userId: string): Promise<SyncResult> {
  const tokens = await getStravaTokens(supabase)
  if (!tokens) return { imported: 0, matched: 0 }

  let accessToken = tokens.accessToken
  let refreshToken = tokens.refreshToken
  let expiresAtIso = tokens.expiresAt

  const expiresAtSeconds = Math.floor(new Date(expiresAtIso).getTime() / 1000)
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (expiresAtSeconds - nowSeconds < TOKEN_REFRESH_MARGIN_SECONDS) {
    const refreshed = await refreshAccessToken(refreshToken)
    accessToken = refreshed.accessToken
    refreshToken = refreshed.refreshToken
    expiresAtIso = new Date(refreshed.expiresAt * 1000).toISOString()
  }

  const afterUnixSeconds = tokens.lastSyncedAt
    ? Math.floor(new Date(tokens.lastSyncedAt).getTime() / 1000)
    : nowSeconds - FIRST_SYNC_LOOKBACK_SECONDS

  const stravaActivities = await fetchActivitiesSince(accessToken, afterUnixSeconds)

  let imported = 0
  let matched = 0

  for (const activity of stravaActivities) {
    // start_date_local, not start_date: the latter is UTC and would file an
    // evening activity under the wrong calendar day outside UTC.
    const date = activity.start_date_local.slice(0, 10)
    const saved = await upsertStravaActivity(supabase, {
      stravaActivityId: activity.id,
      date,
      sportType: activity.sport_type,
      durationMin: Math.round(activity.moving_time / 60),
      distanceKm: metersToKm(activity.distance),
      dplusM: Math.round(activity.total_elevation_gain),
      avgHr: activity.average_heartrate ?? null,
      pace: paceFromSpeed(activity.average_speed),
      stravaLink: `https://www.strava.com/activities/${activity.id}`,
    }, userId)
    imported += 1

    if (!saved.plannedSessionId) {
      const activityType = mapStravaTypeToActivityType(activity.sport_type)
      const candidates = (await listSessionsInRange(supabase, date, date)).filter(
        (s) => s.status !== 'skipped' && !s.linkedActivityId && s.activityType === activityType,
      )
      // Auto-link only on an unambiguous match. Zero candidates or several
      // same-day/same-type candidates are both left unlinked for the user to
      // resolve manually via the history page's link control (Task 14).
      if (candidates.length === 1) {
        await linkActivityToSession(supabase, saved.id, candidates[0].id)
        matched += 1
      }
    }
  }

  await upsertStravaTokens(supabase, {
    userId,
    accessToken,
    refreshToken,
    expiresAt: expiresAtIso,
    lastSyncedAt: new Date().toISOString(),
  })

  return { imported, matched }
}
