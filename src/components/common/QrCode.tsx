"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Always ink on white, whatever the theme, so phones can scan it.
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 2,
      color: { dark: "#17181E", light: "#FFFFFF" },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={dataUrl} alt={`QR code for ${value}`} width={size} height={size} className="rounded-2xl" />
  );
}
