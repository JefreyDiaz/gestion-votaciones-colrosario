create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'poll_status') then
    create type public.poll_status as enum ('draft', 'open', 'closed', 'archived');
  end if;
end $$;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.poll_status not null default 'draft',
  created_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint polls_date_range_check check (ends_at > starts_at)
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  candidate_name text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete restrict,
  voter_document text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint votes_unique_document_per_poll unique (poll_id, voter_document)
);

create index if not exists idx_polls_schedule on public.polls (status, starts_at, ends_at);
create index if not exists idx_poll_options_poll_sort on public.poll_options (poll_id, sort_order);
create index if not exists idx_votes_poll_created on public.votes (poll_id, created_at desc);
create index if not exists idx_votes_option on public.votes (option_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;

drop policy if exists "public_read_open_polls" on public.polls;
create policy "public_read_open_polls"
on public.polls
for select
to anon, authenticated
using (
  status = 'open'
  and starts_at <= timezone('utc', now())
  and ends_at >= timezone('utc', now())
);

drop policy if exists "public_read_open_poll_options" on public.poll_options;
create policy "public_read_open_poll_options"
on public.poll_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls p
    where p.id = poll_options.poll_id
      and p.status = 'open'
      and p.starts_at <= timezone('utc', now())
      and p.ends_at >= timezone('utc', now())
  )
);

drop policy if exists "public_insert_vote_on_open_poll" on public.votes;
create policy "public_insert_vote_on_open_poll"
on public.votes
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.polls p
    where p.id = votes.poll_id
      and p.status = 'open'
      and p.starts_at <= timezone('utc', now())
      and p.ends_at >= timezone('utc', now())
  )
);

-- No se crea policy de lectura para votos: solo el service role (backend) puede consultarlos.
