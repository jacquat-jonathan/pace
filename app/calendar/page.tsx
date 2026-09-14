import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns'
import { createServerSupabase } from '@/lib/supabase/server'
import { listSessionsInRange } from '@/lib/db/sessions'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const anchor = new Date()
  const start = format(subMonths(startOfMonth(anchor), 1), 'yyyy-MM-dd')
  const end = format(addMonths(endOfMonth(anchor), 1), 'yyyy-MM-dd')

  const supabase = await createServerSupabase()
  const sessions = await listSessionsInRange(supabase, start, end)

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Calendar</h1>
      <CalendarClient initialSessions={sessions} />
    </div>
  )
}
