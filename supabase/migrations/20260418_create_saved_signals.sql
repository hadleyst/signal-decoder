create table if not exists saved_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  slug text,
  signal_text text,
  explanation text not null,
  sentiment text not null,
  risk text not null,
  timeframe text not null,
  coin_symbol text,
  saved_at timestamptz default now()
);

create index if not exists idx_saved_signals_user on saved_signals (user_id, saved_at desc);

alter table saved_signals enable row level security;

create policy "Service role full access on saved_signals"
  on saved_signals for all
  using (true)
  with check (true);
