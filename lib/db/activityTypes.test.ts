import { describe, expect, it } from 'vitest'
import { createFakeSupabase } from '@/tests/helpers/fakeSupabase'
import {
  activityTypeValue,
  createCustomActivityType,
  deleteCustomActivityType,
  listActivityTypeIcons,
  listCustomActivityTypes,
  setActivityTypeIcon,
  toActivityTypeOptions,
} from './activityTypes'

describe('activity types', () => {
  it('creates a stable value from a display label', () => {
    expect(activityTypeValue('  Vélo de route  ')).toBe('velo_de_route')
  })

  it('creates, lists and removes a custom type', async () => {
    const supabase = createFakeSupabase()
    const created = await createCustomActivityType(supabase, 'Strength training')

    expect(created.value).toBe('strength_training')
    expect((await listCustomActivityTypes(supabase))[0].label).toBe('Strength training')

    await deleteCustomActivityType(supabase, created.id)
    expect(await listCustomActivityTypes(supabase)).toEqual([])
  })

  it('keeps built-in types ahead of custom types', () => {
    const options = toActivityTypeOptions([
      { id: '1', userId: 'u1', value: 'cycling', label: 'Cycling', createdAt: '2026-09-17' },
    ])
    expect(options.map((option) => option.value)).toEqual(['running', 'flag_football', 'cycling'])
  })

  it('stores an icon preference and adds it to activity options', async () => {
    const supabase = createFakeSupabase()
    await setActivityTypeIcon(supabase, 'running', '👟')
    const icons = await listActivityTypeIcons(supabase)
    const options = toActivityTypeOptions([], icons)

    expect(options.find((option) => option.value === 'running')?.icon).toBe('👟')
  })
})
