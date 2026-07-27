import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { fetchChatMessages, sendChatMessage, subscribeToChatMessages, type ChatMessageWithProfile } from '@/lib/supabase/social'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function scrollEl() {
  return document.getElementById('app-scroll')
}

function scrollToBottom(behavior: ScrollBehavior = 'auto') {
  const el = scrollEl()
  el?.scrollTo({ top: el.scrollHeight, behavior })
}

export function ChatTab() {
  const { user } = useAuth()
  const { currentProject } = useProject()
  const projectId = currentProject!.id
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchChatMessages(projectId).then((data) => {
      if (cancelled) return
      setMessages(data)
      setHasMore(data.length > 0)
      setLoading(false)
      requestAnimationFrame(() => scrollToBottom())
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    return subscribeToChatMessages(projectId, (message) => {
      setMessages((prev) => [...prev, message])
      const el = scrollEl()
      const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 200 : true
      if (nearBottom || message.user_id === user?.id) {
        requestAnimationFrame(() => scrollToBottom('smooth'))
      }
    })
  }, [projectId, user?.id])

  async function loadOlder() {
    if (!messages.length) return
    setLoadingOlder(true)
    const el = scrollEl()
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const older = await fetchChatMessages(projectId, messages[0].created_at)
      setMessages((prev) => [...older, ...prev])
      setHasMore(older.length > 0)
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight
      })
    } finally {
      setLoadingOlder(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendChatMessage(projectId, user!.id, text.trim())
      setText('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 p-4 pb-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3 rounded-lg" />)
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadOlder}
                disabled={loadingOlder}
                className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                {loadingOlder && <Loader2 className="size-3 animate-spin" />}
                Загрузить более ранние
              </button>
            )}
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Пока нет сообщений — начните обсуждение</p>
            )}
            {messages.map((m) => {
              const isMine = m.user_id === user?.id
              return (
                <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="size-6 shrink-0">
                    <AvatarImage src={m.profile.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials(m.profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {!isMine && <p className="text-xs font-medium opacity-70">{m.profile.full_name}</p>}
                    <p className="text-sm break-words whitespace-pre-wrap">{m.text}</p>
                    <p className={`mt-0.5 text-[10px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-20 mt-2 flex items-end gap-2 border-t bg-background/95 p-3 backdrop-blur"
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Сообщение..."
          className="min-h-11 resize-none py-2.5 text-sm"
          rows={1}
        />
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={sending || !text.trim()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  )
}
