"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// ブラウザ用の Supabase クライアント。U-DOSA はログインなしなので anon キーだけで使う。
let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  client ??= createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return client;
}
