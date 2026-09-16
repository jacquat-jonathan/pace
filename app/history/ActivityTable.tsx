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
      <div className="flex justify-end mb-4"><button type="button" onClick={() => setDialog({ mode: 'create' })} className="button button-primary">＋ Add activity</button></div>
      <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Sport</th><th>Duration</th><th>Distance</th><th>Elevation</th><th>RPE</th><th>Source</th><th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id}>
              <td className="table-primary">{a.date}</td><td>{a.sportType}</td><td>{a.durationMin == null ? '—' : `${a.durationMin} min`}</td><td>{a.distanceKm == null ? '—' : `${a.distanceKm} km`}</td><td>{a.dplusM == null ? '—' : `${a.dplusM} m`}</td><td>{a.rpe ?? '—'}</td>
              <td><span className={`badge badge-${a.source}`}>{a.source}</span></td>
              <td><button type="button" onClick={() => setDialog({ mode: 'edit', activity: a })} className="text-link">Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {activities.length === 0 && <div className="empty-state"><div><strong>No activities logged yet</strong><p>Connect Strava or add your first activity manually.</p></div></div>}
      </div>
      {dialog && <ActivityDialog state={dialog} onClose={() => setDialog(null)} onSaved={handleSaved} />}
    </div>
  )
}
