import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

/** 브라우저 싱글톤 클라이언트 (auth 세션 자동 관리) */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL?.startsWith("https://") &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes("your_") &&
      !SUPABASE_ANON_KEY.includes("your_")
  );
}
