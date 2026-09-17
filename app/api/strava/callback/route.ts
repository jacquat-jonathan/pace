import { NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/strava/client'
import { upsertStravaTokens } from '@/lib/db/stravaTokens'
import { createServerSupabase } from '@/lib/supabase/server'
import { appUrl } from '@/lib/url'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(appUrl('/settings/strava?error=denied', request))
  }

  try {
    const tokens = await exchangeCodeForToken(code)
    const supabase = await createServerSupabase()
    await upsertStravaTokens(supabase, {
      userId: process.env.SPORT_TRACKER_USER_ID!,
      athleteId: tokens.athleteId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(tokens.expiresAt * 1000).toISOString(),
    })
  } catch (err) {
    console.error('Strava OAuth callback failed:', err)
    return NextResponse.redirect(appUrl('/settings/strava?error=exchange_failed', request))
  }

  return NextResponse.redirect(appUrl('/settings/strava?connected=1', request))
}
