'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { deleteStravaTokens } from '@/lib/db/stravaTokens'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { syncActivities } from '@/lib/strava/sync'
import { createCustomActivityType, deleteCustomActivityType } from '@/lib/db/activityTypes'

async function authenticatedSupabase() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return supabase
}

export async function addActivityType(label: string) {
  try {
    const supabase = await authenticatedSupabase()
    const activityType = await createCustomActivityType(supabase, label)
    revalidatePath('/settings/strava')
    revalidatePath('/calendar')
    return { ok: true as const, activityType }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add activity type'
    const error = message.includes('duplicate')
      ? 'That activity type already exists'
      : message.includes('activity_types')
        ? 'Apply database migration 0002_custom_activity_types.sql first'
        : message
    return { ok: false as const, error }
  }
}

export async function removeActivityType(id: string) {
  try {
    const supabase = await authenticatedSupabase()
    await deleteCustomActivityType(supabase, id)
    revalidatePath('/settings/strava')
    revalidatePath('/calendar')
    return { ok: true as const }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Could not remove activity type' }
  }
}

export async function disconnectStrava() {
  const supabase = await authenticatedSupabase()
  await deleteStravaTokens(supabase)
  revalidatePath('/settings/strava')
}

export async function syncNow(): Promise<
  { ok: true; imported: number; matched: number } | { ok: false; error: string }
> {
  try {
    // This action drives the service-role client, which bypasses RLS, so it
    // must not rely on the middleware happening to gate the page it's called
    // from — Server Actions are reachable by POST on their own.
    const sessionSupabase = await createServerSupabase()
    const { data: { user } } = await sessionSupabase.auth.getUser()
    if (!user) {
      return { ok: false, error: 'Not authenticated' }
    }

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
