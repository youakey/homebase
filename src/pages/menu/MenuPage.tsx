import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react'
import { useProject } from '@/hooks/useProject'
import { startOfWeek, weekDates, toISODate, WEEKDAY_LABELS, MEAL_TYPES } from '@/lib/supabase/queries'
import { fetchWeekMenu, fetchApprovedMembers, copyWeekMenu } from '@/lib/supabase/menu'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { MealCard } from './MealCard'

export function MenuPage() {
  const { currentProject } = useProject()
  const projectId = currentProject!.id
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [editMode, setEditMode] = useState(false)
  const queryClient = useQueryClient()

  const dates = useMemo(() => weekDates(weekStart), [weekStart])
  const isoDates = useMemo(() => dates.map(toISODate), [dates])
  const todayIso = toISODate(new Date())

  const { data: menu, isLoading } = useQuery({
    queryKey: ['meal-slots', projectId, isoDates[0]],
    queryFn: () => fetchWeekMenu(projectId, isoDates),
  })

  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchApprovedMembers(projectId),
  })

  const copyMutation = useMutation({
    mutationFn: () => {
      const prevWeekStart = new Date(weekStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      const prevDates = weekDates(prevWeekStart).map(toISODate)
      return copyWeekMenu(projectId, prevDates, isoDates)
    },
    onSuccess: () => {
      toast.success('Меню прошлой недели скопировано')
      queryClient.invalidateQueries({ queryKey: ['meal-slots', projectId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось скопировать неделю'),
  })

  function handleCopyPreviousWeek() {
    const hasData = menu?.some((s) => s.responsible_user_id || s.meal_dishes.length > 0)
    if (hasData && !confirm('В текущей неделе уже есть данные. Перезаписать их данными прошлой недели?')) {
      return
    }
    copyMutation.mutate()
  }

  function shiftWeek(delta: number) {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + delta * 7)
    setWeekStart(next)
  }

  const weekLabel = `${dates[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${dates[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Меню</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="edit-mode" className="text-sm text-muted-foreground">
            Редактировать
          </Label>
          <Switch id="edit-mode" checked={editMode} onCheckedChange={setEditMode} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-1.5">
        <Button variant="ghost" size="icon" className="size-9" onClick={() => shiftWeek(-1)} aria-label="Прошлая неделя">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button variant="ghost" size="icon" className="size-9" onClick={() => shiftWeek(1)} aria-label="Следующая неделя">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {editMode && (
        <Button variant="outline" className="gap-2" onClick={handleCopyPreviousWeek} disabled={copyMutation.isPending}>
          {copyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
          Скопировать прошлую неделю
        </Button>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <Accordion defaultValue={[`day-${todayIso}`]}>
          {dates.map((date) => {
            const iso = toISODate(date)
            const isToday = iso === todayIso
            return (
              <AccordionItem key={iso} value={`day-${iso}`}>
                <AccordionTrigger className="text-sm">
                  <span className={isToday ? 'font-semibold text-primary' : ''}>
                    {WEEKDAY_LABELS[(date.getDay() + 6) % 7]}, {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    {isToday && ' · сегодня'}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2">
                  {MEAL_TYPES.map(({ key, label }) => (
                    <MealCard
                      key={key}
                      projectId={projectId}
                      date={iso}
                      mealType={key}
                      label={label}
                      slot={menu?.find((s) => s.date === iso && s.meal_type === key)}
                      members={members ?? []}
                      editMode={editMode}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
