import {
  BRAND_DOOR,
  BRAND_GRADIENT_FROM,
  BRAND_GRADIENT_TO,
  BRAND_ROOFLINE,
  BRAND_ROOFLINE_WIDTH,
  BRAND_VIEWBOX,
} from "@/lib/brand";

/**
 * La marca como baldosa completa, para los íconos que se generan con
 * `ImageResponse` (`icon`, `apple-icon`, `icon-maskable`).
 *
 * El degradé va como fondo del div y no como `linearGradient` de SVG: Satori,
 * el motor detrás de ImageResponse, dibuja SVG con soporte limitado, pero
 * resuelve `linear-gradient` de CSS sin problema.
 *
 * `scale` achica el dibujo dentro de la baldosa. Lo usa el ícono maskable:
 * Android recorta en círculo y solo garantiza el 66 % central, así que a
 * tamaño completo las puntas de la eme quedarían afuera.
 */
export function BrandTile({
  size,
  radius,
  scale = 1,
}: Readonly<{ size: number; radius: number; scale?: number }>) {
  const drawing = Math.round(size * scale);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: `${radius}px`,
        background: `linear-gradient(135deg, ${BRAND_GRADIENT_FROM} 0%, ${BRAND_GRADIENT_TO} 100%)`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={drawing}
        height={drawing}
        viewBox={`0 0 ${BRAND_VIEWBOX} ${BRAND_VIEWBOX}`}
        fill="none"
      >
        <path
          d={BRAND_ROOFLINE}
          fill="none"
          stroke="#ffffff"
          strokeWidth={BRAND_ROOFLINE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x={BRAND_DOOR.x}
          y={BRAND_DOOR.y}
          width={BRAND_DOOR.width}
          height={BRAND_DOOR.height}
          rx={BRAND_DOOR.radius}
          fill={BRAND_GRADIENT_TO}
        />
      </svg>
    </div>
  );
}
