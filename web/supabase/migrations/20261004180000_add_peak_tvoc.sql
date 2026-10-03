-- センサーの記録に TVOC(揮発性有機化合物の総量)の最大値を追加する。
-- 警報器の判定が TVOC になったため。これより前の記録は空(null)のまま。
alter table public.poop_events
  add column peak_tvoc integer check (peak_tvoc >= 0);

comment on column public.poop_events.peak_tvoc is
  'センサー: 警報中の TVOC の最大値 [ppb](警報器はこの値で判定する)';
