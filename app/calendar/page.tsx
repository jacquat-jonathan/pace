import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns'
import { createServerSupabase } from '@/lib/supabase/server'
import { listSessionsInRange } from '@/lib/db/sessions'
import { CalendarClient } from './CalendarClient'
import { listCustomActivityTypes, toActivityTypeOptions } from '@/lib/db/activityTypes'

export default async function CalendarPage() {
  const anchor = new Date()
  const start = format(subMonths(startOfMonth(anchor), 1), 'yyyy-MM-dd')
  const end = format(addMonths(endOfMonth(anchor), 1), 'yyyy-MM-dd')

  const supabase = await createServerSupabase()
  const [sessions, customActivityTypes] = await Promise.all([
    listSessionsInRange(supabase, start, end),
    listCustomActivityTypes(supabase),
  ])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Training schedule</p>
          <h1 className="page-title">Your calendar</h1>
          <p className="page-description">Plan the work, move sessions when life happens, and keep the bigger picture in sight.</p>
        </div>
      </header>
      <CalendarClient initialSessions={sessions} activityTypes={toActivityTypeOptions(customActivityTypes)} />
    </div>
  )
}
