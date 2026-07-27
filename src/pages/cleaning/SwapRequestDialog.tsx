import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchUpcomingDuty, createDutySwapRequest } from '@/lib/supabase/cleaning'
import { toISODate } from '@/lib/supabase/queries'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'

export function SwapRequestDialog({ projectId, myDate }: { projectId: string; myDate: string }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: upcoming, isLoading } = useQuery({
    queryKey: ['upcoming-duty', projectId],
    queryFn: () => fetchUpcomingDuty(projectId, toISODate(new Date())),
    enabled: open,
  })

  const candidates = (upcoming ?? []).filter(
    (d) => d.user_id && d.user_id !== user!.id && d.date !== myDate && d.status === 'scheduled',
  )

  const mutation = useMutation({
    mutationFn: (targetDate: string) => {
      const target = candidates.find((c) => c.date === targetDate)!
      return createDutySwapRequest({
        projectId,
        requesterId: user!.id,
        requesterDate: myDate,
        targetId: target.user_id!,
        targetDate,
      })
    },
    onSuccess: () => {
      toast.success('Предложение обмена отправлено')
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['duty-swaps', projectId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось отправить предложение'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <ArrowLeftRight className="size-3.5" />
            Предложить обмен
          </Button>
        }
      />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Предложить обмен</DialogTitle>
          <DialogDescription>
            Выберите день другого участника, которым хотите поменяться со своим дежурством{' '}
            {new Date(myDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin" />
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет доступных дней для обмена</p>
        ) : (
          <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => mutation.mutate(c.date)}
                disabled={mutation.isPending}
                className="flex min-h-11 items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                <span>{new Date(c.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="text-muted-foreground">{c.profile?.full_name}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
