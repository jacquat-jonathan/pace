'use client'

import { useState } from 'react'
import type { Activity } from '@/lib/types'
import { fetchActivities } from './actions'
import { ActivityDialog, type ActivityDialogState } from './ActivityDialog'

export function ActivityTable({ initialActivities }: { initialActivities: Activity[] }) {
  const [activities, setActivities] = useState(initialActivities)
  const [dialog, setDialog] = useState<ActivityDialogState | null>(null)

  async function handleSaved() {
    setDialog(null)
    setActivities(await fetchActivities({ limit: 100 }))
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setDialog({ mode: 'create' })}
        className="mb-4 rounded border px-3 py-1 text-sm"
      >
        + Add activity
      </button>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-2">Date</th>
            <th className="py-1 pr-2">Sport</th>
            <th className="py-1 pr-2">Duration</th>
            <th className="py-1 pr-2">Distance</th>
            <th className="py-1 pr-2">D+</th>
            <th className="py-1 pr-2">RPE</th>
            <th className="py-1 pr-2">Source</th>
            <th className="py-1 pr-2" />
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="py-1 pr-2">{a.date}</td>
              <td className="py-1 pr-2">{a.sportType}</td>
              <td className="py-1 pr-2">{a.durationMin ?? '—'} min</td>
              <td className="py-1 pr-2">{a.distanceKm ?? '—'} km</td>
              <td className="py-1 pr-2">{a.dplusM ?? '—'} m</td>
              <td className="py-1 pr-2">{a.rpe ?? '—'}</td>
              <td className="py-1 pr-2">{a.source}</td>
              <td className="py-1 pr-2">
                <button
                  type="button"
                  onClick={() => setDialog({ mode: 'edit', activity: a })}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dialog && <ActivityDialog state={dialog} onClose={() => setDialog(null)} onSaved={handleSaved} />}
    </div>
  )
}
