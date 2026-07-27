// Ручные типы под схему supabase/migrations/*.sql.
// Если позже подключите Supabase CLI, можно заменить на сгенерированные
// (`supabase gen types typescript`) — структура полей останется совместимой.
//
// Важно: сущности объявлены через `type`, а не `interface` — интерфейсы в TS
// считаются "открытыми" (доступны для declaration merging) и не проходят
// структурную проверку `extends Record<string, unknown>`, которую requires
// generic-контракт supabase-js (GenericTable). Из-за этого `.update()`/`.rpc()`
// переставали типизироваться и падали в `never`/`undefined`.

export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type MemberStatus = 'pending' | 'approved' | 'rejected'
export type MemberRole = 'owner' | 'member'
export type DutyStatus = 'scheduled' | 'done' | 'missed'
export type SwapStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export type Profile = {
  id: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

export type Project = {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
}

export type ProjectMember = {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  status: MemberStatus
  created_at: string
}

export type ProjectMemberWithProfile = ProjectMember & { profile: Profile }

export type MealSlot = {
  id: string
  project_id: string
  date: string
  meal_type: MealType
  responsible_user_id: string | null
  updated_at: string
}

export type MealDish = {
  id: string
  meal_slot_id: string
  name: string
  sort_order: number
  created_at: string
}

export type MealComment = {
  id: string
  meal_slot_id: string
  user_id: string
  text: string
  created_at: string
}

export type CleaningDuty = {
  id: string
  project_id: string
  date: string
  user_id: string | null
  status: DutyStatus
  done_at: string | null
}

export type DutySwapRequest = {
  id: string
  project_id: string
  requester_id: string
  requester_date: string
  target_id: string
  target_date: string
  status: SwapStatus
  created_at: string
  resolved_at: string | null
}

export type Announcement = {
  id: string
  project_id: string
  user_id: string
  text: string
  pinned: boolean
  created_at: string
}

export type ChatMessage = {
  id: string
  project_id: string
  user_id: string
  text: string
  created_at: string
}

export type StatsBestCook = {
  project_id: string
  user_id: string
  full_name: string
  avatar_url: string | null
  meals_count: number
}

export type StatsCleaningDuty = {
  project_id: string
  user_id: string
  full_name: string
  avatar_url: string | null
  done_count: number
  missed_count: number
}

export type StatsChatActivity = {
  project_id: string
  user_id: string
  full_name: string
  avatar_url: string | null
  messages_count: number
}

type Table<Row, Relationships extends readonly Record<string, unknown>[] = []> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: Relationships
}

type View<Row> = { Row: Row; Relationships: [] }

// Метаданные FK, нужные supabase-js для типизации embedded-select'ов
// (`.select('*, profile:profiles(*)')` и т.п.) — соответствуют внешним ключам из 0001_init.sql.
type FK<
  Name extends string,
  Columns extends readonly string[],
  Ref extends string,
  RefColumns extends readonly string[],
> = {
  foreignKeyName: Name
  columns: Columns
  isOneToOne: false
  referencedRelation: Ref
  referencedColumns: RefColumns
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>
      projects: Table<Project, [FK<'projects_owner_id_fkey', ['owner_id'], 'profiles', ['id']>]>
      project_members: Table<
        ProjectMember,
        [
          FK<'project_members_project_id_fkey', ['project_id'], 'projects', ['id']>,
          FK<'project_members_user_id_fkey', ['user_id'], 'profiles', ['id']>,
        ]
      >
      meal_slots: Table<
        MealSlot,
        [FK<'meal_slots_responsible_user_id_fkey', ['responsible_user_id'], 'profiles', ['id']>]
      >
      meal_dishes: Table<MealDish, [FK<'meal_dishes_meal_slot_id_fkey', ['meal_slot_id'], 'meal_slots', ['id']>]>
      meal_comments: Table<
        MealComment,
        [
          FK<'meal_comments_meal_slot_id_fkey', ['meal_slot_id'], 'meal_slots', ['id']>,
          FK<'meal_comments_user_id_fkey', ['user_id'], 'profiles', ['id']>,
        ]
      >
      cleaning_duty: Table<CleaningDuty, [FK<'cleaning_duty_user_id_fkey', ['user_id'], 'profiles', ['id']>]>
      duty_swap_requests: Table<
        DutySwapRequest,
        [
          FK<'duty_swap_requests_requester_id_fkey', ['requester_id'], 'profiles', ['id']>,
          FK<'duty_swap_requests_target_id_fkey', ['target_id'], 'profiles', ['id']>,
        ]
      >
      announcements: Table<Announcement, [FK<'announcements_user_id_fkey', ['user_id'], 'profiles', ['id']>]>
      chat_messages: Table<ChatMessage, [FK<'chat_messages_user_id_fkey', ['user_id'], 'profiles', ['id']>]>
    }
    Views: {
      stats_best_cook: View<StatsBestCook>
      stats_cleaning_duty: View<StatsCleaningDuty>
      stats_chat_activity: View<StatsChatActivity>
    }
    Functions: {
      create_project: { Args: { p_name: string }; Returns: Project }
      join_project: { Args: { p_invite_code: string }; Returns: Project }
      respond_duty_swap: { Args: { p_request_id: string; p_accept: boolean }; Returns: DutySwapRequest }
      cancel_duty_swap: { Args: { p_request_id: string }; Returns: DutySwapRequest }
    }
  }
}
