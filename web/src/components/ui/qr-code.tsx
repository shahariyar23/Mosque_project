"use client";

import { useEffect, useState } from "react";
import QRCodeEncoder from "qrcode";

export interface QRCodeProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
  ariaLabel?: string;
}

/** A standards compliant SVG QR code with the required four module quiet zone. */
export function QRCode({
  value,
  size = 180,
  fgColor = "#073a2d",
  bgColor = "#ffffff",
  className = "",
  ariaLabel = "Registration QR Code",
}: QRCodeProps) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let active = true;
    void QRCodeEncoder.toString(value, {
      type: "svg",
      width: size,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: fgColor, light: bgColor },
    })
      .then((output) => { if (active) setSvg(output); })
      .catch(() => { if (active) setSvg(""); });
    return () => { active = false; };
  }, [value, size, fgColor, bgColor]);

  if (!svg) {
    return <div aria-label={ariaLabel} style={{ width: size, height: size }} className={`bg-gray-100 ${className}`} />;
  }

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
