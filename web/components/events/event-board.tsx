"use client";

import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

import { ConstipationAlert } from "@/components/constipation-alert";
import { AddEventDialog } from "@/components/events/add-event-dialog";
import { EventList } from "@/components/events/event-list";
import { LatestCard } from "@/components/events/latest-card";
import { formatDateTime } from "@/lib/format";
import { useEvents, useNow } from "@/lib/use-events";

const MESSAGE_MS = 5000;

// ホーム画面。最後のうんち → 追加ボタン → 直近の記録、の順に並べる。
export function EventBoard() {
  const { events, loading, error, upsert, remove } = useEvents();
  const now = useNow();
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const showMessage = (text: string, isError = false) =>
    setMessage({ text, isError });

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
        <LoaderCircle
          className="size-5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        記録を読み込んでいます
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <LatestCard events={events} now={now} />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <AddEventDialog
            onCreated={(event) => {
              upsert(event);
              showMessage(
                `${formatDateTime(event.occurred_at)} の記録を追加しました`,
              );
            }}
          />
          {!error && <ConstipationAlert events={events} now={now} />}
        </div>
        <p
          role="status"
          className={`flex min-h-6 items-center gap-1 text-sm font-semibold ${
            message?.isError ? "text-red-600" : "text-green-600"
          }`}
        >
          {message && !message.isError && (
            <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
          )}
          {message?.text}
        </p>
      </div>
      <section aria-labelledby="recent-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="recent-heading"
            className="text-2xl leading-snug font-semibold text-gray-900"
          >
            直近の記録
          </h2>
          <p className="text-xs text-gray-600">
            警報器の記録は「誤検知」で除外できます
          </p>
        </div>
        <EventList
          events={events}
          onUpdated={upsert}
          onDeleted={remove}
          onMessage={showMessage}
        />
      </section>
    </div>
  );
}
