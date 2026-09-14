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
        const patch: Record<string, unknown> = {
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
        await saveActivityEdits(a.id, patch as any)
      }
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form action={handleSubmit} onClick={(e) => e.stopPropagation()} className="flex w-96 flex-col gap-2 rounded bg-white p-4">
        <h2 className="text-lg font-semibold">{state.mode === 'create' ? 'Add activity' : 'Edit activity'}</h2>
        <label className="text-sm">
          Date
          <input name="date" type="date" defaultValue={a?.date} disabled={readOnly} required className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Sport
          <input name="sportType" defaultValue={a?.sportType} disabled={readOnly} required className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Duration (min)
          <input name="durationMin" type="number" defaultValue={a?.durationMin ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Distance (km)
          <input name="distanceKm" type="number" step="0.1" defaultValue={a?.distanceKm ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          D+ (m)
          <input name="dplusM" type="number" defaultValue={a?.dplusM ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          Avg HR
          <input name="avgHr" type="number" defaultValue={a?.avgHr ?? ''} disabled={readOnly} className="block w-full rounded border px-2 py-1 disabled:bg-gray-100" />
        </label>
        <label className="text-sm">
          RPE (1-10)
          <input name="rpe" type="number" min={1} max={10} defaultValue={a?.rpe ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Notes
          <textarea name="notes" defaultValue={a?.notes ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        {readOnly && (
          <p className="text-xs text-gray-500">Core metrics come from Strava and can&apos;t be edited here.</p>
        )}
        {state.mode === 'edit' && a && (
          <div className="rounded border p-2 text-sm">
            {a.plannedSessionId ? (
              <button type="button" onClick={handleUnlink} disabled={isPending} className="text-red-600">
                Unlink from planned session
              </button>
            ) : nearbySessions.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span>Link to a planned session:</span>
                {nearbySessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleLink(s.id)}
                    disabled={isPending}
                    className="text-left text-blue-600 hover:underline"
                  >
                    {s.date} — {s.sessionName}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">No nearby planned sessions to link.</span>
            )}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="rounded bg-black px-3 py-1 text-sm text-white">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
