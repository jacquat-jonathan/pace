import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { syncActivities } from '@/lib/strava/sync'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminSupabase()
    const result = await syncActivities(supabase, process.env.SPORT_TRACKER_USER_ID!)
    return NextResponse.json(result)
  } catch (err) {
    // Surface failures (e.g. a revoked Strava token) as a failed invocation
    // in Vercel's Cron Jobs log rather than an unlogged crash, per the
    // spec's "surface, don't fail silently" error-handling requirement.
    console.error('Strava cron sync failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown sync error' },
      { status: 500 },
    )
  }
}
