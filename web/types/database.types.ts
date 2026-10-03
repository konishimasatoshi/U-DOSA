// Supabase のテーブルの型。supabase/migrations の SQL と一致させる。
// kakeiboo と同じプロジェクトのため `supabase gen types` だと expenses も含まれるので、必要な分だけ手で書いている。

export type PoopEventRow = {
  id: string;
  occurred_at: string;
  source: "sensor" | "manual";
  duration_sec: number | null;
  peak_tvoc: number | null;
  peak_h2: number | null;
  peak_eth: number | null;
  note: string | null;
  is_false_alarm: boolean;
  created_at: string;
};

export type SettingsRow = {
  id: boolean;
  constipation_alert_hours: number;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      u_dosa_settings: {
        Row: SettingsRow;
        Insert: Partial<SettingsRow>;
        Update: Partial<SettingsRow>;
        Relationships: [];
      };
      poop_events: {
        Row: PoopEventRow;
        Insert: Partial<Omit<PoopEventRow, "source">> &
          Pick<PoopEventRow, "source">;
        Update: Partial<PoopEventRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
