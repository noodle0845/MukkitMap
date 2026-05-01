"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { CheckCircle2, AlertCircle, Info, Undo2 } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  action?: {
    label: string;
    onSelect: () => void;
  };
};

type ToastInternal = ToastInput & {
  id: string;
};

type ToastContextValue = {
  show: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider 안에서만 useToast를 사용할 수 있습니다.");
  return ctx;
}

const ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-emerald-600" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-slate-500" />
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random()}`;
      const next: ToastInternal = {
        tone: "info",
        duration: 4200,
        ...toast,
        id
      };
      setToasts((current) => [...current, next]);

      const timer = window.setTimeout(() => dismiss(id), next.duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div className="toast" role="status" aria-live="polite" key={toast.id}>
            <span aria-hidden>{ICON[toast.tone ?? "info"]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-slate-900">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="truncate text-xs text-slate-500">{toast.description}</p>
              ) : null}
            </div>
            {toast.action ? (
              <button
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
                onClick={() => {
                  toast.action?.onSelect();
                  dismiss(toast.id);
                }}
                type="button"
              >
                <Undo2 size={13} />
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
