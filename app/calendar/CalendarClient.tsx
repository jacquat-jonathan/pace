'use client'

import { useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import type { PlannedSession } from '@/lib/types'
import { mapSessionsToEvents } from '@/lib/calendar/mapSessionsToEvents'
import { getSessionsForRange } from './actions'
import { SessionDialog, type SessionDialogState } from './SessionDialog'

export function CalendarClient({ initialSessions }: { initialSessions: PlannedSession[] }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [range, setRange] = useState<{ start: string; end: string } | null>(null)
  const [dialog, setDialog] = useState<SessionDialogState | null>(null)

  const refetch = useCallback(async (start: string, end: string) => {
    setRange({ start, end })
    setSessions(await getSessionsForRange(start, end))
  }, [])

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => refetch(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10)),
    [refetch],
  )

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setDialog({ mode: 'create', date: arg.dateStr })
  }, [])

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const session = sessions.find((s) => s.id === arg.event.id)
      if (session) setDialog({ mode: 'edit', date: session.date, session })
    },
    [sessions],
  )

  const handleSaved = useCallback(() => {
    setDialog(null)
    if (range) refetch(range.start, range.end)
  }, [range, refetch])

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={mapSessionsToEvents(sessions)}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="auto"
      />
      {dialog && <SessionDialog state={dialog} onClose={() => setDialog(null)} onSaved={handleSaved} />}
    </>
  )
}
