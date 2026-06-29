/**
 * Ilustraciones propias en SVG con un look "soft 3D" (degradés + sombra
 * difusa). Son livianas, escalan perfecto en mobile y se animan con el
 * tema (light/dark) sin depender de assets externos.
 *
 * Todas son decorativas: van acompañadas de texto, así que llevan
 * aria-hidden y no exponen rol de imagen.
 */

type IllustrationProps = Readonly<{
  className?: string;
}>;

/** Marca de la app: building con degradé índigo→violeta. */
export function BrandMark({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="bm-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.66 0.18 274)" />
          <stop offset="1" stopColor="oklch(0.52 0.2 300)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#bm-tile)" />
      {/* brillo superior para dar volumen */}
      <path
        d="M0 18C0 8 8 0 18 0h28c10 0 18 8 18 18v6H0z"
        fill="#fff"
        opacity="0.14"
      />
      {/* edificio */}
      <g fill="#fff">
        <rect x="20" y="22" width="13" height="24" rx="2.5" opacity="0.95" />
        <rect x="33" y="16" width="13" height="30" rx="2.5" />
        <rect x="22.5" y="26" width="3.2" height="3.2" rx="0.8" fill="oklch(0.6 0.18 274)" />
        <rect x="27.3" y="26" width="3.2" height="3.2" rx="0.8" fill="oklch(0.6 0.18 274)" />
        <rect x="22.5" y="32" width="3.2" height="3.2" rx="0.8" fill="oklch(0.6 0.18 274)" />
        <rect x="27.3" y="32" width="3.2" height="3.2" rx="0.8" fill="oklch(0.6 0.18 274)" />
        <rect x="36" y="21" width="3.2" height="3.2" rx="0.8" fill="oklch(0.55 0.2 300)" />
        <rect x="40.5" y="21" width="3.2" height="3.2" rx="0.8" fill="oklch(0.55 0.2 300)" />
        <rect x="36" y="27" width="3.2" height="3.2" rx="0.8" fill="oklch(0.55 0.2 300)" />
        <rect x="40.5" y="27" width="3.2" height="3.2" rx="0.8" fill="oklch(0.55 0.2 300)" />
        <rect x="36" y="33" width="3.2" height="3.2" rx="0.8" fill="oklch(0.55 0.2 300)" />
        <rect x="40.5" y="33" width="3.2" height="3.2" rx="0.8" fill="oklch(0.55 0.2 300)" />
      </g>
    </svg>
  );
}

/** Hero del login: barrio simpático con sol y nubes. */
export function BuildingScene({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.93 0.06 274)" />
          <stop offset="1" stopColor="oklch(0.97 0.02 274 / 0)" />
        </linearGradient>
        <linearGradient id="bs-b1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.66 0.16 274)" />
          <stop offset="1" stopColor="oklch(0.52 0.18 280)" />
        </linearGradient>
        <linearGradient id="bs-b2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.7 0.13 200)" />
          <stop offset="1" stopColor="oklch(0.56 0.13 205)" />
        </linearGradient>
        <linearGradient id="bs-b3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.8 0.14 75)" />
          <stop offset="1" stopColor="oklch(0.68 0.15 60)" />
        </linearGradient>
        <radialGradient id="bs-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="oklch(0.88 0.15 85)" />
          <stop offset="1" stopColor="oklch(0.8 0.16 70)" />
        </radialGradient>
        <filter id="bs-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <ellipse cx="100" cy="58" rx="120" ry="70" fill="url(#bs-sky)" />
      <circle cx="196" cy="46" r="20" fill="url(#bs-sun)" />

      {/* nubes */}
      <g fill="#fff" opacity="0.92">
        <rect x="36" y="40" width="50" height="15" rx="7.5" />
        <circle cx="50" cy="42" r="9" />
        <circle cx="66" cy="40" r="11" />
      </g>

      {/* sombra del piso */}
      <ellipse
        cx="120"
        cy="176"
        rx="92"
        ry="12"
        fill="oklch(0.5 0.1 280)"
        opacity="0.18"
        filter="url(#bs-shadow)"
      />

      {/* edificio teal (izq) */}
      <g>
        <rect x="40" y="104" width="50" height="70" rx="8" fill="url(#bs-b2)" />
        <Windows x={50} y={116} rows={3} cols={2} tint="oklch(0.95 0.05 200)" />
        <rect x="58" y="156" width="14" height="18" rx="3" fill="oklch(0.46 0.12 205)" />
      </g>

      {/* edificio índigo (centro, más alto) */}
      <g>
        <rect x="92" y="64" width="58" height="110" rx="9" fill="url(#bs-b1)" />
        <path d="M92 73c0-5 4-9 9-9h40c5 0 9 4 9 9v6H92z" fill="#fff" opacity="0.12" />
        <Windows x={103} y={80} rows={5} cols={3} tint="oklch(0.96 0.05 280)" />
        <rect x="112" y="156" width="18" height="18" rx="3.5" fill="oklch(0.42 0.16 282)" />
      </g>

      {/* edificio ámbar (der) */}
      <g>
        <rect x="152" y="120" width="48" height="54" rx="8" fill="url(#bs-b3)" />
        <Windows x={161} y={130} rows={2} cols={2} tint="oklch(0.97 0.05 85)" />
        <rect x="168" y="158" width="14" height="16" rx="3" fill="oklch(0.58 0.16 55)" />
      </g>
    </svg>
  );
}

/** Sobre con carta: pantalla "revisá tu mail". */
export function EnvelopeScene({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="es-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.68 0.16 274)" />
          <stop offset="1" stopColor="oklch(0.53 0.18 280)" />
        </linearGradient>
        <linearGradient id="es-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.74 0.15 274)" />
          <stop offset="1" stopColor="oklch(0.64 0.16 276)" />
        </linearGradient>
        <filter id="es-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <ellipse
        cx="120"
        cy="168"
        rx="78"
        ry="12"
        fill="oklch(0.5 0.1 280)"
        opacity="0.18"
        filter="url(#es-shadow)"
      />

      {/* carta que asoma */}
      <g>
        <rect x="78" y="40" width="84" height="76" rx="8" fill="#fff" />
        <rect x="90" y="56" width="60" height="6" rx="3" fill="oklch(0.86 0.04 274)" />
        <rect x="90" y="70" width="44" height="6" rx="3" fill="oklch(0.9 0.03 274)" />
        <circle cx="120" cy="96" r="13" fill="oklch(0.63 0.15 158)" />
        <path
          d="M114 96l4 4 8-9"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* cuerpo del sobre */}
      <path
        d="M56 96h128c5 0 9 4 9 9v44c0 5-4 9-9 9H56c-5 0-9-4-9-9v-44c0-5 4-9 9-9z"
        fill="url(#es-body)"
      />
      {/* solapa */}
      <path
        d="M47 104l66 42c4.3 2.7 9.7 2.7 14 0l66-42v3c0 3-1.5 5.8-4 7.4l-62 39.6c-4.3 2.7-9.7 2.7-14 0L51 114.4c-2.5-1.6-4-4.4-4-7.4z"
        fill="url(#es-flap)"
      />

      {/* destellos */}
      <g fill="oklch(0.8 0.14 85)">
        <path d="M188 58l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" />
        <circle cx="52" cy="64" r="3.2" />
      </g>
    </svg>
  );
}

/** Medalla con check + papelitos: momento "estás al día". */
export function CelebrateScene({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="cs-badge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.72 0.15 158)" />
          <stop offset="1" stopColor="oklch(0.58 0.14 160)" />
        </linearGradient>
        <filter id="cs-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* papelitos de colores */}
      <g>
        <rect x="22" y="30" width="9" height="9" rx="2" fill="oklch(0.6 0.17 274)" transform="rotate(-18 26 34)" />
        <rect x="128" y="36" width="9" height="9" rx="2" fill="oklch(0.7 0.13 75)" transform="rotate(22 132 40)" />
        <circle cx="34" cy="74" r="4.5" fill="oklch(0.64 0.18 25)" />
        <circle cx="126" cy="80" r="4.5" fill="oklch(0.57 0.16 255)" />
        <rect x="40" y="14" width="7" height="7" rx="2" fill="oklch(0.55 0.19 300)" transform="rotate(30 43 17)" />
        <path d="M118 18l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="oklch(0.7 0.13 75)" />
      </g>

      {/* sombra */}
      <ellipse cx="80" cy="118" rx="38" ry="7" fill="oklch(0.5 0.1 160)" opacity="0.2" filter="url(#cs-shadow)" />

      {/* medalla */}
      <circle cx="80" cy="68" r="40" fill="url(#cs-badge)" />
      <circle cx="80" cy="68" r="40" fill="#fff" opacity="0.12" />
      <circle cx="80" cy="62" r="30" fill="#fff" opacity="0.16" />
      <path
        d="M67 69l9 9 18-19"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Sello "PAGADO" para el comprobante (imprime bien en blanco y negro). */
export function PaidStamp({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g transform="rotate(-8 60 60)">
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="oklch(0.63 0.15 158 / 0.08)"
          stroke="oklch(0.58 0.14 158)"
          strokeWidth="3"
        />
        <circle
          cx="60"
          cy="60"
          r="43"
          fill="none"
          stroke="oklch(0.58 0.14 158)"
          strokeWidth="1.5"
          strokeDasharray="2 3.5"
          opacity="0.7"
        />
        <path
          d="M45 54l10 10 21-23"
          stroke="oklch(0.58 0.14 158)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="60"
          y="90"
          textAnchor="middle"
          fontSize="15"
          fontWeight="800"
          letterSpacing="2.5"
          fill="oklch(0.55 0.14 158)"
        >
          PAGADO
        </text>
      </g>
    </svg>
  );
}

/** Grilla de ventanitas reutilizable para los edificios. */
function Windows({
  x,
  y,
  rows,
  cols,
  tint,
}: Readonly<{
  x: number;
  y: number;
  rows: number;
  cols: number;
  tint: string;
}>) {
  const gap = 11;
  const size = 7;
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * gap}
          y={y + r * gap}
          width={size}
          height={size}
          rx={1.8}
          fill={tint}
        />,
      );
    }
  }
  return <g>{cells}</g>;
}
