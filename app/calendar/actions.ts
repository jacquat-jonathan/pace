'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  listSessionsInRange,
  createSession,
  updateSession,
  deleteSession,
  rescheduleSession,
} from '@/lib/db/sessions'
import { getActivityById } from '@/lib/db/activities'
import type { Activity, PlannedSession } from '@/lib/types'

export async function getSessionsForRange(start: string, end: string): Promise<PlannedSession[]> {
  const supabase = await createServerSupabase()
  return listSessionsInRange(supabase, start, end)
}

export async function getLinkedActivity(activityId: string): Promise<Activity | null> {
  const supabase = await createServerSupabase()
  return getActivityById(supabase, activityId)
}

// A single non-union shape — every field `createSession` requires, plus an
// optional `id` that selects update-vs-create. The union this replaced forced
// callers (SessionDialog, which always passes `id: session?.id`) to cast,
// because `id?: string` narrows to neither branch.
export type SaveSessionInput = Parameters<typeof createSession>[1] & { id?: string }

export async function saveSession(input: SaveSessionInput) {
  const supabase = await createServerSupabase()
  const result = input.id
    ? await updateSession(supabase, input.id, input)
    : await createSession(supabase, input)
  revalidatePath('/calendar')
  return result
}

export async function removeSession(id: string) {
  const supabase = await createServerSupabase()
  await deleteSession(supabase, id)
  revalidatePath('/calendar')
}

export async function moveSession(id: string, newDate: string) {
  const supabase = await createServerSupabase()
  const result = await rescheduleSession(supabase, id, newDate)
  revalidatePath('/calendar')
  return result
}
