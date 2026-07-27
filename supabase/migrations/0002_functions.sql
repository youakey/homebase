-- HomeBase: вспомогательные функции (RLS-хелперы + RPC для онбординга)

-- Хелпер: текущий пользователь — approved-участник проекта
create function public.is_approved_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.status = 'approved'
  );
$$;

-- Хелпер: текущий пользователь — владелец проекта
create function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project_id
      and p.owner_id = auth.uid()
  );
$$;

-- Хелпер: текущий пользователь имеет любую (pending/approved/rejected) заявку в проект
create function public.has_member_row(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

-- Генератор короткого человекочитаемого invite-кода (6 символов, без похожих букв/цифр)
create function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  exists_already boolean;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from projects where invite_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

-- RPC: создать проект — вызывающий становится owner + approved-участником
create function public.create_project(p_name text)
returns projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project projects;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Название проекта не может быть пустым';
  end if;

  insert into projects (name, invite_code, owner_id)
  values (trim(p_name), public.generate_invite_code(), auth.uid())
  returning * into new_project;

  insert into project_members (project_id, user_id, role, status)
  values (new_project.id, auth.uid(), 'owner', 'approved');

  return new_project;
end;
$$;

-- RPC: вступить в проект по invite-коду — создаёт pending-заявку, возвращает проект
create function public.join_project(p_invite_code text)
returns projects
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project projects;
begin
  select * into target_project
  from projects
  where invite_code = upper(trim(p_invite_code));

  if target_project.id is null then
    raise exception 'Проект с таким кодом не найден';
  end if;

  insert into project_members (project_id, user_id, role, status)
  values (target_project.id, auth.uid(), 'member', 'pending')
  on conflict (project_id, user_id) do nothing;

  return target_project;
end;
$$;
