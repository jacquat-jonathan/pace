'use client'

import { useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg } from '@fullcalendar/core'
import type { PlannedSession } from '@/lib/types'
import { mapSessionsToEvents } from '@/lib/calendar/mapSessionsToEvents'
import { getSessionsForRange } from './actions'

export function CalendarClient({ initialSessions }: { initialSessions: PlannedSession[] }) {
  const [sessions, setSessions] = useState(initialSessions)

  const handleDatesSet = useCallback(async (arg: DatesSetArg) => {
    const start = arg.startStr.slice(0, 10)
    const end = arg.endStr.slice(0, 10)
    setSessions(await getSessionsForRange(start, end))
  }, [])

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={mapSessionsToEvents(sessions)}
      datesSet={handleDatesSet}
      height="auto"
    />
  )
}
