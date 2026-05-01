"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden />
      <div className="modal-center" onClick={onClose} role="presentation">
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] px-6 py-5">
            <div className="min-w-0">
              <h2 className="title truncate">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              ) : null}
            </div>
            <button
              className="icon-button shrink-0"
              onClick={onClose}
              type="button"
              title="닫기"
              aria-label="닫기"
            >
              <X size={17} />
            </button>
          </header>

          <div className="px-6 py-5">{children}</div>

          {footer ? (
            <div className="border-t border-[var(--border-soft)] bg-slate-50/60 px-6 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
