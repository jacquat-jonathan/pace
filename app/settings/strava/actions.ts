'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { deleteStravaTokens } from '@/lib/db/stravaTokens'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { syncActivities } from '@/lib/strava/sync'

export async function disconnectStrava() {
  const supabase = await createServerSupabase()
  await deleteStravaTokens(supabase)
  revalidatePath('/settings/strava')
}

export async function syncNow(): Promise<
  { ok: true; imported: number; matched: number } | { ok: false; error: string }
> {
  try {
    const supabase = createAdminSupabase()
    const result = await syncActivities(supabase, process.env.SPORT_TRACKER_USER_ID!)
    revalidatePath('/settings/strava')
    revalidatePath('/history')
    revalidatePath('/calendar')
    return { ok: true, ...result }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown sync error' }
  }
}
