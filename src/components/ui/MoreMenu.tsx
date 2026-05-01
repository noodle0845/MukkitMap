"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

type MoreMenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
};

type MoreMenuProps = {
  items: MoreMenuItem[];
  label?: string;
};

export function MoreMenu({ items, label = "더보기" }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="icon-button h-8 w-8"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        <MoreHorizontal size={16} />
      </button>

      {open ? (
        <div className="menu" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              className={`menu-item ${item.danger ? "menu-item-danger" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
              type="button"
              role="menuitem"
            >
              {item.icon ? <span className="opacity-70">{item.icon}</span> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
