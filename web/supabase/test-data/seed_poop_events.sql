-- U-DOSA のテストデータ(直近 90 日分)
-- Supabase Dashboard の SQL Editor で実行する。実行するたびにランダムな別のデータになる。
-- 前回のテストデータは消してから作り直すので、何度実行してもよい。
-- テストデータはメモが「[テスト]」で始まる。本物の記録は消さない。
-- テストデータだけを消すときは delete_test_poop_events.sql を実行する。
--
-- 想定(1 歳 3 か月):
--   - 朝・昼・夕方・夜の 4 つの時間帯に、それぞれの確率でうんちが出る(1 日平均 2 回くらい)
--   - 平日の 9〜16 時台は保育園なので「手で追加」、週末の昼は半分くらいお出かけ中で「手で追加」
--   - それ以外は警報器が検知。ときどき誤検知(おしりふき、手の消毒など)も混ぜる
--   - 12 分前に、においがまだ続いている警報を 1 件(ホームの「新しい警報」の確認用)

begin;

delete from public.poop_events where note like '[テスト]%';

-- 1. ふだんのうんち
with slots as (
  select d::date as day, s.center_min, s.prob
  from generate_series(
         (now() at time zone 'Asia/Tokyo')::date - 89,
         (now() at time zone 'Asia/Tokyo')::date,
         interval '1 day'
       ) as d
  -- 時間帯の中心(0 時からの分)と、その時間帯に出る確率
  cross join (values (450, 0.80), (750, 0.45), (960, 0.30), (1170, 0.55))
    as s(center_min, prob)
),
events as (
  select
    -- 中心の前後 1 時間でばらつかせ、日本時間として timestamptz にする
    (day + make_interval(mins => center_min + floor(random() * 120 - 60)::int))
      at time zone 'Asia/Tokyo' as occurred_at,
    extract(isodow from day) as dow
  from slots
  where random() < prob
),
classified as (
  select
    occurred_at,
    case
      when dow <= 5
        and extract(hour from occurred_at at time zone 'Asia/Tokyo') between 9 and 16
        then 'manual'
      when dow >= 6
        and extract(hour from occurred_at at time zone 'Asia/Tokyo') between 10 and 16
        and random() < 0.5
        then 'manual'
      else 'sensor'
    end as source
  from events
  where occurred_at <= now() - interval '1 hour'
)
insert into public.poop_events
  (occurred_at, source, duration_sec, peak_tvoc, peak_h2, peak_eth, note)
select
  occurred_at,
  source,
  case when source = 'sensor' then 120 + floor(random() * 780)::int end,
  case when source = 'sensor' then 80 + floor(random() * 320)::int end,
  case when source = 'sensor' then 40 + floor(random() * 160)::int end,
  case when source = 'sensor' then 60 + floor(random() * 190)::int end,
  case
    when source = 'sensor' then '[テスト]'
    else '[テスト] ' || (array[
      '保育園で',
      '保育園で。少しゆるめ',
      '公園で',
      '買い物中に',
      'おばあちゃんの家で',
      '車の中で'
    ])[1 + floor(random() * 6)::int]
  end
from classified;

-- 2. 誤検知(においが短く、H2 の上がり方が小さい)
insert into public.poop_events
  (occurred_at, source, duration_sec, peak_tvoc, peak_h2, peak_eth, note, is_false_alarm)
select
  now() - interval '2 hours' - random() * interval '88 days',
  'sensor',
  30 + floor(random() * 90)::int,
  70 + floor(random() * 60)::int,
  30 + floor(random() * 30)::int,
  80 + floor(random() * 150)::int,
  '[テスト] ' || (array[
    'おしりふき',
    '手の消毒',
    '料理のにおい',
    'おならだけ'
  ])[1 + floor(random() * 4)::int],
  true
from generate_series(1, 14);

-- 3. 12 分前の警報(においがまだ続いているので duration_sec は空)
insert into public.poop_events
  (occurred_at, source, peak_tvoc, peak_h2, peak_eth, note)
values
  (now() - interval '12 minutes', 'sensor', 160, 85, 140, '[テスト] 最新の警報');

commit;

-- 作ったデータの件数
select
  source,
  is_false_alarm,
  count(*) as 件数,
  min(occurred_at at time zone 'Asia/Tokyo') as 最初,
  max(occurred_at at time zone 'Asia/Tokyo') as 最後
from public.poop_events
where note like '[テスト]%'
group by source, is_false_alarm
order by source, is_false_alarm;
