import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import { listSessionsInRange, createSession, updateSession, deleteSession, rescheduleSession } from './sessions'

const base = {
  user_id: 'u1', plan_id: 'p1', priority: 'essential', target_duration_min: 45,
  target_distance_km: null, target_dplus_m: null, intensity: 'Facile',
  instructions: null, status: 'todo', linked_activity_id: null, created_at: '2026-09-01T00:00:00Z',
}

describe('sessions db', () => {
  it('listSessionsInRange filters and orders by date', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [
        { ...base, id: 's2', date: '2026-09-20', activity_type: 'running', session_name: 'Long run' },
        { ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' },
        { ...base, id: 's3', date: '2026-10-05', activity_type: 'running', session_name: 'Out of range' },
      ],
    })
    const result = await listSessionsInRange(supabase, '2026-09-01', '2026-09-30')
    expect(result.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('createSession defaults status to todo', async () => {
    const supabase = createFakeSupabase()
    const created = await createSession(supabase, {
      planId: 'p1', date: '2026-09-15', activityType: 'running', sessionName: 'Easy run',
      priority: 'essential', targetDurationMin: 45, targetDistanceKm: null, targetDplusM: null,
      intensity: 'Facile', instructions: null,
    })
    expect(created.status).toBe('todo')
    expect(created.sessionName).toBe('Easy run')
  })

  it('updateSession patches given fields only', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [{ ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' }],
    })
    const updated = await updateSession(supabase, 's1', { status: 'done' })
    expect(updated.status).toBe('done')
    expect(updated.sessionName).toBe('Easy run')
  })

  it('rescheduleSession changes only the date', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [{ ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' }],
    })
    const rescheduled = await rescheduleSession(supabase, 's1', '2026-09-16')
    expect(rescheduled.date).toBe('2026-09-16')
  })

  it('deleteSession removes it', async () => {
    const supabase = createFakeSupabase({
      planned_sessions: [{ ...base, id: 's1', date: '2026-09-15', activity_type: 'running', session_name: 'Easy run' }],
    })
    await deleteSession(supabase, 's1')
    expect(await listSessionsInRange(supabase, '2026-01-01', '2026-12-31')).toEqual([])
  })
})
