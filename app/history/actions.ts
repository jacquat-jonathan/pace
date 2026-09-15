'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { listActivities, createManualActivity, updateActivity, linkActivityToSession, unlinkActivity } from '@/lib/db/activities'
import { addDays, subDays, format } from 'date-fns'
import { listSessionsInRange } from '@/lib/db/sessions'

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

export async function fetchNearbySessions(date: string) {
  const supabase = await createServerSupabase()
  const start = format(subDays(new Date(date), 3), 'yyyy-MM-dd')
  const end = format(addDays(new Date(date), 3), 'yyyy-MM-dd')
  const sessions = await listSessionsInRange(supabase, start, end)
  // Never offer a session that some other activity already claims — linking
  // to it would steal it away and leave the other activity dangling.
  return sessions.filter((s) => !s.linkedActivityId)
}

export async function linkActivity(activityId: string, sessionId: string) {
  const supabase = await createServerSupabase()
  await linkActivityToSession(supabase, activityId, sessionId)
  revalidatePath('/history')
  revalidatePath('/calendar')
}

export async function unlinkActivityAction(activityId: string) {
  const supabase = await createServerSupabase()
  await unlinkActivity(supabase, activityId)
  revalidatePath('/history')
  revalidatePath('/calendar')
}
