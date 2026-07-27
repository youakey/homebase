-- HomeBase: явные grants на RPC-функции для роли authenticated (на случай нестандартных
-- дефолтных привилегий в проекте)

grant execute on function public.create_project(text) to authenticated;
grant execute on function public.join_project(text) to authenticated;
grant execute on function public.respond_duty_swap(uuid, boolean) to authenticated;
grant execute on function public.cancel_duty_swap(uuid) to authenticated;
