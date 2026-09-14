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
    <div className="flex max-w-2xl flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Plan</h1>
        <form action={handlePlanSubmit} className="flex flex-col gap-2">
          <label className="text-sm">
            Name
            <input name="name" defaultValue={plan.name} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race name
            <input name="raceName" defaultValue={plan.raceName ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race date
            <input name="raceDate" type="date" defaultValue={plan.raceDate ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race distance (km)
            <input name="raceDistanceKm" type="number" step="0.1" defaultValue={plan.raceDistanceKm ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Race elevation (m)
            <input name="raceElevationM" type="number" defaultValue={plan.raceElevationM ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Current benchmark
            <input name="currentBenchmark" defaultValue={plan.currentBenchmark ?? ''} className="block w-full rounded border px-2 py-1" />
          </label>
          <label className="text-sm">
            Notes / adjustment rules
            <textarea name="notes" defaultValue={plan.notes ?? ''} rows={4} className="block w-full rounded border px-2 py-1" />
          </label>
          <button type="submit" disabled={isPending} className="mt-2 w-fit rounded bg-black px-3 py-1 text-sm text-white">
            Save plan
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Phases</h2>
        <div className="flex flex-col gap-4">
          {phases.map((phase) => (
            <form
              key={phase.id}
              action={(formData) => handlePhaseSubmit(phase, formData)}
              className="flex flex-col gap-2 rounded border p-3"
            >
              <input name="name" defaultValue={phase.name} placeholder="Phase name" required className="rounded border px-2 py-1" />
              <div className="flex gap-2">
                <input name="startDate" type="date" defaultValue={phase.startDate} required className="rounded border px-2 py-1" />
                <input name="endDate" type="date" defaultValue={phase.endDate} required className="rounded border px-2 py-1" />
              </div>
              <input name="priorityDescription" defaultValue={phase.priorityDescription ?? ''} placeholder="Priority description" className="rounded border px-2 py-1" />
              <div className="flex gap-2">
                <input name="targetLongRunMinKm" type="number" step="0.1" defaultValue={phase.targetLongRunMinKm ?? ''} placeholder="Long run min (km)" className="w-1/2 rounded border px-2 py-1" />
                <input name="targetLongRunMaxKm" type="number" step="0.1" defaultValue={phase.targetLongRunMaxKm ?? ''} placeholder="Long run max (km)" className="w-1/2 rounded border px-2 py-1" />
              </div>
              <div className="flex gap-2">
                <input name="targetWeeklyDplusMinM" type="number" defaultValue={phase.targetWeeklyDplusMinM ?? ''} placeholder="Weekly D+ min (m)" className="w-1/2 rounded border px-2 py-1" />
                <input name="targetWeeklyDplusMaxM" type="number" defaultValue={phase.targetWeeklyDplusMaxM ?? ''} placeholder="Weekly D+ max (m)" className="w-1/2 rounded border px-2 py-1" />
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={() => handleRemovePhase(phase)} className="text-sm text-red-600">
                  Remove
                </button>
                <button type="submit" disabled={isPending} className="rounded bg-black px-3 py-1 text-sm text-white">
                  Save phase
                </button>
              </div>
            </form>
          ))}
        </div>
        <button type="button" onClick={handleAddPhase} className="mt-4 rounded border px-3 py-1 text-sm">
          + Add phase
        </button>
      </section>
    </div>
  )
}
