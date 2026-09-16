import type { ActivityTypeOption, CustomActivityType } from '@/lib/types'

export const BUILTIN_ACTIVITY_TYPES: ActivityTypeOption[] = [
  { value: 'running', label: 'Running', builtIn: true },
  { value: 'flag_football', label: 'Flag football', builtIn: true },
]

function mapActivityType(row: any): CustomActivityType {
  return {
    id: row.id,
    userId: row.user_id,
    value: row.value,
    label: row.label,
    createdAt: row.created_at,
  }
}

export function activityTypeValue(label: string): string {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function listCustomActivityTypes(supabase: any): Promise<CustomActivityType[]> {
  const { data, error } = await supabase
    .from('activity_types')
    .select('*')
    .order('label', { ascending: true })
  // Keep the existing calendar usable while a newly deployed app is waiting
  // for migration 0002 to be applied. Writes still return a clear error.
  if (error && (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('activity_types'))) {
    return []
  }
  if (error) throw error
  return (data ?? []).map(mapActivityType)
}

export async function createCustomActivityType(supabase: any, label: string): Promise<CustomActivityType> {
  const cleanLabel = label.trim()
  const value = activityTypeValue(cleanLabel)
  if (!cleanLabel || !value) throw new Error('Enter a valid activity type name')
  if (BUILTIN_ACTIVITY_TYPES.some((type) => type.value === value)) {
    throw new Error(`${cleanLabel} is already available`)
  }

  const { data, error } = await supabase
    .from('activity_types')
    .insert({ value, label: cleanLabel })
    .select()
    .single()
  if (error) throw error
  return mapActivityType(data)
}

export async function deleteCustomActivityType(supabase: any, id: string): Promise<void> {
  const { error } = await supabase.from('activity_types').delete().eq('id', id)
  if (error) throw error
}

export function toActivityTypeOptions(customTypes: CustomActivityType[]): ActivityTypeOption[] {
  return [
    ...BUILTIN_ACTIVITY_TYPES,
    ...customTypes.map((type) => ({ value: type.value, label: type.label, builtIn: false })),
  ]
}
