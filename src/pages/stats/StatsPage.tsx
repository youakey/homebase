import { useQuery } from '@tanstack/react-query'
import { ChefHat, ShieldCheck, MessageCircle } from 'lucide-react'
import { useProject } from '@/hooks/useProject'
import { fetchBestCook, fetchMostResponsible, fetchMostActiveChatter } from '@/lib/supabase/stats'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { WeeklyRhythm } from './WeeklyRhythm'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function StatCard({
  icon: Icon,
  title,
  name,
  avatarUrl,
  detail,
  loading,
}: {
  icon: typeof ChefHat
  title: string
  name?: string
  avatarUrl?: string | null
  detail?: string
  loading: boolean
}) {
  return (
    <Card className={name && !loading ? 'border-flame-500/40 shadow-[0_0_0_1px_var(--flame-glow)]' : undefined}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-flame-400 to-flame-600 text-primary-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-32" />
          ) : name ? (
            <div className="mt-0.5 flex items-center gap-2">
              <Avatar className="size-6" accent>
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
              </Avatar>
              <span className="truncate font-heading text-sm">{name}</span>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">Пока нет данных</p>
          )}
        </div>
        {detail && !loading && name && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-medium">{detail}</span>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsPage() {
  const { currentProject } = useProject()
  const projectId = currentProject!.id

  const { data: bestCook, isLoading: cookLoading } = useQuery({
    queryKey: ['stats-best-cook', projectId],
    queryFn: () => fetchBestCook(projectId),
  })

  const { data: mostResponsible, isLoading: respLoading } = useQuery({
    queryKey: ['stats-most-responsible', projectId],
    queryFn: () => fetchMostResponsible(projectId),
  })

  const { data: mostActive, isLoading: activeLoading } = useQuery({
    queryKey: ['stats-most-active', projectId],
    queryFn: () => fetchMostActiveChatter(projectId),
  })

  return (
    <div className="bg-glow flex flex-col gap-3 p-4">
      <h1 className="font-heading text-xl">Статистика</h1>

      <WeeklyRhythm />

      <StatCard
        icon={ChefHat}
        title="Лучший повар"
        name={bestCook?.full_name}
        avatarUrl={bestCook?.avatar_url}
        detail={bestCook ? `${bestCook.meals_count} приёмов пищи` : undefined}
        loading={cookLoading}
      />

      <StatCard
        icon={ShieldCheck}
        title="Самый ответственный"
        name={mostResponsible?.full_name}
        avatarUrl={mostResponsible?.avatar_url}
        detail={mostResponsible ? `${mostResponsible.done_count} дежурств без пропуска` : undefined}
        loading={respLoading}
      />

      <StatCard
        icon={MessageCircle}
        title="Самый активный в чате"
        name={mostActive?.full_name}
        avatarUrl={mostActive?.avatar_url}
        detail={mostActive ? `${mostActive.messages_count} сообщений` : undefined}
        loading={activeLoading}
      />
    </div>
  )
}
