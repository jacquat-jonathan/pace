'use client'

import { useTransition } from 'react'
import type { ActivityType, ActivityTypeOption, SessionPriority, SessionStatus, PlannedSession } from '@/lib/types'
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
  activityTypes,
}: {
  state: SessionDialogState
  onClose: () => void
  onSaved: () => void
  activityTypes: ActivityTypeOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const s = state.session
  const availableActivityTypes = s && !activityTypes.some((type) => type.value === s.activityType)
    ? [...activityTypes, { value: s.activityType, label: s.activityType.replaceAll('_', ' '), builtIn: false, icon: '🏅' }]
    : activityTypes

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveSession({
        id: s?.id,
        planId: s?.planId ?? null,
        date: (formData.get('date') as string) || state.date,
        activityType: formData.get('activityType') as ActivityType,
        sessionName: formData.get('sessionName') as string,
        priority: formData.get('priority') as SessionPriority,
        status: s?.linkedActivityId ? 'done' : formData.get('status') as SessionStatus,
        targetDurationMin: numberOrNull(formData.get('targetDurationMin')),
        targetDistanceKm: numberOrNull(formData.get('targetDistanceKm')),
        targetDplusM: numberOrNull(formData.get('targetDplusM')),
        intensity: (formData.get('intensity') as string) || null,
        instructions: (formData.get('instructions') as string) || null,
      })
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
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <form
        action={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-dialog-title"
      >
        <div className="dialog-header">
          <h2 id="session-dialog-title" className="dialog-title">{state.mode === 'create' ? 'Plan a session' : 'Edit session'}</h2>
          <p className="dialog-subtitle">Set the intention now. You can always adjust it later.</p>
        </div>
        <div className="dialog-body">
          <div className="form-grid">
            <fieldset className="span-2">
              <legend className="field-label">Session status</legend>
              <div className="status-options">
                {([
                  ['todo', 'Planned', 'Upcoming or still to do'],
                  ['done', 'Completed', 'Finished without Strava'],
                  ['skipped', 'Skipped', 'Not completed'],
                ] as const).map(([value, label, description]) => (
                  <label className="status-option" key={value}>
                    <input
                      type="radio"
                      name="status"
                      value={value}
                      defaultChecked={(s?.status ?? 'todo') === value}
                      disabled={Boolean(s?.linkedActivityId)}
                    />
                    <span><strong>{label}</strong><small>{description}</small></span>
                  </label>
                ))}
              </div>
              {s?.linkedActivityId && <p className="field-hint">This session is completed because it is linked to an activity.</p>}
            </fieldset>
            <label className="field">Date<input name="date" type="date" defaultValue={s?.date ?? state.date} required className="control" /></label>
            <label className="field">Activity type<select name="activityType" defaultValue={s?.activityType ?? 'running'} className="control">{availableActivityTypes.map((type) => <option key={type.value} value={type.value}>{type.icon} {type.label}</option>)}</select></label>
            <label className="field span-2">Session name<input name="sessionName" defaultValue={s?.sessionName} required className="control" placeholder="e.g. Easy recovery run" /></label>
            <label className="field">Priority<select name="priority" defaultValue={s?.priority ?? 'essential'} className="control"><option value="fixed">Fixed</option><option value="essential">Essential</option><option value="optional">Optional</option></select></label>
            <label className="field">Intensity<input name="intensity" defaultValue={s?.intensity ?? ''} className="control" placeholder="e.g. Easy, Z2" /></label>
            <label className="field">Duration (minutes)<input name="targetDurationMin" type="number" defaultValue={s?.targetDurationMin ?? ''} className="control" /></label>
            <label className="field">Distance (kilometres)<input name="targetDistanceKm" type="number" step="0.1" defaultValue={s?.targetDistanceKm ?? ''} className="control" /></label>
            <label className="field">Elevation gain (metres)<input name="targetDplusM" type="number" defaultValue={s?.targetDplusM ?? ''} className="control" /></label>
            <label className="field span-2">Session notes<textarea name="instructions" defaultValue={s?.instructions ?? ''} rows={3} className="control" placeholder="Route, intervals, pacing or anything to remember…" /></label>
          </div>
          <div className="dialog-actions">
            {state.mode === 'edit' && <button type="button" onClick={handleDelete} disabled={isPending} className="button button-danger">Delete session</button>}
            <div className="dialog-actions-right">
              <button type="button" onClick={onClose} className="button">Cancel</button>
              <button type="submit" disabled={isPending} className="button button-primary">{isPending ? 'Saving…' : 'Save session'}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
