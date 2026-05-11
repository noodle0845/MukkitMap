type GhostlyLogoProps = {
  className?: string;
  variant?: "full" | "mark" | "square" | "character";
  color?: "black" | "white";
};

const LOGO_VERSION = "20260512";

const LOGO_SRC = {
  black: {
    full: `/mukkit-logo-horizontal.png?v=${LOGO_VERSION}`,
    mark: `/mukkit-logo-character.png?v=${LOGO_VERSION}`
  },
  white: {
    full: `/mukkit-logo-horizontal-white.png?v=${LOGO_VERSION}`,
    mark: `/mukkit-logo-character-white.png?v=${LOGO_VERSION}`
  }
} as const;

export function GhostlyLogo({
  className = "",
  variant = "full",
  color = "black"
}: GhostlyLogoProps) {
  const isMark = variant === "mark" || variant === "square" || variant === "character";
  const src = isMark ? LOGO_SRC[color].mark : LOGO_SRC[color].full;
  const baseClass = isMark
    ? "block h-10 w-10 shrink-0 object-contain"
    : "block h-auto max-w-full shrink-0 object-contain";

  return (
    <img
      src={src}
      alt="먹킷맵"
      className={`${baseClass} ${className}`}
      decoding="async"
      draggable={false}
    />
  );
}
