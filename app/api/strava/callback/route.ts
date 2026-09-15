import { NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/strava/client'
import { upsertStravaTokens } from '@/lib/db/stravaTokens'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings/strava?error=denied', request.url))
  }

  try {
    const tokens = await exchangeCodeForToken(code)
    const supabase = await createServerSupabase()
    await upsertStravaTokens(supabase, {
      athleteId: tokens.athleteId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(tokens.expiresAt * 1000).toISOString(),
    })
  } catch (err) {
    console.error('Strava OAuth callback failed:', err)
    return NextResponse.redirect(new URL('/settings/strava?error=exchange_failed', request.url))
  }

  return NextResponse.redirect(new URL('/settings/strava?connected=1', request.url))
}
