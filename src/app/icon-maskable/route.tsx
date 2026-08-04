import { ImageResponse } from "next/og";
import { BrandTile } from "@/lib/brand-tile";
import { BRAND_MASKABLE_SCALE } from "@/lib/brand";

const SIZE = 512;

/**
 * Ícono maskable para Android. Va como route handler y no con la convención de
 * metadata, y el motivo importa.
 *
 * Next solo reconoce `favicon`, `icon` y `apple-icon`; para tener varios se usa
 * sufijo numérico (`icon1`, `icon2`). Un archivo `icon-maskable.tsx` **no genera
 * ninguna ruta**: el manifest apuntaba a `/icon-maskable` y era un 404, así que
 * Android se quedaba sin ícono adaptativo y metía el normal, con sus esquinas
 * redondeadas, adentro de la máscara del launcher.
 *
 * Renombrarlo a `icon1.tsx` sí generaría la ruta, pero Next lo inyectaría como
 * `<link rel="icon">` en el head y el navegador podría usar esta baldosa a
 * sangre como favicon de la pestaña. Como route handler la URL queda igual y el
 * head limpio.
 *
 * Android recorta con la forma que tenga el launcher (círculo, squircle, gota) y
 * solo garantiza el 66 % central: la baldosa va a sangre y el dibujo achicado,
 * así no se come las puntas de la eme.
 */
export function GET() {
  return new ImageResponse(
    <BrandTile size={SIZE} radius={0} scale={BRAND_MASKABLE_SCALE} />,
    {
      width: SIZE,
      height: SIZE,
      headers: {
        // Un día. Este ícono se pide al instalar la PWA y al empaquetar el TWA,
        // no en cada carga. Sin hash en la URL, `immutable` dejaría el ícono
        // viejo pegado para siempre si alguna vez cambia la marca.
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
