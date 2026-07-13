/**
 * Reparte `totalCents` entre las unidades según `weights`, usando el método de
 * resto mayor: la suma de las partes da SIEMPRE exactamente `totalCents` (los
 * centavos sobrantes por redondeo se asignan a las de mayor resto fraccionario).
 *
 * Si los pesos no son válidos (suma <= 0), reparte en partes iguales.
 */
export function splitAmount(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const sumW = weights.reduce((s, w) => s + Math.max(0, w), 0);
  const effective = sumW > 0 ? weights.map((w) => Math.max(0, w)) : weights.map(() => 1);
  const effSum = sumW > 0 ? sumW : n;

  const raw = effective.map((w) => (totalCents * w) / effSum);
  const result = raw.map((x) => Math.floor(x));
  let remainder = totalCents - result.reduce((s, x) => s + x, 0);

  const byFrac = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < byFrac.length && remainder > 0; k += 1) {
    result[byFrac[k].i] += 1;
    remainder -= 1;
  }
  return result;
}
