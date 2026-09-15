export interface StravaTokens {
  athleteId: number | null
  accessToken: string
  refreshToken: string
  expiresAt: string
  lastSyncedAt: string | null
}

function mapTokens(row: any): StravaTokens {
  return {
    athleteId: row.athlete_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
    lastSyncedAt: row.last_synced_at,
  }
}

export async function getStravaTokens(supabase: any): Promise<StravaTokens | null> {
  const { data, error } = await supabase.from('strava_tokens').select('*').maybeSingle()
  if (error) throw error
  return data ? mapTokens(data) : null
}

export async function upsertStravaTokens(
  supabase: any,
  tokens: {
    athleteId?: number | null
    accessToken: string
    refreshToken: string
    expiresAt: string
    lastSyncedAt?: string | null
  },
): Promise<StravaTokens> {
  const { data: existing } = await supabase.from('strava_tokens').select('*').maybeSingle()
  const row = {
    id: existing?.id,
    athlete_id: tokens.athleteId ?? existing?.athlete_id ?? null,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt,
    last_synced_at: tokens.lastSyncedAt ?? existing?.last_synced_at ?? null,
  }
  const { data, error } = await supabase.from('strava_tokens').upsert(row).select().single()
  if (error) throw error
  return mapTokens(data)
}

export async function deleteStravaTokens(supabase: any): Promise<void> {
  const { data } = await supabase.from('strava_tokens').select('*').maybeSingle()
  if (!data) return
  const { error } = await supabase.from('strava_tokens').delete().eq('id', data.id)
  if (error) throw error
}
