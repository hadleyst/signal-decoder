create table if not exists public_signals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  signal_text text,
  explanation text not null,
  sentiment text not null,
  risk text not null,
  timeframe text not null,
  glossary jsonb default '[]'::jsonb,
  coin_symbol text,
  created_at timestamptz default now()
);

-- Fast lookups by slug (public page loads)
create index if not exists idx_public_signals_slug on public_signals (slug);

-- Allow the service role to read/write; anon can read for public pages
alter table public_signals enable row level security;

create policy "Anyone can view public signals"
  on public_signals for select
  using (true);

create policy "Service role can insert public signals"
  on public_signals for insert
  with check (true);
