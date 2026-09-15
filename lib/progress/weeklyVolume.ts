import { startOfWeek, format } from 'date-fns'
import type { Activity } from '@/lib/types'

export interface WeeklyVolumePoint {
  weekStart: string
  distanceKm: number
  dplusM: number
}

export function computeWeeklyVolume(activities: Activity[]): WeeklyVolumePoint[] {
  const running = activities.filter((a) => a.sportType.toLowerCase().includes('run'))
  const byWeek = new Map<string, { distanceKm: number; dplusM: number }>()

  for (const a of running) {
    const weekStart = format(startOfWeek(new Date(a.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const bucket = byWeek.get(weekStart) ?? { distanceKm: 0, dplusM: 0 }
    bucket.distanceKm += a.distanceKm ?? 0
    bucket.dplusM += a.dplusM ?? 0
    byWeek.set(weekStart, bucket)
  }

  return Array.from(byWeek.entries())
    .map(([weekStart, totals]) => ({
      weekStart,
      distanceKm: Math.round(totals.distanceKm * 10) / 10,
      dplusM: Math.round(totals.dplusM),
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}
