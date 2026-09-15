'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { WeeklyVolumePoint } from '@/lib/progress/weeklyVolume'

export function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="weekStart" />
        <YAxis yAxisId="left" label={{ value: 'km', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: 'D+ (m)', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="distanceKm" name="Distance (km)" fill="#2563eb" />
        <Line yAxisId="right" dataKey="dplusM" name="D+ (m)" stroke="#16a34a" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
