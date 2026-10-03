"use client";

import { useEffect, useState } from "react";

import { getSupabase } from "@/lib/supabase/client";

// 設定テーブル(u_dosa_settings)が読めないときに使う値。マイグレーションの既定値と一致させる。
export const DEFAULT_CONSTIPATION_ALERT_HOURS = 48;

export type Settings = { constipationAlertHours: number };

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await getSupabase()
    .from("u_dosa_settings")
    .select("constipation_alert_hours")
    .maybeSingle();
  if (error || !data) {
    console.error("[U-DOSA] 設定の読み込みに失敗。既定値を使います", error);
    return { constipationAlertHours: DEFAULT_CONSTIPATION_ALERT_HOURS };
  }
  return { constipationAlertHours: data.constipation_alert_hours };
}

// 設定を読み込む。読み込むまでは null。
export function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    let active = true;
    void fetchSettings().then((value) => {
      if (active) setSettings(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return settings;
}
