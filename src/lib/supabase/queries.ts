import { supabase } from './client'
import type { MealType } from './types'

export async function fetchMyProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function fetchMyMemberships(userId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, project:projects(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createProject(name: string) {
  const { data, error } = await supabase.rpc('create_project', { p_name: name })
  if (error) throw error
  return data
}

export async function joinProject(inviteCode: string) {
  const { data, error } = await supabase.rpc('join_project', { p_invite_code: inviteCode })
  if (error) throw error
  return data
}

export async function fetchProjectMembers(projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchPendingMembers(projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function respondMembership(memberId: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.from('project_members').update({ status }).eq('id', memberId)
  if (error) throw error
}

export function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function weekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'lunch', label: 'Обед' },
  { key: 'dinner', label: 'Ужин' },
]

export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
