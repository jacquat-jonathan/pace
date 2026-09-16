import { describe, it, expect } from 'vitest'
import { mapSessionsToEvents } from './mapSessionsToEvents'
import type { PlannedSession } from '@/lib/types'

const session: PlannedSession = {
  id: 's1', userId: 'u1', planId: 'p1', date: '2026-09-15', activityType: 'running',
  sessionName: 'Easy run', priority: 'essential', targetDurationMin: 45,
  targetDistanceKm: null, targetDplusM: null, intensity: 'Facile', instructions: null,
  status: 'todo', linkedActivityId: null, createdAt: '2026-09-01T00:00:00Z',
}

describe('mapSessionsToEvents', () => {
  it('maps a todo session without a checkmark', () => {
    const [event] = mapSessionsToEvents([session])
    expect(event.title).toBe('Easy run')
    expect(event.start).toBe('2026-09-15')
  })

  it('appends a checkmark for done sessions', () => {
    const [event] = mapSessionsToEvents([{ ...session, status: 'done' }])
    expect(event.title).toBe('✓ Easy run')
    expect(event.classNames).toContain('session-done')
    expect(event.backgroundColor).toBe('#34775b')
  })

  it('makes skipped sessions visibly distinct', () => {
    const [event] = mapSessionsToEvents([{ ...session, status: 'skipped' }])
    expect(event.title).toBe('– Easy run')
    expect(event.classNames).toContain('session-skipped')
    expect(event.textColor).not.toBe('#ffffff')
  })

  it('colors by priority', () => {
    const [fixedEvent] = mapSessionsToEvents([{ ...session, priority: 'fixed' }])
    const [optionalEvent] = mapSessionsToEvents([{ ...session, priority: 'optional' }])
    expect(fixedEvent.backgroundColor).not.toBe(optionalEvent.backgroundColor)
  })
})
