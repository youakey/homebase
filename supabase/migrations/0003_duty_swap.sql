-- HomeBase: атомарный обмен дежурствами (принять/отклонить)

-- RPC: ответить на запрос обмена дежурством. Может вызвать только target_id запроса.
-- При accept = true — меняет местами user_id в cleaning_duty для requester_date и target_date
-- и помечает запрос accepted; при accept = false — помечает declined, расписание не меняется.
create function public.respond_duty_swap(p_request_id uuid, p_accept boolean)
returns duty_swap_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req duty_swap_requests;
begin
  select * into req from duty_swap_requests where id = p_request_id for update;

  if req.id is null then
    raise exception 'Запрос на обмен не найден';
  end if;

  if req.target_id <> auth.uid() then
    raise exception 'Ответить на этот запрос может только приглашённая сторона';
  end if;

  if req.status <> 'pending' then
    raise exception 'Запрос уже обработан';
  end if;

  if p_accept then
    update cleaning_duty set user_id = req.target_id
      where project_id = req.project_id and date = req.requester_date;
    update cleaning_duty set user_id = req.requester_id
      where project_id = req.project_id and date = req.target_date;

    update duty_swap_requests
      set status = 'accepted', resolved_at = now()
      where id = p_request_id
      returning * into req;
  else
    update duty_swap_requests
      set status = 'declined', resolved_at = now()
      where id = p_request_id
      returning * into req;
  end if;

  return req;
end;
$$;

-- RPC: отменить свой же (ещё не обработанный) запрос на обмен
create function public.cancel_duty_swap(p_request_id uuid)
returns duty_swap_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req duty_swap_requests;
begin
  select * into req from duty_swap_requests where id = p_request_id for update;

  if req.id is null then
    raise exception 'Запрос на обмен не найден';
  end if;

  if req.requester_id <> auth.uid() then
    raise exception 'Отменить запрос может только его инициатор';
  end if;

  if req.status <> 'pending' then
    raise exception 'Запрос уже обработан';
  end if;

  update duty_swap_requests
    set status = 'cancelled', resolved_at = now()
    where id = p_request_id
    returning * into req;

  return req;
end;
$$;
