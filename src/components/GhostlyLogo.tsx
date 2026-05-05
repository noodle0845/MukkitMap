type GhostlyLogoProps = {
  className?: string;
  variant?: "full" | "mark" | "square" | "character";
};

export function GhostlyLogo({ className = "", variant = "full" }: GhostlyLogoProps) {
  if (variant === "mark" || variant === "character") {
    return (
      <span
        className={`inline-flex h-9 w-9 select-none items-center justify-center rounded-xl bg-emerald-500 text-[14px] font-black text-white ${className}`}
        aria-label="먹킷맵"
      >
        먹
      </span>
    );
  }

  if (variant === "square") {
    return (
      <span
        className={`inline-flex h-10 w-10 select-none items-center justify-center rounded-xl bg-emerald-500 text-[14px] font-black text-white ${className}`}
        aria-label="먹킷맵"
      >
        먹
      </span>
    );
  }

  // full (horizontal) variant
  return (
    <span className={`inline-flex select-none items-center gap-2 ${className}`} aria-label="먹킷맵">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-[13px] font-black text-white">
        먹
      </span>
      <span className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white">
        먹킷맵
      </span>
    </span>
  );
}
