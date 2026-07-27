import { supabase } from './client'
import type { MealDish, MealSlot, MealType } from './types'
import { MEAL_TYPES } from './queries'

export type MealSlotWithDishes = MealSlot & { meal_dishes: MealDish[] }

export async function fetchWeekMenu(projectId: string, dates: string[]) {
  const { data, error } = await supabase
    .from('meal_slots')
    .select('*, meal_dishes(*)')
    .eq('project_id', projectId)
    .in('date', dates)
  if (error) throw error
  return (data as MealSlotWithDishes[]).map((slot) => ({
    ...slot,
    meal_dishes: [...slot.meal_dishes].sort((a, b) => a.sort_order - b.sort_order),
  }))
}

export async function fetchApprovedMembers(projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

async function getOrCreateMealSlot(projectId: string, date: string, mealType: MealType) {
  const { data, error } = await supabase
    .from('meal_slots')
    .upsert({ project_id: projectId, date, meal_type: mealType }, { onConflict: 'project_id,date,meal_type' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setMealResponsible(
  projectId: string,
  date: string,
  mealType: MealType,
  userId: string | null,
) {
  const { data, error } = await supabase
    .from('meal_slots')
    .upsert(
      { project_id: projectId, date, meal_type: mealType, responsible_user_id: userId },
      { onConflict: 'project_id,date,meal_type' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addDish(projectId: string, date: string, mealType: MealType, name: string) {
  const slot = await getOrCreateMealSlot(projectId, date, mealType)
  const { data, error } = await supabase
    .from('meal_dishes')
    .insert({ meal_slot_id: slot.id, name, sort_order: Date.parse(date) })
    .select()
    .single()
  if (error) throw error
  return { ...data, meal_slot_id: slot.id }
}

export async function deleteDish(dishId: string) {
  const { error } = await supabase.from('meal_dishes').delete().eq('id', dishId)
  if (error) throw error
}

export async function fetchMealComments(mealSlotId: string) {
  const { data, error } = await supabase
    .from('meal_comments')
    .select('*, profile:profiles(*)')
    .eq('meal_slot_id', mealSlotId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addMealComment(mealSlotId: string, userId: string, text: string) {
  const { data, error } = await supabase
    .from('meal_comments')
    .insert({ meal_slot_id: mealSlotId, user_id: userId, text })
    .select('*, profile:profiles(*)')
    .single()
  if (error) throw error
  return data
}

// Копирует состав блюд и ответственных из предыдущей недели в текущую (сдвиг дат на 7 дней)
export async function copyWeekMenu(projectId: string, sourceDates: string[], targetDates: string[]) {
  const sourceMenu = await fetchWeekMenu(projectId, sourceDates)

  for (let i = 0; i < sourceDates.length; i++) {
    const targetDate = targetDates[i]
    for (const { key: mealType } of MEAL_TYPES) {
      const sourceSlot = sourceMenu.find((s) => s.date === sourceDates[i] && s.meal_type === mealType)
      if (!sourceSlot) continue

      const targetSlot = await getOrCreateMealSlot(projectId, targetDate, mealType)
      if (sourceSlot.responsible_user_id) {
        await setMealResponsible(projectId, targetDate, mealType, sourceSlot.responsible_user_id)
      }

      await supabase.from('meal_dishes').delete().eq('meal_slot_id', targetSlot.id)
      if (sourceSlot.meal_dishes.length > 0) {
        const { error } = await supabase.from('meal_dishes').insert(
          sourceSlot.meal_dishes.map((d) => ({
            meal_slot_id: targetSlot.id,
            name: d.name,
            sort_order: d.sort_order,
          })),
        )
        if (error) throw error
      }
    }
  }
}
