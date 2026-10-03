// ダッシュボードの集計。誤検知は回数・間隔の計算から除き、誤検知の件数としてだけ数える。
// 期間は「今日を含む直近 N 日」(日本時間の 0 時区切り)。1 日は今日の 0 時から今まで。

import { subDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import { TIME_ZONE } from "@/lib/constants";
import type { PoopEvent } from "@/lib/events";
import { formatDateTime, toDateKey, toHour } from "@/lib/format";

export const RANGE_OPTIONS = [1, 7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

export type DailyPoint = {
  key: string;
  label: string;
  sensor: number;
  manual: number;
  total: number;
};

export type HourlyPoint = { hour: number; label: string; count: number };

export type IntervalPoint = { key: string; label: string; hours: number };

export type Stats = {
  days: RangeDays;
  total: number;
  perDay: number;
  avgIntervalHours: number | null;
  sensorCount: number;
  manualCount: number;
  falseAlarmCount: number;
  // 警報器が鳴った回数のうち誤検知だった割合(鳴っていなければ null)
  falseAlarmRate: number | null;
  peakHour: number | null;
  daily: DailyPoint[];
  hourly: HourlyPoint[];
  intervals: IntervalPoint[];
};

export function buildStats(
  events: PoopEvent[],
  days: RangeDays,
  now: Date = new Date(),
): Stats {
  const startKey = toDateKey(subDays(now, days - 1));
  const start = fromZonedTime(`${startKey}T00:00:00`, TIME_ZONE).getTime();
  const inRange = events.filter((event) => {
    const t = Date.parse(event.occurred_at);
    return t >= start && t <= now.getTime();
  });
  const valid = inRange
    .filter((event) => !event.is_false_alarm)
    .sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));

  // 日ごと(警報器 / 手で追加)
  const daily: DailyPoint[] = [];
  const dailyByKey = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = toDateKey(subDays(now, i));
    const [, month, day] = key.split("-").map(Number);
    const point = {
      key,
      label: `${month}/${day}`,
      sensor: 0,
      manual: 0,
      total: 0,
    };
    daily.push(point);
    dailyByKey.set(key, point);
  }
  for (const event of valid) {
    const point = dailyByKey.get(toDateKey(event.occurred_at));
    if (!point) continue;
    point[event.source] += 1;
    point.total += 1;
  }

  // 時間帯ごと
  const hourly: HourlyPoint[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour}時`,
    count: 0,
  }));
  for (const event of valid) hourly[toHour(event.occurred_at)].count += 1;
  const maxHourCount = Math.max(...hourly.map((point) => point.count));

  // うんちの間隔(前回からの時間)
  const intervals: IntervalPoint[] = [];
  for (let i = 1; i < valid.length; i++) {
    const hours =
      (Date.parse(valid[i].occurred_at) -
        Date.parse(valid[i - 1].occurred_at)) /
      3_600_000;
    intervals.push({
      key: valid[i].id,
      label: formatDateTime(valid[i].occurred_at),
      hours: Math.round(hours * 10) / 10,
    });
  }

  const sensorAlarms = inRange.filter((event) => event.source === "sensor");
  const falseAlarmCount = sensorAlarms.filter((e) => e.is_false_alarm).length;

  return {
    days,
    total: valid.length,
    perDay: valid.length / days,
    avgIntervalHours:
      intervals.length > 0
        ? intervals.reduce((sum, point) => sum + point.hours, 0) /
          intervals.length
        : null,
    sensorCount: valid.filter((event) => event.source === "sensor").length,
    manualCount: valid.filter((event) => event.source === "manual").length,
    falseAlarmCount,
    falseAlarmRate:
      sensorAlarms.length > 0 ? falseAlarmCount / sensorAlarms.length : null,
    peakHour:
      maxHourCount > 0
        ? hourly.find((point) => point.count === maxHourCount)!.hour
        : null,
    daily,
    hourly,
    intervals,
  };
}
