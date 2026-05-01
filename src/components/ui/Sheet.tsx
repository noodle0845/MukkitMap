"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480
}: SheetProps) {
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
      <div
        className="overlay"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />
      <aside
        className="sheet scroll-pretty"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
      >
        <header className="sheet-header">
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

        <div className="sheet-body">{children}</div>

        {footer ? <div className="sheet-footer">{footer}</div> : null}
      </aside>
    </>
  );
}
