"use client";

import { useState } from "react";
import { BellRing, PencilLine, RotateCcw } from "lucide-react";
import { cn } from "cn";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SOURCE_LABELS, type PoopEvent } from "@/lib/events";
import { deleteManualEvent, setFalseAlarm } from "@/lib/events-api";
import {
  formatDateKey,
  formatDateTime,
  formatSeconds,
  formatSigned,
  formatTime,
  toDateKey,
} from "@/lib/format";

const LIST_LIMIT = 30;

type Handlers = {
  onUpdated: (event: PoopEvent) => void;
  onDeleted: (id: string) => void;
  onMessage: (message: string, isError?: boolean) => void;
};

// 直近の記録の一覧(誤検知も含む)。日ごとにまとめて新しい順に並べる。
export function EventList({
  events,
  ...handlers
}: { events: PoopEvent[] } & Handlers) {
  const recent = events.slice(0, LIST_LIMIT);
  const groups = new Map<string, PoopEvent[]>();
  for (const event of recent) {
    const key = toDateKey(event.occurred_at);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  if (recent.length === 0) {
    return (
      <p className="rounded-2xl border border-gray-300 py-12 text-center text-sm leading-relaxed text-gray-600">
        記録はまだありません。
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {[...groups].map(([key, dayEvents]) => (
        <section
          key={key}
          aria-label={formatDateKey(key)}
          className="space-y-2"
        >
          <h3 className="text-sm font-semibold text-gray-700">
            {formatDateKey(key)}
          </h3>
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-md">
            {dayEvents.map((event) => (
              <EventItem key={event.id} event={event} {...handlers} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EventItem({
  event,
  onUpdated,
  onDeleted,
  onMessage,
}: { event: PoopEvent } & Handlers) {
  const [busy, setBusy] = useState(false);
  const isSensor = event.source === "sensor";
  const Icon = isSensor ? BellRing : PencilLine;
  const details = [
    event.duration_sec != null &&
      `においが続いた時間 ${formatSeconds(event.duration_sec)}`,
    event.peak_tvoc != null && `TVOC ${event.peak_tvoc}ppb`,
    event.peak_h2 != null && `H2 ${formatSigned(event.peak_h2)}`,
    event.peak_eth != null && `Eth ${formatSigned(event.peak_eth)}`,
  ].filter(Boolean);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "操作に失敗しました",
        true,
      );
    } finally {
      setBusy(false);
    }
  }

  const when = formatDateTime(event.occurred_at);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5",
        event.is_false_alarm && "bg-gray-50",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border",
          event.is_false_alarm
            ? "border-gray-300 text-gray-500"
            : isSensor
              ? "border-blue-200 bg-blue-500 text-white"
              : "border-orange-200 bg-orange-600 text-white",
        )}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              event.is_false_alarm
                ? "text-gray-500 line-through"
                : "text-gray-900",
            )}
          >
            {formatTime(event.occurred_at)}
          </span>
          <span className="rounded-md border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700">
            {SOURCE_LABELS[event.source]}
          </span>
          {event.is_false_alarm && (
            <span className="rounded-md border border-gray-400 bg-gray-600 px-2 py-0.5 text-xs font-medium text-white">
              誤検知
            </span>
          )}
        </p>
        {details.length > 0 && (
          <p className="text-xs leading-normal text-gray-600 tabular-nums">
            {details.join("・")}
          </p>
        )}
        {event.note && (
          <p className="text-sm leading-relaxed break-words text-gray-700">
            {event.note}
          </p>
        )}
      </div>
      <div className="shrink-0">
        {event.is_false_alarm ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                onUpdated(await setFalseAlarm(event.id, false));
                onMessage(`${when} の記録を元に戻しました`);
              })
            }
          >
            <RotateCcw aria-hidden="true" />
            元に戻す
          </Button>
        ) : (
          <ConfirmButton
            busy={busy}
            label={isSensor ? "誤検知" : "削除"}
            title={
              isSensor ? "誤検知として除外しますか?" : "この記録を削除しますか?"
            }
            description={
              isSensor
                ? `${when} の警報を誤検知にします。回数やグラフから除外されます。あとで元に戻せます。`
                : `${when} の記録を削除します。元に戻せません。`
            }
            confirmLabel={isSensor ? "誤検知にする" : "削除する"}
            onConfirm={() =>
              run(async () => {
                if (isSensor) {
                  onUpdated(await setFalseAlarm(event.id, true));
                  onMessage(`${when} の警報を誤検知にしました`);
                } else {
                  await deleteManualEvent(event.id);
                  onDeleted(event.id);
                  onMessage(`${when} の記録を削除しました`);
                }
              })
            }
          />
        )}
      </div>
    </li>
  );
}

function ConfirmButton({
  busy,
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  busy: boolean;
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
