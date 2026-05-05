type GhostlyLogoProps = {
  className?: string;
  variant?: "full" | "mark" | "square" | "character";
};

export function GhostlyLogo({ className = "", variant = "full" }: GhostlyLogoProps) {
  if (variant === "mark" || variant === "character") {
    return (
      <picture>
        <source srcSet="/먹킷맵로고(캐릭터)-흰색.png" media="(prefers-color-scheme: dark)" />
        <img
          alt="먹킷맵"
          className={`block h-9 w-9 select-none rounded-xl object-contain ${className}`}
          draggable={false}
          src="/mukkit-logo-character.png"
        />
      </picture>
    );
  }

  if (variant === "square") {
    return (
      <picture>
        <source srcSet="/먹킷맵로고(캐릭터)-흰색.png" media="(prefers-color-scheme: dark)" />
        <img
          alt="먹킷맵"
          className={`block h-10 w-10 select-none rounded-xl object-contain ${className}`}
          draggable={false}
          src="/mukkit-logo-character.png"
        />
      </picture>
    );
  }

  // full (horizontal) variant — 캐릭터 이미지 + 텍스트 조합
  return (
    <span className={`inline-flex select-none items-center gap-2 ${className}`}>
      <picture>
        <source srcSet="/먹킷맵로고(캐릭터)-흰색.png" media="(prefers-color-scheme: dark)" />
        <img
          alt=""
          aria-hidden
          className="block h-8 w-8 shrink-0 rounded-lg object-contain"
          draggable={false}
          src="/mukkit-logo-character.png"
        />
      </picture>
      <span className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white">
        먹킷맵
      </span>
    </span>
  );
}
