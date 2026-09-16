import type { ActivityTypeOption, CustomActivityType } from '@/lib/types'

export const BUILTIN_ACTIVITY_TYPES: ActivityTypeOption[] = [
  { value: 'running', label: 'Running', builtIn: true, icon: '🏃' },
  { value: 'flag_football', label: 'Flag football', builtIn: true, icon: '🏈' },
]

const DEFAULT_CUSTOM_ICON = '🏅'

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

export async function listActivityTypeIcons(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('activity_type_icons').select('*')
  if (error && (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('activity_type_icons'))) {
    return {}
  }
  if (error) throw error
  return Object.fromEntries((data ?? []).map((row: any) => [row.activity_type, row.icon]))
}

export async function setActivityTypeIcon(supabase: any, activityType: string, icon: string): Promise<void> {
  const cleanIcon = icon.trim()
  if (!activityType.trim() || !cleanIcon) throw new Error('Choose an icon')
  if (cleanIcon.length > 16) throw new Error('Use one emoji or a short symbol')
  const { error } = await supabase
    .from('activity_type_icons')
    .upsert({ activity_type: activityType, icon: cleanIcon }, { onConflict: 'user_id,activity_type' })
  if (error) throw error
}

export function toActivityTypeOptions(
  customTypes: CustomActivityType[],
  icons: Record<string, string> = {},
): ActivityTypeOption[] {
  return [
    ...BUILTIN_ACTIVITY_TYPES.map((type) => ({ ...type, icon: icons[type.value] ?? type.icon })),
    ...customTypes.map((type) => ({
      value: type.value,
      label: type.label,
      builtIn: false,
      icon: icons[type.value] ?? DEFAULT_CUSTOM_ICON,
    })),
  ]
}
