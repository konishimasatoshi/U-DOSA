"use client";

import { useCallback, useEffect, useState } from "react";

import { sortByNewest, type PoopEvent } from "@/lib/events";
import { listEvents, subscribeEvents } from "@/lib/events-api";

// 記録の一覧を読み込み、Supabase Realtime で他の端末や警報器の変更を受け取って取り直す。
// 自分の操作の結果は upsert / remove でその場に反映する。
export function useEvents() {
  const [events, setEvents] = useState<PoopEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setEvents(await listEvents());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "記録の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初回の読み込みと購読の開始(外部システムとの同期)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    return subscribeEvents(() => void reload());
  }, [reload]);

  const upsert = useCallback((event: PoopEvent) => {
    setEvents((current) =>
      sortByNewest([...current.filter((e) => e.id !== event.id), event]),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setEvents((current) => current.filter((e) => e.id !== id));
  }, []);

  return { events, loading, error, reload, upsert, remove };
}

// 「◯分前」の表示を更新するため、30 秒ごとに現在時刻を進める
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
