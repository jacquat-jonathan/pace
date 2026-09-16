import type { PlannedSession } from '@/lib/types'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  allDay: true
  backgroundColor: string
  extendedProps: { sessionId: string; status: PlannedSession['status'] }
}

const PRIORITY_COLOR: Record<PlannedSession['priority'], string> = {
  fixed: '#406989',
  essential: '#ed6946',
  optional: '#9eaaa7',
}

export function mapSessionsToEvents(sessions: PlannedSession[]): CalendarEvent[] {
  return sessions.map((s) => ({
    id: s.id,
    title: s.status === 'done' ? `${s.sessionName} ✓` : s.sessionName,
    start: s.date,
    allDay: true,
    backgroundColor: PRIORITY_COLOR[s.priority],
    extendedProps: { sessionId: s.id, status: s.status },
  }))
}
