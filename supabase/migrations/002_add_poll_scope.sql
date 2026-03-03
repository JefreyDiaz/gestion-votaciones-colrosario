do $$
begin
  if not exists (select 1 from pg_type where typname = 'poll_scope') then
    create type public.poll_scope as enum ('general', 'salon');
  end if;
end $$;

alter table public.polls
add column if not exists scope public.poll_scope not null default 'general';

create index if not exists idx_polls_scope_schedule
on public.polls (scope, status, starts_at, ends_at);
