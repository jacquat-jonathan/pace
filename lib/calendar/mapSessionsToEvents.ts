import type { PlannedSession } from '@/lib/types'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  allDay: true
  backgroundColor: string
  textColor: string
  classNames: string[]
  extendedProps: { sessionId: string; sessionName: string; status: PlannedSession['status']; icon?: string }
}

const PRIORITY_COLOR: Record<PlannedSession['priority'], string> = {
  fixed: '#406989',
  essential: '#ed6946',
  optional: '#9eaaa7',
}

export function mapSessionsToEvents(
  sessions: PlannedSession[],
  activityIcons: Record<string, string> = {},
): CalendarEvent[] {
  return sessions.map((s) => {
    const icon = activityIcons[s.activityType]
    const title = s.status === 'done'
      ? `✓ ${s.sessionName}`
      : s.status === 'skipped'
        ? `– ${s.sessionName}`
        : s.sessionName

    return {
      id: s.id,
      title,
      start: s.date,
      allDay: true,
      backgroundColor: s.status === 'done'
        ? '#34775b'
        : s.status === 'skipped'
          ? '#e3e4df'
          : PRIORITY_COLOR[s.priority],
      textColor: s.status === 'skipped' ? '#697379' : '#ffffff',
      classNames: [`session-${s.status}`],
      extendedProps: { sessionId: s.id, sessionName: s.sessionName, status: s.status, icon },
    }
  })
}
