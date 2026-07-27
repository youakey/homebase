import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchMealComments, addMealComment } from '@/lib/supabase/menu'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function CommentsThread({ mealSlotId }: { mealSlotId: string }) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const queryClient = useQueryClient()

  const { data: comments } = useQuery({
    queryKey: ['meal-comments', mealSlotId],
    queryFn: () => fetchMealComments(mealSlotId),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: (commentText: string) => addMealComment(mealSlotId, user!.id, commentText),
    onMutate: async (commentText) => {
      await queryClient.cancelQueries({ queryKey: ['meal-comments', mealSlotId] })
      const previous = queryClient.getQueryData(['meal-comments', mealSlotId])
      queryClient.setQueryData(['meal-comments', mealSlotId], (old: unknown[] = []) => [
        ...old,
        {
          id: `optimistic-${Date.now()}`,
          meal_slot_id: mealSlotId,
          user_id: user!.id,
          text: commentText,
          created_at: new Date().toISOString(),
          profile,
        },
      ])
      setText('')
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['meal-comments', mealSlotId], ctx.previous)
      toast.error(err instanceof Error ? err.message : 'Не удалось отправить комментарий')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['meal-comments', mealSlotId] }),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    mutation.mutate(text.trim())
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[36px] items-center gap-1.5 text-xs text-muted-foreground"
      >
        <MessageCircle className="size-3.5" />
        {comments?.length ? `Комментарии (${comments.length})` : 'Комментарии'}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {comments?.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar className="size-6">
                <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials(c.profile?.full_name ?? '?')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-lg bg-muted px-2.5 py-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium">{c.profile?.full_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-sm break-words">{c.text}</p>
              </div>
            </div>
          ))}
          {comments?.length === 0 && <p className="text-xs text-muted-foreground">Пока нет комментариев</p>}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Написать комментарий..."
              className="min-h-9 resize-none py-2 text-sm"
              rows={1}
            />
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={mutation.isPending || !text.trim()}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
