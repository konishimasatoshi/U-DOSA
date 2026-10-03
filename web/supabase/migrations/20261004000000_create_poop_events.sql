-- うんちの記録テーブル(U-DOSA)
-- センサー(うんち警報器)が自動で登録する記録と、外出中などに手で追加した記録の両方を入れる。
-- kakeiboo と同じ Supabase プロジェクトに置くが、expenses テーブルとは関係しない。
create table public.poop_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  source text not null check (source in ('sensor', 'manual')),
  duration_sec integer check (duration_sec >= 0),
  peak_h2 integer,
  peak_eth integer,
  note text check (char_length(note) <= 200),
  is_false_alarm boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.poop_events is 'うんちの記録(U-DOSA)';
comment on column public.poop_events.occurred_at is 'うんちの日時。センサーは検知した時刻(サーバーの now())';
comment on column public.poop_events.source is 'sensor: 警報器が検知 / manual: 手で追加';
comment on column public.poop_events.duration_sec is 'センサー: においが続いた秒数(警報解除時に更新)';
comment on column public.poop_events.peak_h2 is 'センサー: H2 生信号のベースラインからの最大上昇量';
comment on column public.poop_events.peak_eth is 'センサー: Ethanol 生信号のベースラインからの最大上昇量';
comment on column public.poop_events.is_false_alarm is '誤検知として除外したら true(元に戻せるよう行は残す)';

create index poop_events_occurred_at_idx on public.poop_events (occurred_at desc);

-- RLS: U-DOSA はログインなしで使うため、anon ロールに操作を許可する。
-- anon キーはブラウザに公開されるので、このテーブルは URL を知っている人なら誰でも読み書きできる。
-- 手で追加した記録だけ削除でき、センサーの記録は誤検知フラグで除外する。
alter table public.poop_events enable row level security;

create policy "誰でも閲覧できる"
on public.poop_events for select
to anon
using (true);

create policy "誰でも登録できる"
on public.poop_events for insert
to anon
with check (is_false_alarm = false);

create policy "誰でも更新できる"
on public.poop_events for update
to anon
using (true)
with check (true);

create policy "手で追加した記録は削除できる"
on public.poop_events for delete
to anon
using (source = 'manual');

-- 新しい警報を画面にすぐ出すため、Realtime の配信対象にする
alter publication supabase_realtime add table public.poop_events;
