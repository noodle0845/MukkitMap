"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Home, Monitor, Share2, Smartphone } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallTarget = "android" | "ios" | "desktop" | "unknown";

type RuntimeInfo = {
  isAndroid: boolean;
  isIos: boolean;
  isIosSafari: boolean;
  isMobile: boolean;
  isStandalone: boolean;
};

const DEFAULT_RUNTIME: RuntimeInfo = {
  isAndroid: false,
  isIos: false,
  isIosSafari: false,
  isMobile: false,
  isStandalone: false
};

function getRuntimeInfo(): RuntimeInfo {
  if (typeof window === "undefined") return DEFAULT_RUNTIME;

  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const isIpadOs = platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  const isIos = /iPad|iPhone|iPod/i.test(ua) || isIpadOs;
  const isAndroid = /Android/i.test(ua);
  const isIosSafari =
    isIos &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|KAKAOTALK|NAVER|DaumApps/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return {
    isAndroid,
    isIos,
    isIosSafari,
    isMobile: isAndroid || isIos,
    isStandalone
  };
}

function getInstallTarget(runtime: RuntimeInfo): InstallTarget {
  if (runtime.isAndroid) return "android";
  if (runtime.isIos) return "ios";
  if (!runtime.isMobile) return "desktop";
  return "unknown";
}

function Step({
  number,
  children
}: {
  number: number;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[13px] font-black text-emerald-700">
        {number}
      </span>
      <span className="pt-1 text-sm font-semibold leading-6 text-slate-700">{children}</span>
    </li>
  );
}

export function PwaInstallPrompt({ className = "" }: { className?: string }) {
  const [runtime, setRuntime] = useState<RuntimeInfo>(DEFAULT_RUNTIME);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const syncRuntime = () => setRuntime(getRuntimeInfo());
    syncRuntime();

    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener?.("change", syncRuntime);
    return () => media.removeEventListener?.("change", syncRuntime);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("[먹킷맵] PWA 서비스워커 등록 실패:", error);
      });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });
    return () => window.removeEventListener("load", registerServiceWorker);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setGuideOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const target = useMemo(() => getInstallTarget(runtime), [runtime]);
  const isAlreadyInstalled = runtime.isStandalone || installed;

  const buttonLabel = useMemo(() => {
    if (isAlreadyInstalled) return "설치됨";
    if (target === "ios") return "홈화면에 추가하기";
    return "앱처럼 설치하기";
  }, [isAlreadyInstalled, target]);

  const openInstallFlow = useCallback(async () => {
    if (isAlreadyInstalled) return;

    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === "accepted") {
          setInstalled(true);
          return;
        }
      } catch (error) {
        console.warn("[먹킷맵] PWA 설치 프롬프트 실패:", error);
      } finally {
        setInstalling(false);
      }

      setGuideOpen(true);
      return;
    }

    setGuideOpen(true);
  }, [deferredPrompt, isAlreadyInstalled]);

  const modalTitle =
    target === "ios"
      ? "iPhone 홈화면에 추가하기"
      : target === "android"
        ? "Android 홈화면에 추가하기"
        : "모바일에서 앱처럼 사용하기";

  return (
    <>
      <button
        aria-label="먹킷맵을 홈화면에 앱처럼 추가하기"
        className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-6 text-[15px] font-bold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:border-slate-200 lg:h-[56px] lg:w-auto ${className}`}
        disabled={isAlreadyInstalled || installing}
        onClick={openInstallFlow}
        type="button"
      >
        {isAlreadyInstalled ? <CheckCircle2 size={16} /> : <Smartphone size={16} />}
        {installing ? "준비 중..." : buttonLabel}
      </button>

      <BottomSheet open={guideOpen} onClose={() => setGuideOpen(false)} maxWidth={500}>
        <div className="space-y-5 px-1 pb-1">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              {target === "desktop" ? <Monitor size={23} /> : <Home size={23} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-[22px] font-black tracking-normal text-slate-950">
                {modalTitle}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                먹킷맵을 자주 쓴다면 홈화면에 추가해서 앱처럼 바로 열어보세요.
              </p>
            </div>
          </div>

          {target === "ios" && (
            <>
              {!runtime.isIosSafari && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                  iPhone에서는 Safari에서 접속했을 때 홈 화면 추가가 가장 안정적으로 동작해요.
                </div>
              )}
              <ol className="space-y-2">
                <Step number={1}>Safari에서 먹킷맵 주소를 열어주세요.</Step>
                <Step number={2}>
                  하단 공유 버튼 <Share2 className="inline-block" size={15} /> 을 눌러주세요.
                </Step>
                <Step number={3}>목록에서 "홈 화면에 추가"를 선택하면 완료됩니다.</Step>
              </ol>
            </>
          )}

          {target === "android" && (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">
                설치 버튼을 누르면 홈화면에 먹킷맵 아이콘이 추가돼요.
              </div>
              <ol className="space-y-2">
                <Step number={1}>Chrome에서 먹킷맵을 열어주세요.</Step>
                <Step number={2}>상단 메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 선택해주세요.</Step>
                <Step number={3}>추가된 아이콘으로 먹킷맵을 바로 열 수 있어요.</Step>
              </ol>
            </>
          )}

          {target === "desktop" && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold leading-6 text-slate-600">
              모바일에서 접속하면 먹킷맵을 홈화면에 앱처럼 추가할 수 있어요.
            </div>
          )}

          <button className="btn-primary w-full justify-center" onClick={() => setGuideOpen(false)} type="button">
            확인
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
