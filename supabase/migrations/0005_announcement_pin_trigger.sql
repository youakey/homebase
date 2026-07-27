-- HomeBase: ограничение на UPDATE announcements — любой участник может (пере)закрепить
-- объявление (pinned), но менять текст/автора чужого объявления нельзя (только сам автор).

create function public.enforce_announcement_update()
returns trigger
language plpgsql
as $$
begin
  if old.user_id <> auth.uid() then
    if new.text is distinct from old.text
       or new.user_id is distinct from old.user_id
       or new.project_id is distinct from old.project_id then
      raise exception 'Редактировать текст чужого объявления нельзя, можно только закрепить/открепить';
    end if;
  end if;
  return new;
end;
$$;

create trigger before_announcement_update
  before update on announcements
  for each row execute procedure public.enforce_announcement_update();
