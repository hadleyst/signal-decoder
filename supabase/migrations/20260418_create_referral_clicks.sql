create table if not exists referral_clicks (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  clicked_at timestamptz default now()
);

create index if not exists idx_referral_clicks_code on referral_clicks (code);

alter table referral_clicks enable row level security;

create policy "Service role can insert referral clicks"
  on referral_clicks for insert
  with check (true);

create policy "Service role can read referral clicks"
  on referral_clicks for select
  using (true);
