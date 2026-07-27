import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, X, User } from 'lucide-react'
import type { MealType } from '@/lib/supabase/types'
import type { MealSlotWithDishes } from '@/lib/supabase/menu'
import { setMealResponsible, addDish, deleteDish } from '@/lib/supabase/menu'
import type { ProjectMemberWithProfile } from '@/lib/supabase/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CommentsThread } from './CommentsThread'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface Props {
  projectId: string
  date: string
  mealType: MealType
  label: string
  slot?: MealSlotWithDishes
  members: (ProjectMemberWithProfile & { profile: { id: string; full_name: string; avatar_url: string | null } })[]
  editMode: boolean
}

export function MealCard({ projectId, date, mealType, label, slot, members, editMode }: Props) {
  const [newDish, setNewDish] = useState('')
  const queryClient = useQueryClient()
  const responsible = members.find((m) => m.user_id === slot?.responsible_user_id)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['meal-slots', projectId] })
  }

  const responsibleMutation = useMutation({
    mutationFn: (userId: string | null) => setMealResponsible(projectId, date, mealType, userId),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось назначить ответственного'),
  })

  const addDishMutation = useMutation({
    mutationFn: (name: string) => addDish(projectId, date, mealType, name),
    onSuccess: () => {
      setNewDish('')
      invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось добавить блюдо'),
  })

  const deleteDishMutation = useMutation({
    mutationFn: (dishId: string) => deleteDish(dishId),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось удалить блюдо'),
  })

  function handleAddDish(e: FormEvent) {
    e.preventDefault()
    if (!newDish.trim()) return
    addDishMutation.mutate(newDish.trim())
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {!editMode &&
          (responsible ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{responsible.profile.full_name}</span>
              <Avatar className="size-5">
                <AvatarImage src={responsible.profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">{initials(responsible.profile.full_name)}</AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="size-3.5" />
              не назначен
            </span>
          ))}
      </div>

      {editMode && (
        <Select
          value={slot?.responsible_user_id ?? 'none'}
          onValueChange={(v) => responsibleMutation.mutate(v === 'none' ? null : v)}
        >
          <SelectTrigger className="mb-2 h-9 w-full text-sm">
            <SelectValue placeholder="Назначить ответственного" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Не назначен</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profile.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {slot?.meal_dishes.length ? (
        <ul className="flex flex-col gap-1">
          {slot.meal_dishes.map((dish) => (
            <li key={dish.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{dish.name}</span>
              {editMode && (
                <button
                  onClick={() => deleteDishMutation.mutate(dish.id)}
                  className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                  aria-label="Удалить блюдо"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !editMode && <p className="text-sm text-muted-foreground">Пока нет блюд</p>
      )}

      {editMode && (
        <form onSubmit={handleAddDish} className="mt-2 flex gap-2">
          <Input
            value={newDish}
            onChange={(e) => setNewDish(e.target.value)}
            placeholder="Добавить блюдо"
            className="h-9 text-sm"
          />
          <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!newDish.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      )}

      {slot && <CommentsThread mealSlotId={slot.id} />}
    </div>
  )
}
