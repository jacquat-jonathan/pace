import { describe, it, expect } from 'vitest'
import { computeWeeklyVolume } from './weeklyVolume'
import type { Activity } from '@/lib/types'

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 'a', userId: 'u1', source: 'strava', stravaActivityId: 1, date: '2026-09-15',
    sportType: 'Run', durationMin: 45, distanceKm: 8, dplusM: 150, avgHr: null, pace: null,
    rpe: null, notes: null, stravaLink: null, plannedSessionId: null, createdAt: '2026-09-15T00:00:00Z',
    ...overrides,
  }
}

describe('computeWeeklyVolume', () => {
  it('sums distance and D+ within the same week (Monday start)', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', date: '2026-09-15', distanceKm: 8, dplusM: 150 }), // Tuesday
      makeActivity({ id: 'a2', date: '2026-09-20', distanceKm: 10, dplusM: 250 }), // Sunday, same week
    ])
    expect(result).toEqual([{ weekStart: '2026-09-14', distanceKm: 18, dplusM: 400 }])
  })

  it('splits activities in different weeks', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', date: '2026-09-15', distanceKm: 8, dplusM: 150 }),
      makeActivity({ id: 'a2', date: '2026-09-22', distanceKm: 9, dplusM: 200 }),
    ])
    expect(result).toEqual([
      { weekStart: '2026-09-14', distanceKm: 8, dplusM: 150 },
      { weekStart: '2026-09-21', distanceKm: 9, dplusM: 200 },
    ])
  })

  it('ignores non-running activities', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', sportType: 'WeightTraining', date: '2026-09-15', distanceKm: null, dplusM: null }),
    ])
    expect(result).toEqual([])
  })

  it('sorts weeks chronologically', () => {
    const result = computeWeeklyVolume([
      makeActivity({ id: 'a1', date: '2026-09-22', distanceKm: 9, dplusM: 200 }),
      makeActivity({ id: 'a2', date: '2026-09-15', distanceKm: 8, dplusM: 150 }),
    ])
    expect(result.map((p) => p.weekStart)).toEqual(['2026-09-14', '2026-09-21'])
  })
})
