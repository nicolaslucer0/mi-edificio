import { ImageResponse } from "next/og";
import { BrandTile } from "@/lib/brand-tile";
import { BRAND_MASKABLE_SCALE } from "@/lib/brand";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Android recorta este ícono con la forma que tenga el launcher (círculo,
 * squircle, gota) y solo garantiza el 66 % central. La baldosa va a sangre y
 * el dibujo achicado, así no se come las puntas de la eme.
 */
export default function IconMaskable() {
  return new ImageResponse(
    <BrandTile size={size.width} radius={0} scale={BRAND_MASKABLE_SCALE} />,
    size,
  );
}
