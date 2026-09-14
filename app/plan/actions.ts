'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { updatePlan, upsertPhase, deletePhase } from '@/lib/db/plans'

export async function savePlanDetails(id: string, patch: Parameters<typeof updatePlan>[2]) {
  const supabase = await createServerSupabase()
  const result = await updatePlan(supabase, id, patch)
  revalidatePath('/plan')
  return result
}

export async function savePhase(phase: Parameters<typeof upsertPhase>[1]) {
  const supabase = await createServerSupabase()
  const result = await upsertPhase(supabase, phase)
  revalidatePath('/plan')
  return result
}

export async function removePhase(id: string) {
  const supabase = await createServerSupabase()
  await deletePhase(supabase, id)
  revalidatePath('/plan')
}
