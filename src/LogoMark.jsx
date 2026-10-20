import { useId } from 'react';

// Emblema SOTEC (anillo, hexágono, circuito y lente) dibujado en SVG para animarlo por partes.
// `play` dispara el trazado; `idle` deja un movimiento lento al terminar (anillo que gira y lente que respira).
const C = 160;

const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

const arc = (r, from, to) => {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

const HEX = Array.from({ length: 6 }, (_, i) => polar(118, -100 + i * 60).map((v) => v.toFixed(1)).join(',')).join(' ');

// Nodos del circuito: posición del nodo y punto donde su línea toca el lente.
const NODES = [
  [polar(96, -150), polar(66, -150)],
  [polar(100, -195), polar(66, -195)],
  [polar(98, 145), polar(66, 145)],
  [polar(96, -35), polar(66, -35)],
  [polar(100, 5), polar(66, 5)],
  [polar(96, 60), polar(66, 60)],
];

export default function LogoMark({ play = true, idle = false, size = 160, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 320 320"
      width={size}
      height={size}
      className={`logomark ${play ? 'is-play' : ''} ${idle ? 'is-idle' : ''} ${className}`}
      role="img"
      aria-label="Emblema de SOTEC"
    >
      <defs>
        <radialGradient id={`iris-${id}`} cx="42%" cy="38%" r="65%">
          <stop offset="0" stopColor="#d4d5d7" />
          <stop offset="0.55" stopColor="#97989a" />
          <stop offset="1" stopColor="#4a4a4b" />
        </radialGradient>
      </defs>

      <g className="lm-ring">
        <path className="lm-draw lm-ring__a" d={arc(148, 150, 380)} pathLength="1" />
        <path className="lm-draw lm-ring__b" d={arc(148, 30, 128)} pathLength="1" />
      </g>
      <polygon className="lm-draw lm-hex" points={HEX} pathLength="1" />

      <g className="lm-lines">
        <path d="M160 52 V268 M52 160 H268" />
        {NODES.map(([n, e], i) => (
          <path key={i} d={`M${n[0].toFixed(1)} ${n[1].toFixed(1)} L${e[0].toFixed(1)} ${e[1].toFixed(1)}`} />
        ))}
      </g>

      <g className="lm-nodes">
        {NODES.map(([n], i) => (
          <circle key={i} cx={n[0].toFixed(1)} cy={n[1].toFixed(1)} r="8" style={{ '--i': i }} />
        ))}
      </g>

      <g className="lm-eye">
        <circle cx={C} cy={C} r="62" className="lm-eye__rim" />
        <circle cx={C} cy={C} r="47" fill={`url(#iris-${id})`} />
        <circle cx={C} cy={C} r="20" className="lm-eye__pupil" />
        <circle cx="172" cy="147" r="7" className="lm-eye__glint" />
      </g>
    </svg>
  );
}
