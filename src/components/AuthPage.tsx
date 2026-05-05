"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Mail, Lock, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { GhostlyLogo } from "@/components/GhostlyLogo";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error)
    return String((error as { message: unknown }).message);
  return "잠시 후 다시 시도해주세요.";
}

/** 카카오톡·인스타그램 등 인앱 브라우저 감지 */
function detectInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /KAKAOTALK|KAKAO|Line\/|Instagram|FBAN|FBAV|Twitter|Snapchat|WeChat|MicroMessenger|NaverApp/i.test(ua);
}

/** Android Chrome으로 열기 intent URL */
function getChromeIntentUrl(currentUrl: string) {
  // Android: intent scheme으로 Chrome 강제 실행
  const encoded = encodeURIComponent(currentUrl);
  return `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
}

function InAppBrowserWarning({ currentUrl }: { currentUrl: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(currentUrl).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = currentUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 pb-16">
      <div className="mb-8 flex flex-col items-center gap-3">
        <GhostlyLogo className="w-[140px]" />
      </div>

      <div className="card w-full max-w-sm p-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl">
          🌐
        </div>
        <h1 className="title">외부 브라우저에서 열어주세요</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          카카오톡 안에서는 Google 로그인이 지원되지 않아요.
          <br />
          Chrome 또는 Safari에서 접속해주세요.
        </p>

        {/* Android: Chrome으로 직접 열기 시도 */}
        <a
          href={getChromeIntentUrl(currentUrl)}
          className="btn-primary mt-5 w-full justify-center"
        >
          <ExternalLink size={16} />
          Chrome으로 열기
        </a>

        {/* iOS / 공통: URL 복사 */}
        <button
          className="btn-ghost mt-2 w-full justify-center"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "✅ 복사됨" : "🔗 주소 복사하기"}
        </button>

        <p className="mt-4 text-[12px] text-slate-400">
          복사 후 Safari나 Chrome 주소창에 붙여넣으세요.
        </p>
      </div>
    </main>
  );
}

export function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/";

  const [isInApp, setIsInApp] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsInApp(detectInAppBrowser());
    setCurrentUrl(window.location.href);
  }, []);

  // 인앱 브라우저면 경고 화면 표시
  if (isInApp) {
    return <InAppBrowserWarning currentUrl={currentUrl} />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const supabase = getSupabaseClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(returnTo);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${returnTo}` }
        });
        if (error) throw error;
        setMessage("가입 확인 이메일을 보냈어요. 이메일을 확인해주세요.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${returnTo}` }
    });
    if (error) setError(getErrorMessage(error));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 pb-16">
      {/* 로고 */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <GhostlyLogo className="w-[140px]" />
        <p className="text-[13px] font-semibold text-slate-500">
          친구 추천 맛집만 모아보는 공유 지도
        </p>
      </div>

      <div className="card w-full max-w-sm p-7">
        <h1 className="title text-center">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>

        {/* Google 로그인 */}
        <button
          className="btn-ghost mt-5 w-full justify-center"
          onClick={handleGoogle}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 계속하기
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 border-t border-[var(--border-soft)]" />
          <span className="text-[12px] font-semibold text-slate-400">또는</span>
          <div className="flex-1 border-t border-[var(--border-soft)]" />
        </div>

        {/* 이메일 폼 */}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="field-label">이메일</span>
            <div className="relative mt-1">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="field pl-9"
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="field-label">비밀번호</span>
            <div className="relative mt-1">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="field pl-9"
                type="password"
                placeholder="8자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-600">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">
              {message}
            </p>
          )}

          <button
            className="btn-primary mt-2 w-full justify-center"
            type="submit"
            disabled={loading}
          >
            {mode === "login" ? (
              <>
                <LogIn size={16} />
                {loading ? "로그인 중…" : "로그인"}
              </>
            ) : (
              <>
                <UserPlus size={16} />
                {loading ? "가입 중…" : "회원가입"}
              </>
            )}
          </button>
        </form>

        {/* 모드 전환 */}
        <p className="mt-5 text-center text-[13px] font-semibold text-slate-500">
          {mode === "login" ? (
            <>
              아직 계정이 없나요?{" "}
              <button
                className="font-bold text-emerald-600 hover:underline"
                onClick={() => { setMode("signup"); setError(""); setMessage(""); }}
                type="button"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있나요?{" "}
              <button
                className="font-bold text-emerald-600 hover:underline"
                onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                type="button"
              >
                로그인
              </button>
            </>
          )}
        </p>
      </div>

      {/* 홈으로 */}
      <button
        className="btn-ghost mt-5"
        onClick={() => router.push("/")}
        type="button"
      >
        <ArrowLeft size={15} />
        처음으로 돌아가기
      </button>
    </main>
  );
}
