-- HomeBase: Row Level Security для всех таблиц

alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table meal_slots enable row level security;
alter table meal_dishes enable row level security;
alter table meal_comments enable row level security;
alter table cleaning_duty enable row level security;
alter table duty_swap_requests enable row level security;
alter table announcements enable row level security;
alter table chat_messages enable row level security;

-- profiles: базовые данные (имя, аватар) можно читать всем авторизованным
-- (нужно для отображения имён участников/авторов комментариев), редактировать — только себя.
-- Вставка происходит только через триггер handle_new_user (security definer), политика insert не нужна.
create policy "profiles: authenticated can read" on profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles: user can update own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- projects: видно, если есть любая заявка (pending/approved/rejected) или ты owner.
-- Прямой insert запрещён (создание — только через RPC create_project).
create policy "projects: members and owner can read" on projects
  for select using (public.has_member_row(id) or owner_id = auth.uid());

create policy "projects: owner can update" on projects
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- project_members: свою заявку видит сам пользователь, approved-список видят approved-участники,
-- владелец видит всё (включая pending). Прямой insert запрещён (только через RPC join_project/create_project).
-- Подтверждать/отклонять заявки может только owner проекта.
create policy "project_members: read own, approved list, or owner sees all" on project_members
  for select using (
    user_id = auth.uid()
    or public.is_project_owner(project_id)
    or (status = 'approved' and public.is_approved_member(project_id))
  );

create policy "project_members: owner approves/rejects" on project_members
  for update using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- meal_slots: чтение/запись — approved-участники проекта
create policy "meal_slots: members can read" on meal_slots
  for select using (public.is_approved_member(project_id));

create policy "meal_slots: members can insert" on meal_slots
  for insert with check (public.is_approved_member(project_id));

create policy "meal_slots: members can update" on meal_slots
  for update using (public.is_approved_member(project_id)) with check (public.is_approved_member(project_id));

create policy "meal_slots: members can delete" on meal_slots
  for delete using (public.is_approved_member(project_id));

-- meal_dishes: доступ через project_id родительского meal_slot
create policy "meal_dishes: members can read" on meal_dishes
  for select using (
    exists (select 1 from meal_slots ms where ms.id = meal_dishes.meal_slot_id and public.is_approved_member(ms.project_id))
  );

create policy "meal_dishes: members can insert" on meal_dishes
  for insert with check (
    exists (select 1 from meal_slots ms where ms.id = meal_dishes.meal_slot_id and public.is_approved_member(ms.project_id))
  );

create policy "meal_dishes: members can update" on meal_dishes
  for update using (
    exists (select 1 from meal_slots ms where ms.id = meal_dishes.meal_slot_id and public.is_approved_member(ms.project_id))
  ) with check (
    exists (select 1 from meal_slots ms where ms.id = meal_dishes.meal_slot_id and public.is_approved_member(ms.project_id))
  );

create policy "meal_dishes: members can delete" on meal_dishes
  for delete using (
    exists (select 1 from meal_slots ms where ms.id = meal_dishes.meal_slot_id and public.is_approved_member(ms.project_id))
  );

-- meal_comments: читать могут все approved-участники, писать — от своего имени,
-- редактировать/удалять — только автор
create policy "meal_comments: members can read" on meal_comments
  for select using (
    exists (select 1 from meal_slots ms where ms.id = meal_comments.meal_slot_id and public.is_approved_member(ms.project_id))
  );

create policy "meal_comments: members can insert own" on meal_comments
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from meal_slots ms where ms.id = meal_comments.meal_slot_id and public.is_approved_member(ms.project_id))
  );

create policy "meal_comments: author can update" on meal_comments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "meal_comments: author can delete" on meal_comments
  for delete using (user_id = auth.uid());

-- cleaning_duty: чтение/запись — approved-участники проекта
create policy "cleaning_duty: members can read" on cleaning_duty
  for select using (public.is_approved_member(project_id));

create policy "cleaning_duty: members can insert" on cleaning_duty
  for insert with check (public.is_approved_member(project_id));

create policy "cleaning_duty: members can update" on cleaning_duty
  for update using (public.is_approved_member(project_id)) with check (public.is_approved_member(project_id));

-- duty_swap_requests: читают все approved-участники проекта (расписание общее),
-- создавать может только сам инициатор, отвечать (accept/decline/cancel) — через RPC выше.
create policy "duty_swap_requests: members can read" on duty_swap_requests
  for select using (public.is_approved_member(project_id));

create policy "duty_swap_requests: requester can insert own" on duty_swap_requests
  for insert with check (requester_id = auth.uid() and public.is_approved_member(project_id));

-- announcements: читают approved-участники, пишет любой approved-участник от своего имени,
-- закрепить (pinned) может любой участник, удалить — только автор
create policy "announcements: members can read" on announcements
  for select using (public.is_approved_member(project_id));

create policy "announcements: members can insert own" on announcements
  for insert with check (user_id = auth.uid() and public.is_approved_member(project_id));

create policy "announcements: members can update pinned" on announcements
  for update using (public.is_approved_member(project_id)) with check (public.is_approved_member(project_id));

create policy "announcements: author can delete" on announcements
  for delete using (user_id = auth.uid());

-- chat_messages: читают/пишут approved-участники проекта, от своего имени
create policy "chat_messages: members can read" on chat_messages
  for select using (public.is_approved_member(project_id));

create policy "chat_messages: members can insert own" on chat_messages
  for insert with check (user_id = auth.uid() and public.is_approved_member(project_id));
