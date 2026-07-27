-- HomeBase: базовая схема

create extension if not exists pgcrypto;

-- Профиль пользователя (1:1 с auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Автосоздание профиля при регистрации (имя берётся из user_metadata.full_name,
-- задаётся на клиенте при signUp; если не передано — используется email как fallback)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Проект (квартира/дом)
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  owner_id uuid not null references profiles(id),
  created_at timestamptz default now()
);

-- Участники проекта + статус заявки
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

create index idx_project_members_project on project_members(project_id);
create index idx_project_members_user on project_members(user_id);

-- Приёмы пищи на конкретную дату (breakfast/lunch/dinner)
create table meal_slots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner')),
  responsible_user_id uuid references profiles(id),
  updated_at timestamptz default now(),
  unique(project_id, date, meal_type)
);

create index idx_meal_slots_project_date on meal_slots(project_id, date);

-- Блюда внутри приёма пищи
create table meal_dishes (
  id uuid primary key default gen_random_uuid(),
  meal_slot_id uuid not null references meal_slots(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_meal_dishes_slot on meal_dishes(meal_slot_id);

-- Комментарии к приёму пищи
create table meal_comments (
  id uuid primary key default gen_random_uuid(),
  meal_slot_id uuid not null references meal_slots(id) on delete cascade,
  user_id uuid not null references profiles(id),
  text text not null,
  created_at timestamptz default now()
);

create index idx_meal_comments_slot on meal_comments(meal_slot_id);

-- Дежурства по уборке кухни (1 запись = 1 дата = 1 ответственный)
create table cleaning_duty (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  user_id uuid references profiles(id),
  status text not null default 'scheduled' check (status in ('scheduled','done','missed')),
  done_at timestamptz,
  unique(project_id, date)
);

create index idx_cleaning_duty_project_date on cleaning_duty(project_id, date);

-- Запросы на обмен дежурством
create table duty_swap_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  requester_id uuid not null references profiles(id),
  requester_date date not null,
  target_id uuid not null references profiles(id),
  target_date date not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index idx_duty_swap_project on duty_swap_requests(project_id);
create index idx_duty_swap_target on duty_swap_requests(target_id, status);

-- Объявления
create table announcements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id),
  text text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

create index idx_announcements_project on announcements(project_id, created_at desc);

-- Общий чат/обсуждение
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id),
  text text not null,
  created_at timestamptz default now()
);

create index idx_chat_messages_project on chat_messages(project_id, created_at desc);
