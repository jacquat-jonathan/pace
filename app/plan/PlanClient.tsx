'use client'

import { useState, useTransition } from 'react'
import type { Plan, PlanPhase } from '@/lib/types'
import { savePlanDetails, savePhase, removePhase } from './actions'

function numberOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

export function PlanClient({ plan, phases: initialPhases }: { plan: Plan; phases: PlanPhase[] }) {
  const [phases, setPhases] = useState(initialPhases)
  const [isPending, startTransition] = useTransition()

  function handlePlanSubmit(formData: FormData) {
    startTransition(async () => {
      await savePlanDetails(plan.id, {
        name: formData.get('name') as string,
        raceName: (formData.get('raceName') as string) || null,
        raceDate: (formData.get('raceDate') as string) || null,
        raceDistanceKm: numberOrNull(formData.get('raceDistanceKm')),
        raceElevationM: numberOrNull(formData.get('raceElevationM')),
        currentBenchmark: (formData.get('currentBenchmark') as string) || null,
        notes: (formData.get('notes') as string) || null,
      })
    })
  }

  function handlePhaseSubmit(phase: PlanPhase, formData: FormData) {
    startTransition(async () => {
      const saved = await savePhase({
        id: phase.id.startsWith('new-') ? undefined : phase.id,
        planId: plan.id,
        name: formData.get('name') as string,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        priorityDescription: (formData.get('priorityDescription') as string) || null,
        targetLongRunMinKm: numberOrNull(formData.get('targetLongRunMinKm')),
        targetLongRunMaxKm: numberOrNull(formData.get('targetLongRunMaxKm')),
        targetWeeklyDplusMinM: numberOrNull(formData.get('targetWeeklyDplusMinM')),
        targetWeeklyDplusMaxM: numberOrNull(formData.get('targetWeeklyDplusMaxM')),
        sortOrder: phase.sortOrder,
      })
      setPhases((prev) => prev.map((p) => (p.id === phase.id ? saved : p)))
    })
  }

  function handleAddPhase() {
    setPhases((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        userId: plan.userId,
        planId: plan.id,
        name: '',
        startDate: plan.raceDate ?? new Date().toISOString().slice(0, 10),
        endDate: plan.raceDate ?? new Date().toISOString().slice(0, 10),
        priorityDescription: null,
        targetLongRunMinKm: null,
        targetLongRunMaxKm: null,
        targetWeeklyDplusMinM: null,
        targetWeeklyDplusMaxM: null,
        sortOrder: prev.length + 1,
      },
    ])
  }

  function handleRemovePhase(phase: PlanPhase) {
    if (phase.id.startsWith('new-')) {
      setPhases((prev) => prev.filter((p) => p.id !== phase.id))
      return
    }
    startTransition(async () => {
      await removePhase(phase.id)
      setPhases((prev) => prev.filter((p) => p.id !== phase.id))
    })
  }

  return (
    <div className="page page-narrow section-stack">
      <header className="page-header">
        <div><p className="eyebrow">Race preparation</p><h1 className="page-title">Training plan</h1><p className="page-description">Shape the goal, define each training block, and keep the purpose of the work visible.</p></div>
      </header>
      <section className="card">
        <div className="card-header"><div><h2 className="card-title">Goal and approach</h2><p className="card-kicker">The north star for this training cycle</p></div></div>
        <form action={handlePlanSubmit} className="card-body form-grid">
          <label className="field span-2">
            Name
            <input name="name" defaultValue={plan.name} className="control" />
          </label>
          <label className="field">
            Race name
            <input name="raceName" defaultValue={plan.raceName ?? ''} className="control" />
          </label>
          <label className="field">
            Race date
            <input name="raceDate" type="date" defaultValue={plan.raceDate ?? ''} className="control" />
          </label>
          <label className="field">
            Race distance (km)
            <input name="raceDistanceKm" type="number" step="0.1" defaultValue={plan.raceDistanceKm ?? ''} className="control" />
          </label>
          <label className="field">
            Race elevation (m)
            <input name="raceElevationM" type="number" defaultValue={plan.raceElevationM ?? ''} className="control" />
          </label>
          <label className="field span-2">
            Current benchmark
            <input name="currentBenchmark" defaultValue={plan.currentBenchmark ?? ''} className="control" placeholder="Current fitness or recent result" />
          </label>
          <label className="field span-2">
            Notes / adjustment rules
            <textarea name="notes" defaultValue={plan.notes ?? ''} rows={4} className="control" />
          </label>
          <div className="form-actions span-2"><button type="submit" disabled={isPending} className="button button-primary">{isPending ? 'Saving…' : 'Save plan'}</button></div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="card-title !text-xl">Training phases</h2><p className="card-kicker">Build the progression towards race day</p></div><button type="button" onClick={handleAddPhase} className="button">＋ Add phase</button></div>
        <div className="section-stack">
          {phases.map((phase) => (
            <form
              key={phase.id}
              action={(formData) => handlePhaseSubmit(phase, formData)}
              className="card card-body form-grid"
            >
              <label className="field span-2">Phase name<input name="name" defaultValue={phase.name} placeholder="e.g. Base building" required className="control" /></label>
              <label className="field">Starts<input name="startDate" type="date" defaultValue={phase.startDate} required className="control" /></label>
              <label className="field">Ends<input name="endDate" type="date" defaultValue={phase.endDate} required className="control" /></label>
              <label className="field span-2">Primary focus<input name="priorityDescription" defaultValue={phase.priorityDescription ?? ''} placeholder="What matters most in this block?" className="control" /></label>
              <label className="field">Long run minimum (km)<input name="targetLongRunMinKm" type="number" step="0.1" defaultValue={phase.targetLongRunMinKm ?? ''} className="control" /></label>
              <label className="field">Long run maximum (km)<input name="targetLongRunMaxKm" type="number" step="0.1" defaultValue={phase.targetLongRunMaxKm ?? ''} className="control" /></label>
              <label className="field">Weekly climbing minimum (m)<input name="targetWeeklyDplusMinM" type="number" defaultValue={phase.targetWeeklyDplusMinM ?? ''} className="control" /></label>
              <label className="field">Weekly climbing maximum (m)<input name="targetWeeklyDplusMaxM" type="number" defaultValue={phase.targetWeeklyDplusMaxM ?? ''} className="control" /></label>
              <div className="form-actions span-2 !justify-between">
                <button type="button" onClick={() => handleRemovePhase(phase)} className="button button-danger">Remove phase</button>
                <button type="submit" disabled={isPending} className="button button-primary">Save phase</button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  )
}
