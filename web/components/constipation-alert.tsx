"use client";

import { TriangleAlert } from "lucide-react";

import { isConstipated, type PoopEvent } from "@/lib/events";
import { useSettings } from "@/lib/settings";

// 便秘警報のラベル。設定の時間(u_dosa_settings)うんちの記録がなければ表示する。
// 記録が読み込めていないときは誤って出さないよう、呼び出し側で表示しない。
export function ConstipationAlert({
  events,
  now,
}: {
  events: PoopEvent[];
  now: Date;
}) {
  const settings = useSettings();
  const hours = settings?.constipationAlertHours;
  if (hours == null || !isConstipated(events, hours, now)) return null;

  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 rounded-lg border border-red-700 bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      便秘警報！過去{hours}時間で便通がありません
    </p>
  );
}
