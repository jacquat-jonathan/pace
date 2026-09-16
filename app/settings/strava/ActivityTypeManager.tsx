'use client'

import { useState, useTransition } from 'react'
import type { ActivityTypeOption, CustomActivityType } from '@/lib/types'
import { addActivityType, removeActivityType } from './actions'

export function ActivityTypeManager({
  builtInTypes,
  initialCustomTypes,
}: {
  builtInTypes: ActivityTypeOption[]
  initialCustomTypes: CustomActivityType[]
}) {
  const [customTypes, setCustomTypes] = useState(initialCustomTypes)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(formData: FormData) {
    const form = document.getElementById('activity-type-form') as HTMLFormElement | null
    setMessage(null)
    startTransition(async () => {
      const result = await addActivityType(String(formData.get('label') ?? ''))
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setCustomTypes((types) => [...types, result.activityType].sort((a, b) => a.label.localeCompare(b.label)))
      form?.reset()
    })
  }

  function handleRemove(id: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await removeActivityType(id)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setCustomTypes((types) => types.filter((type) => type.id !== id))
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <div><h2 className="card-title">Activity types</h2><p className="card-kicker">Choose what you can schedule on the calendar</p></div>
      </div>
      <div className="card-body">
        <div className="activity-type-list">
          {builtInTypes.map((type) => (
            <div className="activity-type-row" key={type.value}>
              <span><strong>{type.label}</strong><small>Built in</small></span>
              <span className="badge">Default</span>
            </div>
          ))}
          {customTypes.map((type) => (
            <div className="activity-type-row" key={type.id}>
              <span><strong>{type.label}</strong><small>Custom</small></span>
              <button type="button" className="text-link" disabled={isPending} onClick={() => handleRemove(type.id)}>Remove</button>
            </div>
          ))}
        </div>
        <form id="activity-type-form" action={handleAdd} className="activity-type-form">
          <label className="field flex-1">New activity type<input name="label" required maxLength={50} className="control" placeholder="e.g. Cycling, Strength training, Skiing" /></label>
          <button type="submit" disabled={isPending} className="button button-primary">{isPending ? 'Saving…' : 'Add type'}</button>
        </form>
        {message && <p className="field-error">{message}</p>}
        <p className="field-hint">Removing a type only removes it from the list. Existing sessions keep their activity type.</p>
      </div>
    </div>
  )
}
