'use client'

import { useTransition } from 'react'
import type { ActivityType, SessionPriority, PlannedSession } from '@/lib/types'
import { saveSession, removeSession } from './actions'

export interface SessionDialogState {
  mode: 'create' | 'edit'
  date: string
  session?: PlannedSession
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

export function SessionDialog({
  state,
  onClose,
  onSaved,
}: {
  state: SessionDialogState
  onClose: () => void
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const s = state.session

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveSession({
        id: s?.id,
        planId: s?.planId ?? null,
        date: (formData.get('date') as string) || state.date,
        activityType: formData.get('activityType') as ActivityType,
        sessionName: formData.get('sessionName') as string,
        priority: formData.get('priority') as SessionPriority,
        targetDurationMin: numberOrNull(formData.get('targetDurationMin')),
        targetDistanceKm: numberOrNull(formData.get('targetDistanceKm')),
        targetDplusM: numberOrNull(formData.get('targetDplusM')),
        intensity: (formData.get('intensity') as string) || null,
        instructions: (formData.get('instructions') as string) || null,
      } as any)
      onSaved()
    })
  }

  function handleDelete() {
    if (!s) return
    startTransition(async () => {
      await removeSession(s.id)
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        action={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-96 flex-col gap-2 rounded bg-white p-4"
      >
        <h2 className="text-lg font-semibold">
          {state.mode === 'create' ? 'New session' : 'Edit session'}
        </h2>
        <label className="text-sm">
          Date
          <input name="date" type="date" defaultValue={s?.date ?? state.date} required className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Type
          <select name="activityType" defaultValue={s?.activityType ?? 'running'} className="block w-full rounded border px-2 py-1">
            <option value="running">Running</option>
            <option value="flag_football">Flag football</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm">
          Session name
          <input name="sessionName" defaultValue={s?.sessionName} required className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Priority
          <select name="priority" defaultValue={s?.priority ?? 'essential'} className="block w-full rounded border px-2 py-1">
            <option value="fixed">Fixed</option>
            <option value="essential">Essential</option>
            <option value="optional">Optional</option>
          </select>
        </label>
        <label className="text-sm">
          Target duration (min)
          <input name="targetDurationMin" type="number" defaultValue={s?.targetDurationMin ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Target distance (km)
          <input name="targetDistanceKm" type="number" step="0.1" defaultValue={s?.targetDistanceKm ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Target D+ (m)
          <input name="targetDplusM" type="number" defaultValue={s?.targetDplusM ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Intensity
          <input name="intensity" defaultValue={s?.intensity ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <label className="text-sm">
          Instructions
          <textarea name="instructions" defaultValue={s?.instructions ?? ''} className="block w-full rounded border px-2 py-1" />
        </label>
        <div className="mt-2 flex justify-between">
          {state.mode === 'edit' ? (
            <button type="button" onClick={handleDelete} disabled={isPending} className="text-sm text-red-600">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="rounded bg-black px-3 py-1 text-sm text-white">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
