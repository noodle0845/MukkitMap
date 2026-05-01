type GhostlyLogoProps = {
  className?: string;
  variant?: "full" | "mark" | "square" | "character";
};

export function GhostlyLogo({ className = "", variant = "full" }: GhostlyLogoProps) {
  if (variant === "mark" || variant === "character") {
    return (
      <img
        alt="먹킷맵"
        className={`block h-9 w-9 select-none rounded-xl object-contain ${className}`}
        draggable={false}
        src="/mukkit-logo-character.png"
      />
    );
  }

  if (variant === "square") {
    return (
      <img
        alt="먹킷맵"
        className={`block h-10 w-10 select-none rounded-xl object-contain ${className}`}
        draggable={false}
        src="/mukkit-logo-square.png"
      />
    );
  }

  return (
    <img
      alt="먹킷맵"
      className={`block h-auto w-[152px] select-none object-contain sm:w-[176px] ${className}`}
      draggable={false}
      src="/mukkit-logo-horizontal.png"
    />
  );
}
