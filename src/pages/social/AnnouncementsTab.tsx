import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pin, Trash2, Loader2, Send } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { fetchAnnouncements, addAnnouncement, setAnnouncementPinned, deleteAnnouncement } from '@/lib/supabase/social'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function AnnouncementsTab() {
  const { user } = useAuth()
  const { currentProject } = useProject()
  const projectId = currentProject!.id
  const [text, setText] = useState('')
  const queryClient = useQueryClient()

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', projectId],
    queryFn: () => fetchAnnouncements(projectId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['announcements', projectId] })
  }

  const addMutation = useMutation({
    mutationFn: (t: string) => addAnnouncement(projectId, user!.id, t),
    onSuccess: () => {
      setText('')
      invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось опубликовать'),
  })

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => setAnnouncementPinned(id, pinned),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось закрепить'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось удалить'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    addMutation.mutate(text.trim())
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Новое объявление для соседей..."
          className="min-h-16 text-sm"
        />
        <Button type="submit" className="ml-auto gap-1.5" disabled={addMutation.isPending || !text.trim()}>
          {addMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Опубликовать
        </Button>
      </form>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : announcements?.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Пока нет объявлений</p>
      ) : (
        <div className="flex flex-col gap-2">
          {announcements?.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border bg-card/80 p-3 backdrop-blur-xl ${
                a.pinned ? 'border-flame-500/40 shadow-[0_0_0_1px_var(--flame-glow)]' : 'border-border'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={a.profile.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials(a.profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{a.profile.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => pinMutation.mutate({ id: a.id, pinned: !a.pinned })}
                    className={`flex size-8 items-center justify-center rounded-md ${a.pinned ? 'text-primary' : 'text-muted-foreground'}`}
                    aria-label={a.pinned ? 'Открепить' : 'Закрепить'}
                  >
                    <Pin className="size-4" fill={a.pinned ? 'currentColor' : 'none'} />
                  </button>
                  {a.user_id === user!.id && (
                    <button
                      onClick={() => deleteMutation.mutate(a.id)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground"
                      aria-label="Удалить"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm break-words whitespace-pre-wrap">{a.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
