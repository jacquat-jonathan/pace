'use client'

import { useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg, EventDropArg } from '@fullcalendar/core'
import type { ActivityTypeOption, PlannedSession } from '@/lib/types'
import { mapSessionsToEvents } from '@/lib/calendar/mapSessionsToEvents'
import { getSessionsForRange, moveSession } from './actions'
import { SessionDialog, type SessionDialogState } from './SessionDialog'

export function CalendarClient({ initialSessions, activityTypes }: { initialSessions: PlannedSession[]; activityTypes: ActivityTypeOption[] }) {
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

  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const newDate = arg.event.startStr.slice(0, 10)
      try {
        await moveSession(arg.event.id, newDate)
        if (range) refetch(range.start, range.end)
      } catch {
        arg.revert()
      }
    },
    [range, refetch],
  )

  const handleSaved = useCallback(() => {
    setDialog(null)
    if (range) refetch(range.start, range.end)
  }, [range, refetch])

  const distance = sessions.reduce((sum, session) => sum + (session.targetDistanceKm ?? 0), 0)
  const elevation = sessions.reduce((sum, session) => sum + (session.targetDplusM ?? 0), 0)
  const completed = sessions.filter((session) => session.status === 'done').length
  const activityIcons = Object.fromEntries(activityTypes.map((type) => [type.value, type.icon]))

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><span className="stat-label">Sessions</span><span className="stat-value">{sessions.length}</span></div>
        <div className="stat-card"><span className="stat-label">Planned distance</span><span className="stat-value">{Math.round(distance * 10) / 10}</span><span className="stat-unit">km</span></div>
        <div className="stat-card"><span className="stat-label">Elevation gain</span><span className="stat-value">{elevation.toLocaleString()}</span><span className="stat-unit">m</span></div>
        <div className="stat-card"><span className="stat-label">Completed</span><span className="stat-value">{completed}</span><span className="stat-unit">sessions</span></div>
      </div>
      <div className="card calendar-card">
        <div className="calendar-legend" aria-label="Session status and priority legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: '#34775b' }} />Completed</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#e3e4df' }} />Skipped</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#ed6946' }} />Essential</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#406989' }} />Fixed</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#9eaaa7' }} />Optional</span>
          <span className="legend-item">Click a day to add · Drag to reschedule</span>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          firstDay={1}
          fixedWeekCount={false}
          events={mapSessionsToEvents(sessions, activityIcons)}
          eventContent={(arg) => (
            <div className="calendar-event-content">
              {arg.event.extendedProps.status !== 'todo' && (
                <span
                  className={`calendar-status-marker calendar-status-${arg.event.extendedProps.status}`}
                  aria-hidden="true"
                >
                  {arg.event.extendedProps.status === 'done' ? '✓' : '×'}
                </span>
              )}
              <span className="calendar-event-title">{arg.event.extendedProps.sessionName}</span>
              {arg.event.extendedProps.icon && (
                <span className="calendar-event-icon" aria-hidden="true">{arg.event.extendedProps.icon}</span>
              )}
            </div>
          )}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          editable
          height="auto"
          buttonText={{ today: 'Today' }}
        />
      </div>
      {dialog && <SessionDialog state={dialog} activityTypes={activityTypes} onClose={() => setDialog(null)} onSaved={handleSaved} />}
    </>
  )
}
