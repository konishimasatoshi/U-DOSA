-- U-DOSA の設定テーブル(1 行だけ)
-- 値を変えるときは Supabase Dashboard の Table Editor で u_dosa_settings の行を編集するか、
-- SQL Editor で次のように実行する:
--   update public.u_dosa_settings set constipation_alert_hours = 72;
create table public.u_dosa_settings (
  -- 行が 1 つしか作れないようにするための主キー(常に true)
  id boolean primary key default true check (id),
  constipation_alert_hours integer not null default 48
    check (constipation_alert_hours between 1 and 720),
  updated_at timestamptz not null default now()
);

comment on table public.u_dosa_settings is 'U-DOSA の設定(1 行だけ)';
comment on column public.u_dosa_settings.constipation_alert_hours is
  '便秘警報: この時間(1〜720)うんちの記録がなければダッシュボードに警報を出す';

insert into public.u_dosa_settings (id) values (true);

-- updated_at を自動更新する(kakeiboo の set_updated_at() を使い回す)
create trigger u_dosa_settings_set_updated_at
before update on public.u_dosa_settings
for each row
execute function public.set_updated_at();

-- RLS: アプリ(anon)からは読むだけ。変更は Supabase Dashboard から行う。
alter table public.u_dosa_settings enable row level security;

create policy "誰でも閲覧できる"
on public.u_dosa_settings for select
to anon
using (true);
