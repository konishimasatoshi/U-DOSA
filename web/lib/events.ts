// うんちの記録の型と、手で追加するときの入力値の検証。

import { fromZonedTime } from "date-fns-tz";

import { NOTE_MAX_LENGTH, TIME_ZONE } from "@/lib/constants";
import type { PoopEventRow } from "@/types/database.types";

export type PoopEvent = PoopEventRow;
export type EventSource = PoopEvent["source"];

export const SOURCE_LABELS: Record<EventSource, string> = {
  sensor: "警報器",
  manual: "手で追加",
};

// 新しい順に並べる
export function sortByNewest(events: PoopEvent[]): PoopEvent[] {
  return [...events].sort(
    (a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at),
  );
}

// 誤検知を除いた、実際のうんちの記録
export function validEvents(events: PoopEvent[]): PoopEvent[] {
  return events.filter((event) => !event.is_false_alarm);
}

// 便秘警報: 直近 hours 時間に(誤検知を除く)うんちの記録がなければ true
export function isConstipated(
  events: PoopEvent[],
  hours: number,
  now: Date,
): boolean {
  const since = now.getTime() - hours * 3_600_000;
  return !validEvents(events).some(
    (event) => Date.parse(event.occurred_at) >= since,
  );
}

export type ManualInput = { date: string; time: string; note: string };

// フォームの値(日本時間の日付と時刻)を検証し、ISO 文字列に変換する。
// 問題があればエラーメッセージを返す。
export function parseManualInput(
  input: ManualInput,
  now: Date = new Date(),
): { occurredAt: string; note: string | null } | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: "日付を選んでください" };
  }
  if (!/^\d{2}:\d{2}$/.test(input.time)) {
    return { error: "時刻を選んでください" };
  }
  const occurred = fromZonedTime(`${input.date}T${input.time}:00`, TIME_ZONE);
  if (Number.isNaN(occurred.getTime())) {
    return { error: "日付と時刻を確認してください" };
  }
  if (occurred.getTime() > now.getTime() + 60_000) {
    return { error: "未来の日時は記録できません" };
  }
  const note = input.note.trim();
  if (note.length > NOTE_MAX_LENGTH) {
    return { error: `メモは${NOTE_MAX_LENGTH}文字以内にしてください` };
  }
  return { occurredAt: occurred.toISOString(), note: note || null };
}
