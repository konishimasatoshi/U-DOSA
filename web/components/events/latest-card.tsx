import { BellRing } from "lucide-react";

import { SOURCE_LABELS, validEvents, type PoopEvent } from "@/lib/events";
import { formatDateTime, formatElapsed, toDateKey } from "@/lib/format";

// この時間内の警報器の記録は「新しい警報」として目立たせる
const FRESH_ALARM_MINUTES = 30;

// ホームの先頭。最後のうんちからの経過時間を大きく出し、今日の回数を添える。
export function LatestCard({
  events,
  now,
}: {
  events: PoopEvent[];
  now: Date;
}) {
  const valid = validEvents(events);
  const latest = valid[0];
  const todayKey = toDateKey(now);
  const todayCount = valid.filter(
    (event) => toDateKey(event.occurred_at) === todayKey,
  ).length;
  const isFreshAlarm =
    latest?.source === "sensor" &&
    now.getTime() - Date.parse(latest.occurred_at) <
      FRESH_ALARM_MINUTES * 60_000;

  return (
    <section
      aria-labelledby="latest-heading"
      className="rounded-2xl bg-blue-700 p-6 text-white shadow-md sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 space-y-2">
          <h2 id="latest-heading" className="text-sm font-semibold">
            最後のうんち
          </h2>
          {latest ? (
            <>
              <p className="text-4xl leading-tight font-bold tabular-nums sm:text-5xl">
                {formatElapsed(latest.occurred_at, now)}
              </p>
              <p className="text-sm leading-relaxed">
                {formatDateTime(latest.occurred_at)}・
                {SOURCE_LABELS[latest.source]}
              </p>
            </>
          ) : (
            <p className="text-base leading-relaxed">
              まだ記録がありません。警報器が検知するか、外出中の記録を追加すると、ここに表示されます。
            </p>
          )}
        </div>
        <div className="rounded-xl border border-white/40 px-5 py-3 text-right">
          <p className="text-sm font-semibold">今日</p>
          <p className="text-3xl leading-tight font-bold tabular-nums">
            {todayCount}
            <span className="ml-1 text-base font-semibold">回</span>
          </p>
        </div>
      </div>
      {isFreshAlarm && (
        <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm">
          <BellRing className="size-4" aria-hidden="true" />
          新しい警報です。おむつを確認してください
        </p>
      )}
    </section>
  );
}
