"use client";

// ブラウザから Supabase の poop_events を読み書きする。失敗時はメッセージ付きの Error を投げる。

import { subDays } from "date-fns";

import { MAX_RANGE_DAYS } from "@/lib/constants";
import type { PoopEvent } from "@/lib/events";
import { getSupabase } from "@/lib/supabase/client";

const TABLE = "poop_events";

function fail(action: string, error: { message: string }): never {
  console.error(`[U-DOSA] ${action}`, error);
  throw new Error(`${action}に失敗しました。通信状態を確認してください`);
}

// 直近 MAX_RANGE_DAYS 日分の記録(誤検知も含む)を新しい順に取る
export async function listEvents(now: Date = new Date()): Promise<PoopEvent[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .gte("occurred_at", subDays(now, MAX_RANGE_DAYS).toISOString())
    .order("occurred_at", { ascending: false })
    .limit(1000);
  if (error) fail("記録の読み込み", error);
  return data;
}

export async function createManualEvent(input: {
  occurredAt: string;
  note: string | null;
}): Promise<PoopEvent> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({
      source: "manual",
      occurred_at: input.occurredAt,
      note: input.note,
    })
    .select()
    .single();
  if (error) fail("記録の追加", error);
  return data;
}

export async function setFalseAlarm(
  id: string,
  isFalseAlarm: boolean,
): Promise<PoopEvent> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update({ is_false_alarm: isFalseAlarm })
    .eq("id", id)
    .select()
    .single();
  if (error) fail(isFalseAlarm ? "誤検知の登録" : "元に戻す操作", error);
  return data;
}

export async function deleteManualEvent(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("source", "manual");
  if (error) fail("記録の削除", error);
}

// 記録の追加・更新・削除をリアルタイムで受け取る。戻り値で購読を解除する。
export function subscribeEvents(onChange: () => void): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel("poop_events")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
