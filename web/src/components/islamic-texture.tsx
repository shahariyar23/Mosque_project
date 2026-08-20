import type { CSSProperties } from "react";

type TextureVariant = "hero" | "footer";
type TexturePosition = "left" | "center" | "right";

type Props = {
  variant: TextureVariant;
  position?: TexturePosition;
  className?: string;
  opacity?: number;
  scale?: number;
};

const textureAssets: Record<TextureVariant, string> = {
  hero: "/textures/islamic-geometric.svg",
  footer: "/textures/mosque-watermark.svg",
};

export function IslamicTexture({
  variant,
  position = "center",
  className = "",
  opacity,
  scale,
}: Props) {
  const style: CSSProperties = {
    backgroundImage: `url(${textureAssets[variant]})`,
    opacity: opacity ?? (variant === "footer" ? 0.055 : 0.12),
    transform: scale ? `scale(${scale})` : undefined,
    transformOrigin: position,
  };

  return <div aria-hidden="true" className={`islamic-texture islamic-texture--${variant} islamic-texture--${position} ${className}`} style={style} />;
}
