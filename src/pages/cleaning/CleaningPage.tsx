import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { startOfWeek, weekDates, toISODate, WEEKDAY_LABELS } from '@/lib/supabase/queries'
import { fetchApprovedMembers } from '@/lib/supabase/menu'
import {
  fetchDutyRange,
  setDutyResponsible,
  markDutyDone,
  deriveDutyStatus,
  fetchPendingDutySwaps,
  respondDutySwap,
  cancelDutySwap,
} from '@/lib/supabase/cleaning'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SwapRequestDialog } from './SwapRequestDialog'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function CleaningPage() {
  const { user } = useAuth()
  const { currentProject } = useProject()
  const projectId = currentProject!.id
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [editMode, setEditMode] = useState(false)
  const queryClient = useQueryClient()

  const dates = useMemo(() => weekDates(weekStart), [weekStart])
  const isoDates = useMemo(() => dates.map(toISODate), [dates])
  const todayIso = toISODate(new Date())

  const { data: duty, isLoading } = useQuery({
    queryKey: ['cleaning-duty', projectId, isoDates[0]],
    queryFn: () => fetchDutyRange(projectId, isoDates),
  })

  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchApprovedMembers(projectId),
  })

  const { data: swaps } = useQuery({
    queryKey: ['duty-swaps', projectId],
    queryFn: () => fetchPendingDutySwaps(projectId),
    refetchInterval: 20_000,
  })

  const incoming = (swaps ?? []).filter((s) => s.target_id === user!.id)
  const outgoing = (swaps ?? []).filter((s) => s.requester_id === user!.id)

  function invalidateDuty() {
    queryClient.invalidateQueries({ queryKey: ['cleaning-duty', projectId] })
  }

  const responsibleMutation = useMutation({
    mutationFn: ({ date, userId }: { date: string; userId: string | null }) =>
      setDutyResponsible(projectId, date, userId),
    onSuccess: invalidateDuty,
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось назначить ответственного'),
  })

  const doneMutation = useMutation({
    mutationFn: (dutyId: string) => markDutyDone(dutyId),
    onSuccess: invalidateDuty,
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось отметить выполнение'),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => respondDutySwap(id, accept),
    onSuccess: (_d, vars) => {
      toast.success(vars.accept ? 'Обмен подтверждён' : 'Обмен отклонён')
      queryClient.invalidateQueries({ queryKey: ['duty-swaps', projectId] })
      invalidateDuty()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось обработать запрос'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelDutySwap(id),
    onSuccess: () => {
      toast.success('Запрос отменён')
      queryClient.invalidateQueries({ queryKey: ['duty-swaps', projectId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось отменить запрос'),
  })

  function shiftWeek(delta: number) {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + delta * 7)
    setWeekStart(next)
  }

  const weekLabel = `${dates[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${dates[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Уборка кухни</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="edit-mode-cleaning" className="text-sm text-muted-foreground">
            Редактировать
          </Label>
          <Switch id="edit-mode-cleaning" checked={editMode} onCheckedChange={setEditMode} />
        </div>
      </div>

      {incoming.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3">
          <span className="text-xs font-semibold text-muted-foreground">
            Входящие предложения обмена ({incoming.length})
          </span>
          {incoming.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {s.requester.full_name} предлагает: вы берёте{' '}
                {new Date(s.requester_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, он(а)
                берёт {new Date(s.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => respondMutation.mutate({ id: s.id, accept: true })}
                  disabled={respondMutation.isPending}
                >
                  Принять
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => respondMutation.mutate({ id: s.id, accept: false })}
                  disabled={respondMutation.isPending}
                >
                  Отклонить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border p-3">
          <span className="text-xs font-semibold text-muted-foreground">Ваши предложения обмена</span>
          {outgoing.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                Ждём ответа от {s.target.full_name} (обмен на{' '}
                {new Date(s.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0"
                onClick={() => cancelMutation.mutate(s.id)}
                disabled={cancelMutation.isPending}
              >
                Отменить
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-1.5">
        <Button variant="ghost" size="icon" className="size-9" onClick={() => shiftWeek(-1)} aria-label="Прошлая неделя">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button variant="ghost" size="icon" className="size-9" onClick={() => shiftWeek(1)} aria-label="Следующая неделя">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {dates.map((date) => {
            const iso = toISODate(date)
            const isToday = iso === todayIso
            const row = duty?.find((d) => d.date === iso)
            const status = row ? deriveDutyStatus(row, todayIso) : 'scheduled'
            const isMine = row?.user_id === user!.id

            return (
              <div key={iso} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
                      {WEEKDAY_LABELS[(date.getDay() + 6) % 7]}, {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    <p className="text-xs text-muted-foreground">Уборка вечером после ужина</p>
                  </div>

                  {status === 'done' && (
                    <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                      <Check className="size-3" /> Выполнено
                    </Badge>
                  )}
                  {status === 'missed' && <Badge variant="destructive">Пропущено</Badge>}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  {editMode ? (
                    <Select
                      value={row?.user_id ?? 'none'}
                      onValueChange={(v) =>
                        responsibleMutation.mutate({ date: iso, userId: v === 'none' ? null : v })
                      }
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
                        <SelectValue placeholder="Назначить ответственного" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не назначен</SelectItem>
                        {members?.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : row?.profile ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={row.profile.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{initials(row.profile.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{row.profile.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Не назначен</span>
                  )}

                  {!editMode && row && (
                    <div className="flex shrink-0 gap-1.5">
                      {isMine && status === 'scheduled' && (
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => doneMutation.mutate(row.id)}
                          disabled={doneMutation.isPending}
                        >
                          {doneMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                          Выполнено
                        </Button>
                      )}
                      {isMine && iso >= todayIso && <SwapRequestDialog projectId={projectId} myDate={iso} />}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
