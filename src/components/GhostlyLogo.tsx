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
        <source srcSet="/먹킷맵로고(캐릭터)-정사각형-흰색.png" media="(prefers-color-scheme: dark)" />
        <img
          alt="먹킷맵"
          className={`block h-10 w-10 select-none rounded-xl object-contain ${className}`}
          draggable={false}
          src="/mukkit-logo-square.png"
        />
      </picture>
    );
  }

  return (
    <picture>
      <source srcSet="/먹킷맵로고(캐릭터)-가로형-흰색.png" media="(prefers-color-scheme: dark)" />
      <img
        alt="먹킷맵"
        className={`block h-auto w-[152px] select-none object-contain sm:w-[176px] ${className}`}
        draggable={false}
        src="/mukkit-logo-horizontal.png"
      />
    </picture>
  );
}
