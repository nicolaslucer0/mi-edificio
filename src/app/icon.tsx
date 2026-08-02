import { ImageResponse } from "next/og";
import { BrandTile } from "@/lib/brand-tile";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandTile size={size.width} radius={112} />, size);
}
