import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProject } from '@/hooks/useProject'
import { startOfWeek, weekDates, toISODate, WEEKDAY_LABELS } from '@/lib/supabase/queries'
import { fetchWeekMenu, fetchApprovedMembers } from '@/lib/supabase/menu'
import { fetchDutyRange } from '@/lib/supabase/cleaning'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const INTENSITY_CLASS = [
  'bg-muted',
  'bg-flame-600/50',
  'bg-gradient-to-br from-flame-400 to-flame-600',
]

export function WeeklyRhythm() {
  const { currentProject } = useProject()
  const projectId = currentProject!.id
  const weekStart = useMemo(() => startOfWeek(new Date()), [])
  const dates = useMemo(() => weekDates(weekStart), [weekStart])
  const isoDates = useMemo(() => dates.map(toISODate), [dates])

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchApprovedMembers(projectId),
  })

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['meal-slots', projectId, isoDates[0]],
    queryFn: () => fetchWeekMenu(projectId, isoDates),
  })

  const { data: duty, isLoading: dutyLoading } = useQuery({
    queryKey: ['cleaning-duty', projectId, isoDates[0]],
    queryFn: () => fetchDutyRange(projectId, isoDates),
  })

  const isLoading = membersLoading || menuLoading || dutyLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">Ритм недели</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : !members?.length ? (
          <p className="text-sm text-muted-foreground">Пока нет участников</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1.5rem_repeat(7,1fr)] items-center gap-1.5 pl-8">
              {WEEKDAY_LABELS.map((label) => (
                <span
                  key={label}
                  className="col-span-1 text-center font-mono text-[10px] text-text-tertiary"
                >
                  {label}
                </span>
              ))}
            </div>
            {members.map((m) => (
              <div key={m.user_id} className="grid grid-cols-[1.5rem_repeat(7,1fr)] items-center gap-1.5">
                <Avatar className="size-6" title={m.profile.full_name}>
                  <AvatarImage src={m.profile.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[9px]">{initials(m.profile.full_name)}</AvatarFallback>
                </Avatar>
                {isoDates.map((iso) => {
                  const cooked = menu?.some((s) => s.date === iso && s.responsible_user_id === m.user_id) ?? false
                  const cleaned =
                    duty?.some((d) => d.date === iso && d.user_id === m.user_id && d.status === 'done') ?? false
                  const intensity = (cooked ? 1 : 0) + (cleaned ? 1 : 0)
                  return (
                    <div
                      key={iso}
                      className={`aspect-square rounded-md ${INTENSITY_CLASS[intensity]}`}
                      title={
                        intensity === 0
                          ? 'Не участвовал(а)'
                          : [cooked && 'готовил(а)', cleaned && 'убрал(ась)'].filter(Boolean).join(' + ')
                      }
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
