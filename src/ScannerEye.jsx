import { useId } from 'react';
import { Sun, Wifi } from 'lucide-react';

// Escáner de la primera entrega: anillo y hexágono girando, barrido de radar, nodos que se
// encienden, pupila que pulsa, resplandor y etiquetas flotantes.
const NODES = [[70, 70], [52, 118], [92, 220], [248, 96], [262, 150], [228, 236]];

export default function ScannerEye({ play = true, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`scan ${play ? 'is-play' : ''} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 320 320" className="scan__svg">
        <defs>
          <radialGradient id={`scan-iris-${id}`} cx="45%" cy="40%" r="60%">
            <stop offset="0" stopColor="#c9cacc" />
            <stop offset=".55" stopColor="#8d8e90" />
            <stop offset="1" stopColor="#3b3a3b" />
          </radialGradient>
          <linearGradient id={`scan-sweep-${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#3BA30E" stopOpacity="0" />
            <stop offset="1" stopColor="#3BA30E" stopOpacity=".55" />
          </linearGradient>
        </defs>
        <g className="scan__ring">
          <circle cx="160" cy="160" r="150" fill="none" stroke="#3BA30E" strokeWidth="6" strokeDasharray="300 70 180 60" strokeLinecap="round" />
        </g>
        <polygon className="scan__hex" points="160,30 272,95 272,225 160,290 48,225 48,95" fill="none" stroke="#3BA30E" strokeWidth="5" strokeLinejoin="round" />
        <g stroke="rgba(255,255,255,.28)" strokeWidth="1.2" fill="none">
          <path d="M70 70 L120 70 L140 100" />
          <path d="M52 118 L110 118" />
          <path d="M92 220 L120 196" />
          <path d="M248 96 L210 120" />
          <path d="M262 150 L222 150" />
          <path d="M228 236 L200 210 L180 210" />
          <path d="M160 40 V280 M40 160 H280" strokeDasharray="2 6" />
        </g>
        {NODES.map(([x, y], i) => (
          <circle key={i} className="scan__node" style={{ '--i': i }} cx={x} cy={y} r="7" fill="#58595b" stroke="#97989A" strokeWidth="2" />
        ))}
        <g className="scan__sweep">
          <path d="M160 160 L160 52 A108 108 0 0 1 253 106 Z" fill={`url(#scan-sweep-${id})`} />
        </g>
        <circle cx="160" cy="160" r="62" fill="#1d1f1e" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
        <circle cx="160" cy="160" r="50" fill={`url(#scan-iris-${id})`} />
        <circle className="scan__pupil" cx="160" cy="160" r="22" fill="#121212" />
        <circle cx="170" cy="148" r="8" fill="rgba(255,255,255,.75)" />
      </svg>
      <div className="scan__chip scan__chip--a"><span className="scan__live" /> Monitoreo activo</div>
      <div className="scan__chip scan__chip--b"><Sun size={14} /> Energía solar</div>
      <div className="scan__chip scan__chip--c"><Wifi size={14} /> Red estable</div>
    </div>
  );
}
