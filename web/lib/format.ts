// 日時の表示用フォーマット。日時はすべて日本時間(TIME_ZONE)で表示する。

import { ja } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { TIME_ZONE } from "@/lib/constants";

// 例: 10月4日(土) 14:05
export function formatDateTime(iso: string): string {
  return formatInTimeZone(iso, TIME_ZONE, "M月d日(E) HH:mm", { locale: ja });
}

// 例: 14:05
export function formatTime(iso: string): string {
  return formatInTimeZone(iso, TIME_ZONE, "HH:mm");
}

// 日ごとにまとめるためのキー、および <input type="date"> の値(例: 2026-10-04)
export function toDateKey(value: string | Date): string {
  return formatInTimeZone(value, TIME_ZONE, "yyyy-MM-dd");
}

// <input type="time"> の値(例: 14:05)
export function toTimeValue(value: string | Date): string {
  return formatInTimeZone(value, TIME_ZONE, "HH:mm");
}

// 日本時間の「時」(0〜23)
export function toHour(iso: string): number {
  return Number(formatInTimeZone(iso, TIME_ZONE, "H"));
}

// 経過時間。例: たった今 / 12分前 / 3時間5分前 / 2日前
export function formatElapsed(fromIso: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(fromIso)) / 60_000),
  );
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}時間${rest}分前` : `${hours}時間前`;
  }
  return `${Math.floor(hours / 24)}日前`;
}

// 時間の長さ(時間単位の数値)。例: 3.5 → 3時間30分
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}分`;
  return m ? `${h}時間${m}分` : `${h}時間`;
}

// 秒数。例: 95 → 1分35秒
export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}秒`;
  return s ? `${m}分${s}秒` : `${m}分`;
}

// 日ごとのキー(yyyy-MM-dd)を見出しにする。例: 10月4日(土)
export function formatDateKey(dateKey: string): string {
  return formatInTimeZone(`${dateKey}T12:00:00+09:00`, TIME_ZONE, "M月d日(E)", {
    locale: ja,
  });
}
