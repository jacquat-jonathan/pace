'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { deleteStravaTokens } from '@/lib/db/stravaTokens'

export async function disconnectStrava() {
  const supabase = await createServerSupabase()
  await deleteStravaTokens(supabase)
  revalidatePath('/settings/strava')
}
