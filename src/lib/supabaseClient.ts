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
  const result = Boolean(
    SUPABASE_URL?.startsWith("https://") &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes("your_") &&
      !SUPABASE_ANON_KEY.includes("your_")
  );
  // 디버그용 (확인 후 삭제 예정)
  if (typeof window !== "undefined") {
    console.log("[먹킷맵] Supabase 설정 확인:", {
      configured: result,
      url: SUPABASE_URL || "(비어있음)",
      keyPrefix: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 20) + "…" : "(비어있음)"
    });
  }
  return result;
}
