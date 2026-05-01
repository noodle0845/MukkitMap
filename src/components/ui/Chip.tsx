"use client";

import { ReactNode } from "react";

type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  dotColor?: string;
  className?: string;
};

export function Chip({ active, onClick, children, dotColor, className = "" }: ChipProps) {
  return (
    <button
      className={`chip ${active ? "chip-active" : ""} ${className}`}
      onClick={onClick}
      type="button"
      aria-pressed={active}
    >
      {dotColor ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
