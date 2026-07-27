import { supabase } from './client'
import type { CleaningDuty, DutyStatus } from './types'

export type DutyWithProfile = CleaningDuty & {
  profile: { id: string; full_name: string; avatar_url: string | null } | null
}

export function deriveDutyStatus(duty: Pick<CleaningDuty, 'date' | 'status'>, todayIso: string): DutyStatus {
  if (duty.status === 'scheduled' && duty.date < todayIso) return 'missed'
  return duty.status
}

export async function fetchDutyRange(projectId: string, dates: string[]) {
  const { data, error } = await supabase
    .from('cleaning_duty')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)
    .in('date', dates)
  if (error) throw error
  return data as DutyWithProfile[]
}

export async function fetchUpcomingDuty(projectId: string, fromDateIso: string) {
  const { data, error } = await supabase
    .from('cleaning_duty')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)
    .gte('date', fromDateIso)
    .order('date', { ascending: true })
    .limit(28)
  if (error) throw error
  return data as DutyWithProfile[]
}

export async function setDutyResponsible(projectId: string, date: string, userId: string | null) {
  const { data, error } = await supabase
    .from('cleaning_duty')
    .upsert({ project_id: projectId, date, user_id: userId }, { onConflict: 'project_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markDutyDone(dutyId: string) {
  const { error } = await supabase
    .from('cleaning_duty')
    .update({ status: 'done', done_at: new Date().toISOString() })
    .eq('id', dutyId)
  if (error) throw error
}

export type DutySwapWithProfiles = {
  id: string
  project_id: string
  requester_id: string
  requester_date: string
  target_id: string
  target_date: string
  status: string
  created_at: string
  resolved_at: string | null
  requester: { id: string; full_name: string; avatar_url: string | null }
  target: { id: string; full_name: string; avatar_url: string | null }
}

export async function fetchPendingDutySwaps(projectId: string) {
  const { data, error } = await supabase
    .from('duty_swap_requests')
    .select(
      '*, requester:profiles!duty_swap_requests_requester_id_fkey(*), target:profiles!duty_swap_requests_target_id_fkey(*)',
    )
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as DutySwapWithProfiles[]
}

export async function createDutySwapRequest(params: {
  projectId: string
  requesterId: string
  requesterDate: string
  targetId: string
  targetDate: string
}) {
  const { error } = await supabase.from('duty_swap_requests').insert({
    project_id: params.projectId,
    requester_id: params.requesterId,
    requester_date: params.requesterDate,
    target_id: params.targetId,
    target_date: params.targetDate,
  })
  if (error) throw error
}

export async function respondDutySwap(requestId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond_duty_swap', { p_request_id: requestId, p_accept: accept })
  if (error) throw error
}

export async function cancelDutySwap(requestId: string) {
  const { error } = await supabase.rpc('cancel_duty_swap', { p_request_id: requestId })
  if (error) throw error
}
