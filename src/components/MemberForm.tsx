"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Palette, Plus } from "lucide-react";
import type { MemberCreateInput, MemberRole } from "@/lib/types";
import { isHexColor } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/BottomSheet";

type MemberFormProps = {
  onSubmit: (input: MemberCreateInput) => void;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type Hsv = {
  h: number;
  s: number;
  v: number;
};

const PRESET_COLORS = [
  "#ef4444",
  "#fb7185",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#0f172a",
  "#64748b",
  "#ffffff",
  "#111827"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function componentToHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());

  if (!match) {
    return null;
  }

  const value = match[1];

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === red) {
      h = ((green - blue) / delta) % 6;
    } else if (max === green) {
      h = (blue - red) / delta + 2;
    } else {
      h = (red - green) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100)
  };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) {
    red = chroma;
    green = x;
  } else if (h < 120) {
    red = x;
    green = chroma;
  } else if (h < 180) {
    green = chroma;
    blue = x;
  } else if (h < 240) {
    green = x;
    blue = chroma;
  } else if (h < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    r: (red + m) * 255,
    g: (green + m) * 255,
    b: (blue + m) * 255
  };
}

function hsvToHex(hsv: Hsv) {
  return rgbToHex(hsvToRgb(hsv));
}

function hueToHex(hue: number) {
  return hsvToHex({ h: hue, s: 100, v: 100 });
}

function cleanHexInput(value: string) {
  return value.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase();
}

export function MemberForm({ onSubmit }: MemberFormProps) {
  const [nickname, setNickname] = useState("");
  const [markerColor, setMarkerColor] = useState(PRESET_COLORS[0]);
  const [role, setRole] = useState<MemberRole>("member");
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(PRESET_COLORS[0]);
  const [hexInput, setHexInput] = useState(PRESET_COLORS[0].slice(1).toUpperCase());
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(PRESET_COLORS[0])!));
  const colorPlaneRef = useRef<HTMLDivElement | null>(null);

  const draftRgb = useMemo(
    () => hexToRgb(draftColor) ?? { r: 0, g: 0, b: 0 },
    [draftColor]
  );

  function updateDraftColor(color: string) {
    const normalized = color.startsWith("#") ? color : `#${color}`;
    const rgb = hexToRgb(normalized);

    if (!rgb) return;

    const nextColor = rgbToHex(rgb);
    setDraftColor(nextColor);
    setHexInput(nextColor.slice(1).toUpperCase());
    setHsv(rgbToHsv(rgb));
  }

  function updateDraftHsv(nextHsv: Hsv) {
    const normalizedHsv = {
      h: clamp(nextHsv.h, 0, 359),
      s: clamp(nextHsv.s, 0, 100),
      v: clamp(nextHsv.v, 0, 100)
    };
    const nextColor = hsvToHex(normalizedHsv);

    setHsv(normalizedHsv);
    setDraftColor(nextColor);
    setHexInput(nextColor.slice(1).toUpperCase());
  }

  function openColorPicker() {
    updateDraftColor(markerColor);
    setPickerOpen(true);
  }

  function applyColorPicker() {
    setMarkerColor(draftColor);
    setPickerOpen(false);
  }

  function updateColorPlane(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = colorPlaneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);

    updateDraftHsv({
      h: hsv.h,
      s: Math.round((x / rect.width) * 100),
      v: Math.round(100 - (y / rect.height) * 100)
    });
  }

  function updateRgbField(key: keyof Rgb, value: string) {
    updateDraftColor(
      rgbToHex({
        ...draftRgb,
        [key]: clamp(Number(value) || 0, 0, 255)
      })
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    if (!isHexColor(markerColor)) {
      setError("색상을 다시 선택해주세요.");
      return;
    }
    onSubmit({ nickname, markerColor, role });
    setNickname("");
    setRole("member");
    setMarkerColor(PRESET_COLORS[0]);
    updateDraftColor(PRESET_COLORS[0]);
    setError("");
  }

  return (
    <>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="field-label">닉네임</span>
          <input
            className="field"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="예: 라면"
          />
        </label>

        <div>
          <span className="field-label">마커 색상</span>
          <button
            className="mt-1.5 flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
            onClick={openColorPicker}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="h-9 w-9 shrink-0 rounded-full border-4 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.12),0_6px_14px_rgba(15,23,42,0.12)]"
                style={{ backgroundColor: markerColor }}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold text-slate-900">
                  {markerColor.toUpperCase()}
                </span>
                <span className="block text-[12px] font-semibold text-slate-500">
                  색상값 직접 선택
                </span>
              </span>
            </span>
            <Palette className="shrink-0 text-slate-400" size={18} />
          </button>
        </div>

        <label className="block">
          <span className="field-label">역할</span>
          <select
            className="field"
            value={role}
            onChange={(event) => setRole(event.target.value as MemberRole)}
          >
            <option value="member">참여자</option>
            <option value="admin">관리자</option>
          </select>
        </label>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : null}

        <button className="btn-primary w-full" type="submit">
          <Plus size={16} />
          참여자 추가
        </button>
      </form>

      <BottomSheet
        dark
        maxWidth={720}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      >
        <div className="space-y-5">
          <p className="text-[15px] font-bold tracking-[0.08em] text-slate-200">
            색상 선택
          </p>

          <div
            className="relative h-56 cursor-crosshair rounded-lg"
            ref={colorPlaneRef}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateColorPlane(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) updateColorPlane(event);
            }}
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueToHex(hsv.h)}`
            }}
          >
            <span
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`
              }}
              aria-hidden
            />
          </div>

          <div className="flex items-center gap-3">
            <span
              className="h-11 w-11 shrink-0 rounded-full border-2 border-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
              style={{ backgroundColor: draftColor }}
              aria-hidden
            />
            <input
              aria-label="색상 범위"
              className="h-3 flex-1 cursor-pointer appearance-none rounded-full"
              max={359}
              min={0}
              onChange={(event) =>
                updateDraftHsv({ ...hsv, h: Number(event.target.value) })
              }
              style={{
                background:
                  "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
              }}
              type="range"
              value={hsv.h}
            />
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                # HEX
              </span>
              <input
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-center text-sm font-bold text-white outline-none focus:border-white/40"
                value={hexInput}
                onChange={(event) => {
                  const nextHex = cleanHexInput(event.target.value);
                  setHexInput(nextHex);
                  if (nextHex.length === 6) updateDraftColor(`#${nextHex}`);
                }}
              />
            </label>
            {(["r", "g", "b"] as const).map((key) => (
              <label className="block" key={key}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {key.toUpperCase()}
                </span>
                <input
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-center text-sm font-bold text-white outline-none focus:border-white/40"
                  max={255}
                  min={0}
                  onChange={(event) => updateRgbField(key, event.target.value)}
                  type="number"
                  value={Math.round(draftRgb[key])}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                aria-label={`색상 ${color}`}
                aria-pressed={draftColor.toLowerCase() === color.toLowerCase()}
                className="h-10 w-10 rounded-lg border border-white/15 transition active:scale-95"
                key={color}
                onClick={() => updateDraftColor(color)}
                style={{
                  backgroundColor: color,
                  boxShadow:
                    draftColor.toLowerCase() === color.toLowerCase()
                      ? "0 0 0 3px rgba(255,255,255,0.85)"
                      : undefined
                }}
                type="button"
              />
            ))}
          </div>

          <div className="grid grid-cols-[0.75fr_1.25fr] gap-3 pt-1">
            <button
              className="rounded-xl bg-white/[0.12] px-4 py-4 text-sm font-extrabold text-white transition hover:bg-white/[0.18]"
              onClick={() => setPickerOpen(false)}
              type="button"
            >
              취소
            </button>
            <button
              className="rounded-xl bg-white px-4 py-4 text-sm font-extrabold text-slate-950 transition hover:bg-slate-100"
              onClick={applyColorPicker}
              type="button"
            >
              선택 완료
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
