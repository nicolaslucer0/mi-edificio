/**
 * La marca, en un solo lugar.
 *
 * La "M" de Mi edificio dibujada como una línea de techos, con una puerta
 * recortada en el medio: monograma y skyline en la misma forma. Es un trazo
 * grueso y no un dibujo con detalle, que es lo que le permite sobrevivir a
 * 16 px en una pestaña.
 *
 * Estas constantes las comparten el componente `BrandMark` (sidebar, top bar
 * y login) y los tres íconos generados (`icon`, `apple-icon`,
 * `icon-maskable`). Si cambia el logo, cambia acá y cambia en todos lados.
 */

/** Todo se dibuja sobre este lienzo cuadrado. */
export const BRAND_VIEWBOX = 64;

/** Degradé de la baldosa, en el violeta de la app. */
export const BRAND_GRADIENT_FROM = "#8064e0";
export const BRAND_GRADIENT_TO = "#6435c0";

/** Los techos. Trazo grueso con puntas redondeadas. */
export const BRAND_ROOFLINE = "M14 48V26l9-8 9 8 9-8 9 8v22";
export const BRAND_ROOFLINE_WIDTH = 7;

/** La puerta, recortada bajo el valle central de la eme. */
export const BRAND_DOOR = { x: 27, y: 38, width: 10, height: 12, radius: 3 };

/**
 * Cuánto del lienzo ocupa la marca en un ícono maskable. Android recorta en
 * círculo y solo garantiza el 66 % central: a tamaño completo las puntas de
 * la eme quedarían afuera.
 */
export const BRAND_MASKABLE_SCALE = 0.62;
