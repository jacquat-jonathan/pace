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
import { format } from 'date-fns'

export function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="#e8e6df" vertical={false} />
        <XAxis dataKey="weekStart" tickFormatter={(value) => format(new Date(value), 'MMM d')} tick={{ fill: '#697379', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fill: '#697379', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#697379', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ border: '1px solid #dddcd5', borderRadius: 12, boxShadow: '0 12px 30px rgb(23 33 38 / 10%)' }} labelFormatter={(value) => `Week of ${format(new Date(String(value ?? '')), 'MMM d, yyyy')}`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 18 }} />
        <Bar yAxisId="left" dataKey="distanceKm" name="Distance (km)" fill="#ed6946" radius={[5, 5, 0, 0]} maxBarSize={34} />
        <Line yAxisId="right" type="monotone" dataKey="dplusM" name="Elevation (m)" stroke="#406989" strokeWidth={2.5} dot={{ r: 3, fill: '#406989' }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
