'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Activity, PlannedSession } from '@/lib/types'
import {
  addManualActivity,
  saveActivityEdits,
  fetchNearbySessions,
  linkActivity,
  unlinkActivityAction,
} from './actions'
import type { ActivityEditPatch } from './actions'

export interface ActivityDialogState {
  mode: 'create' | 'edit'
  activity?: Activity
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export function ActivityDialog({
  state,
  onClose,
  onSaved,
}: {
  state: ActivityDialogState
  onClose: () => void
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const a = state.activity
  const readOnly = state.mode === 'edit' && a?.source === 'strava'
  const [nearbySessions, setNearbySessions] = useState<PlannedSession[]>([])

  useEffect(() => {
    if (state.mode === 'edit' && a && !a.plannedSessionId) {
      fetchNearbySessions(a.date).then(setNearbySessions)
    }
  }, [state.mode, a])

  function handleLink(sessionId: string) {
    if (!a) return
    startTransition(async () => {
      await linkActivity(a.id, sessionId)
      onSaved()
    })
  }

  function handleUnlink() {
    if (!a) return
    startTransition(async () => {
      await unlinkActivityAction(a.id)
      onSaved()
    })
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (state.mode === 'create') {
        await addManualActivity({
          date: formData.get('date') as string,
          sportType: formData.get('sportType') as string,
          durationMin: numberOrNull(formData.get('durationMin')),
          distanceKm: numberOrNull(formData.get('distanceKm')),
          dplusM: numberOrNull(formData.get('dplusM')),
          avgHr: numberOrNull(formData.get('avgHr')),
          rpe: numberOrNull(formData.get('rpe')),
          notes: (formData.get('notes') as string) || null,
          plannedSessionId: null,
        })
      } else if (a) {
        const patch: ActivityEditPatch = {
          rpe: numberOrNull(formData.get('rpe')),
          notes: (formData.get('notes') as string) || null,
        }
        if (a.source === 'manual') {
          patch.date = formData.get('date') as string
          patch.sportType = formData.get('sportType') as string
          patch.durationMin = numberOrNull(formData.get('durationMin'))
          patch.distanceKm = numberOrNull(formData.get('distanceKm'))
          patch.dplusM = numberOrNull(formData.get('dplusM'))
          patch.avgHr = numberOrNull(formData.get('avgHr'))
        }
        await saveActivityEdits(a.id, patch)
      }
      onSaved()
    })
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <form action={handleSubmit} onClick={(e) => e.stopPropagation()} className="dialog" role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title">
        <div className="dialog-header">
          <h2 id="activity-dialog-title" className="dialog-title">{state.mode === 'create' ? 'Log an activity' : 'Activity details'}</h2>
          <p className="dialog-subtitle">Record the work and how it felt.</p>
        </div>
        <div className="dialog-body">
        <div className="form-grid">
          <label className="field">Date<input name="date" type="date" defaultValue={a?.date} disabled={readOnly} required className="control" /></label>
          <label className="field">Sport<input name="sportType" defaultValue={a?.sportType} disabled={readOnly} required className="control" placeholder="e.g. Run" /></label>
          <label className="field">Duration (minutes)<input name="durationMin" type="number" defaultValue={a?.durationMin ?? ''} disabled={readOnly} className="control" /></label>
          <label className="field">Distance (kilometres)<input name="distanceKm" type="number" step="0.1" defaultValue={a?.distanceKm ?? ''} disabled={readOnly} className="control" /></label>
          <label className="field">Elevation gain (metres)<input name="dplusM" type="number" defaultValue={a?.dplusM ?? ''} disabled={readOnly} className="control" /></label>
          <label className="field">Average heart rate<input name="avgHr" type="number" defaultValue={a?.avgHr ?? ''} disabled={readOnly} className="control" /></label>
          <label className="field">Perceived effort (1–10)<input name="rpe" type="number" min={1} max={10} defaultValue={a?.rpe ?? ''} className="control" /></label>
          <label className="field span-2">Notes<textarea name="notes" defaultValue={a?.notes ?? ''} rows={3} className="control" placeholder="How did the session feel?" /></label>
        </div>
        {readOnly && <p className="mt-3 text-xs text-gray-500">Imported metrics are managed by Strava. Effort and notes stay editable here.</p>}
        {state.mode === 'edit' && a && (
          <div className="mt-4 rounded-xl border border-[#dddcd5] bg-[#f9f8f4] p-3 text-sm">
            {a.plannedSessionId ? (
              <div className="flex items-center justify-between gap-3"><span className="badge badge-linked">Linked to plan</span><button type="button" onClick={handleUnlink} disabled={isPending} className="text-link">Unlink</button></div>
            ) : nearbySessions.length > 0 ? (
              <div className="flex flex-col gap-2"><span className="font-semibold">Link to a planned session</span>
                {nearbySessions.map((s) => (
                  <button key={s.id} type="button" onClick={() => handleLink(s.id)} disabled={isPending} className="text-link text-left">{s.date} — {s.sessionName}</button>
                ))}
              </div>
            ) : (
              <span className="table-muted">No nearby planned sessions to link.</span>
            )}
          </div>
        )}
        <div className="dialog-actions"><div className="dialog-actions-right"><button type="button" onClick={onClose} className="button">Cancel</button><button type="submit" disabled={isPending} className="button button-primary">{isPending ? 'Saving…' : 'Save activity'}</button></div></div>
        </div>
      </form>
    </div>
  )
}
