-- Add weekly digest opt-out column (defaults to true = opted in)
alter table user_settings add column if not exists weekly_digest boolean default true;
