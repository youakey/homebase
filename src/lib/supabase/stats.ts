import { supabase } from './client'

export async function fetchBestCook(projectId: string) {
  const { data, error } = await supabase
    .from('stats_best_cook')
    .select('*')
    .eq('project_id', projectId)
    .order('meals_count', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchMostResponsible(projectId: string) {
  const { data, error } = await supabase.from('stats_cleaning_duty').select('*').eq('project_id', projectId)
  if (error) throw error
  const withRatio = (data ?? [])
    .filter((r) => r.done_count + r.missed_count > 0)
    .map((r) => ({ ...r, ratio: r.done_count / (r.done_count + r.missed_count) }))
    .sort((a, b) => b.ratio - a.ratio || b.done_count - a.done_count)
  return withRatio[0] ?? null
}

export async function fetchMostActiveChatter(projectId: string) {
  const { data, error } = await supabase
    .from('stats_chat_activity')
    .select('*')
    .eq('project_id', projectId)
    .order('messages_count', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
