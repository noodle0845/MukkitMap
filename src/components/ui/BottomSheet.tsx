"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  dark?: boolean;
  maxWidth?: number;
};

const DISMISS_THRESHOLD = 80;

export function BottomSheet({
  open,
  onClose,
  children,
  dark,
  maxWidth = 520
}: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setDragOffset(0);
      setDragging(false);
      dragStartY.current = null;
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = event.clientY;
    setDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const dy = Math.max(0, event.clientY - dragStartY.current);
    setDragOffset(dy);
  }

  function onPointerUp() {
    if (dragStartY.current === null) return;
    if (dragOffset > DISMISS_THRESHOLD) {
      onClose();
    } else {
      setDragOffset(0);
    }
    setDragging(false);
    dragStartY.current = null;
  }

  return createPortal(
    <>
      <div className="overlay" onClick={onClose} aria-hidden />
      {/* 가운데 정렬은 flex 래퍼가 담당. 시트 자체는 transform을 Y축에만 사용해
          mk-slide-up 키프레임의 translateY와 충돌하지 않게 한다. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 950,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          pointerEvents: "none"
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="scroll-pretty"
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth,
            background: dark ? "#1f2937" : "#ffffff",
            color: dark ? "#f8fafc" : undefined,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            boxShadow: "0 -24px 48px rgba(0,0,0,0.32)",
            maxHeight: "92vh",
            overflowY: "auto",
            overscrollBehavior: "contain",
            transform: `translateY(${dragOffset}px)`,
            transition: dragging ? "none" : "transform 220ms cubic-bezier(0.2,0.8,0.2,1)",
            animation: dragging
              ? undefined
              : "mk-slide-up 240ms cubic-bezier(0.2,0.8,0.2,1) both",
            touchAction: "pan-y"
          }}
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => {
              // 핸들 단순 클릭 → 닫기 (드래그 아니었을 때만)
              if (dragOffset === 0 && dragStartY.current === null) onClose();
            }}
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "10px 0 6px",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none"
            }}
            aria-label="닫기 핸들"
            role="button"
          >
            <span
              style={{
                display: "block",
                width: 44,
                height: 4,
                borderRadius: 999,
                background: dark ? "rgba(248,250,252,0.4)" : "rgba(15,23,42,0.22)"
              }}
            />
          </div>
          <div style={{ padding: "4px 18px 22px" }}>{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
}
