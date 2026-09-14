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
import type { PlannedSession } from '@/lib/types'

export async function getSessionsForRange(start: string, end: string): Promise<PlannedSession[]> {
  const supabase = await createServerSupabase()
  return listSessionsInRange(supabase, start, end)
}

export async function saveSession(
  input: (Parameters<typeof createSession>[1] & { id?: undefined }) | ({ id: string } & Partial<Parameters<typeof createSession>[1]>),
) {
  const supabase = await createServerSupabase()
  const result = 'id' in input && input.id
    ? await updateSession(supabase, input.id, input)
    : await createSession(supabase, input as Parameters<typeof createSession>[1])
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
