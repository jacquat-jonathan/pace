'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { listActivities, createManualActivity, updateActivity } from '@/lib/db/activities'

export async function fetchActivities(opts?: Parameters<typeof listActivities>[1]) {
  const supabase = await createServerSupabase()
  return listActivities(supabase, opts)
}

export async function addManualActivity(input: Parameters<typeof createManualActivity>[1]) {
  const supabase = await createServerSupabase()
  const result = await createManualActivity(supabase, input)
  revalidatePath('/history')
  return result
}

export async function saveActivityEdits(id: string, patch: Parameters<typeof updateActivity>[2]) {
  const supabase = await createServerSupabase()
  const result = await updateActivity(supabase, id, patch)
  revalidatePath('/history')
  return result
}
