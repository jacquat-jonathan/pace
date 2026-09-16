export type PlanStatus = 'active' | 'archived'
export type ActivityType = string
export type SessionPriority = 'fixed' | 'essential' | 'optional'
export type SessionStatus = 'todo' | 'done' | 'skipped'
export type ActivitySource = 'strava' | 'manual'

export interface ActivityTypeOption {
  value: string
  label: string
  builtIn: boolean
  icon: string
}

export interface CustomActivityType {
  id: string
  userId: string
  value: string
  label: string
  createdAt: string
}

export interface Plan {
  id: string
  userId: string
  name: string
  status: PlanStatus
  raceName: string | null
  raceDate: string | null
  raceDistanceKm: number | null
  raceElevationM: number | null
  currentBenchmark: string | null
  notes: string | null
  createdAt: string
}

export interface PlanPhase {
  id: string
  userId: string
  planId: string
  name: string
  startDate: string
  endDate: string
  priorityDescription: string | null
  targetLongRunMinKm: number | null
  targetLongRunMaxKm: number | null
  targetWeeklyDplusMinM: number | null
  targetWeeklyDplusMaxM: number | null
  sortOrder: number
}

export interface PlannedSession {
  id: string
  userId: string
  planId: string | null
  date: string
  activityType: ActivityType
  sessionName: string
  priority: SessionPriority
  targetDurationMin: number | null
  targetDistanceKm: number | null
  targetDplusM: number | null
  intensity: string | null
  instructions: string | null
  status: SessionStatus
  linkedActivityId: string | null
  createdAt: string
}

export interface Activity {
  id: string
  userId: string
  source: ActivitySource
  stravaActivityId: number | null
  date: string
  sportType: string
  durationMin: number | null
  distanceKm: number | null
  dplusM: number | null
  avgHr: number | null
  pace: string | null
  rpe: number | null
  notes: string | null
  stravaLink: string | null
  plannedSessionId: string | null
  createdAt: string
}
