-- HomeBase: представления для раздела «Статистика».
-- security_invoker гарантирует, что RLS применяется от имени вызывающего пользователя,
-- а не владельца view — иначе представление могло бы "пробить" изоляцию по project_id.

create view stats_best_cook
with (security_invoker = true) as
select
  ms.project_id,
  ms.responsible_user_id as user_id,
  p.full_name,
  p.avatar_url,
  count(*) as meals_count
from meal_slots ms
join profiles p on p.id = ms.responsible_user_id
where ms.responsible_user_id is not null
group by ms.project_id, ms.responsible_user_id, p.full_name, p.avatar_url;

create view stats_cleaning_duty
with (security_invoker = true) as
select
  cd.project_id,
  cd.user_id,
  p.full_name,
  p.avatar_url,
  count(*) filter (where cd.status = 'done') as done_count,
  count(*) filter (where cd.status = 'missed' or (cd.status = 'scheduled' and cd.date < current_date)) as missed_count
from cleaning_duty cd
join profiles p on p.id = cd.user_id
where cd.user_id is not null
group by cd.project_id, cd.user_id, p.full_name, p.avatar_url;

create view stats_chat_activity
with (security_invoker = true) as
select
  cm.project_id,
  cm.user_id,
  p.full_name,
  p.avatar_url,
  count(*) as messages_count
from chat_messages cm
join profiles p on p.id = cm.user_id
group by cm.project_id, cm.user_id, p.full_name, p.avatar_url;

grant select on stats_best_cook to authenticated;
grant select on stats_cleaning_duty to authenticated;
grant select on stats_chat_activity to authenticated;
