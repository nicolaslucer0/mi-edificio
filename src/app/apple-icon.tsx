import { ImageResponse } from "next/og";
import { BrandTile } from "@/lib/brand-tile";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS redondea las esquinas por su cuenta: la baldosa va cuadrada. */
export default function AppleIcon() {
  return new ImageResponse(<BrandTile size={size.width} radius={0} />, size);
}
