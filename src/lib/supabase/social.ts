import { supabase } from './client'
import type { Announcement, ChatMessage } from './types'

export type AnnouncementWithProfile = Announcement & {
  profile: { id: string; full_name: string; avatar_url: string | null }
}

export type ChatMessageWithProfile = ChatMessage & {
  profile: { id: string; full_name: string; avatar_url: string | null }
}

export async function fetchAnnouncements(projectId: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as AnnouncementWithProfile[]
}

export async function addAnnouncement(projectId: string, userId: string, text: string) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ project_id: projectId, user_id: userId, text })
    .select('*, profile:profiles(*)')
    .single()
  if (error) throw error
  return data as AnnouncementWithProfile
}

export async function setAnnouncementPinned(id: string, pinned: boolean) {
  const { error } = await supabase.from('announcements').update({ pinned }).eq('id', id)
  if (error) throw error
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}

const CHAT_PAGE_SIZE = 50

export async function fetchChatMessages(projectId: string, beforeIso?: string) {
  let query = supabase
    .from('chat_messages')
    .select('*, profile:profiles(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(CHAT_PAGE_SIZE)

  if (beforeIso) query = query.lt('created_at', beforeIso)

  const { data, error } = await query
  if (error) throw error
  return (data as ChatMessageWithProfile[]).reverse()
}

export async function sendChatMessage(projectId: string, userId: string, text: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ project_id: projectId, user_id: userId, text })
    .select('*, profile:profiles(*)')
    .single()
  if (error) throw error
  return data as ChatMessageWithProfile
}

export function subscribeToChatMessages(projectId: string, onInsert: (message: ChatMessageWithProfile) => void) {
  const channel = supabase
    .channel(`chat:${projectId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `project_id=eq.${projectId}` },
      async (payload) => {
        const row = payload.new as ChatMessage
        const { data } = await supabase.from('profiles').select('*').eq('id', row.user_id).single()
        onInsert({ ...row, profile: data! })
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
