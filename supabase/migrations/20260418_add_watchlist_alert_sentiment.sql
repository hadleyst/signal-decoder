-- Alert preference per watched coin: 'none' (default), 'any', 'bullish', 'bearish'
alter table watchlist add column if not exists alert_sentiment text default 'none';
