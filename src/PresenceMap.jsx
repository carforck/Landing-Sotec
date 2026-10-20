import { useMemo, useState } from 'react';
import { MapPin, Building2, Hammer, Radar } from 'lucide-react';
import { DEPARTMENTS, MAP_H, MAP_W, project } from './colombia.js';
import { PRESENCE, PRESENCE_TYPES } from './data.js';
import { useCountUp, useInView } from './fx.js';

const TYPE_ICON = { sede: Building2, proyectos: Hammer, cobertura: Radar };

// Curva desde la sede hacia cada ciudad, como un enlace de red.
const arcPath = ([x1, y1], [x2, y2]) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bend = 0.22;
  return `M${x1} ${y1} Q${mx - dy * bend} ${my + dx * bend} ${x2} ${y2}`;
};

function Stat({ value, label, start }) {
  const n = useCountUp(value, start);
  return (
    <div className="pstat">
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function PresenceMap() {
  const [ref, inView] = useInView({ threshold: 0.2 });
  const [filter, setFilter] = useState(null);
  const [active, setActive] = useState(0);
  const [hoverDept, setHoverDept] = useState(null);

  const points = useMemo(() => PRESENCE.map((p) => ({ ...p, xy: project(p.lon, p.lat) })), []);
  const hq = points.find((p) => p.type === 'sede') || points[0];
  const depts = useMemo(() => new Set(PRESENCE.map((p) => p.dept)), []);
  const counts = useMemo(
    () => PRESENCE.reduce((acc, p) => ({ ...acc, [p.type]: (acc[p.type] || 0) + 1 }), {}),
    [],
  );
  const visible = (p) => !filter || p.type === filter;
  const cur = points[active];
  const CurIcon = TYPE_ICON[cur.type];

  const deptCities = (name) => PRESENCE.filter((p) => p.dept === name).map((p) => p.city).join(', ');
  const hoverInfo = hoverDept && DEPARTMENTS.find((d) => d.id === hoverDept);

  return (
    <section id="presencia" className="section presence" ref={ref}>
      <div className="container">
        <div className="section__head section__head--light reveal">
          <p className="eyebrow eyebrow--light">Presencia nacional</p>
          <h2>Desde el Caribe hacia toda Colombia</h2>
          <p>Nuestra base está en la región Caribe y llevamos soluciones a hogares y empresas en distintas ciudades del país.</p>
        </div>

        <div className={`presence__grid ${inView ? 'is-live' : ''}`}>
          <div className="pmap" onMouseLeave={() => setHoverDept(null)}>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Mapa de Colombia con presencia de SOTEC en ${PRESENCE.map((p) => p.city).join(', ')}`}>
              <defs>
                <radialGradient id="pinGlow">
                  <stop offset="0" stopColor="#8fe04e" stopOpacity=".55" />
                  <stop offset="1" stopColor="#8fe04e" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g className="pmap__depts">
                {DEPARTMENTS.map((d) => (
                  <path
                    key={d.id}
                    d={d.d}
                    className={`${depts.has(d.name) ? 'has' : ''} ${hoverDept === d.id ? 'is-hover' : ''}`}
                    onMouseEnter={() => setHoverDept(d.id)}
                  />
                ))}
              </g>
              <g className="pmap__arcs">
                {points.map((p, i) => p !== hq && (
                  <g key={p.city} className={visible(p) ? '' : 'is-dim'}>
                    <path d={arcPath(hq.xy, p.xy)} pathLength="1" style={{ '--i': i }} />
                    {inView && visible(p) && (
                      <circle r="2.6" className="pmap__packet">
                        <animateMotion dur={`${2.4 + (i % 4) * 0.5}s`} begin={`${i * 0.25}s`} repeatCount="indefinite" path={arcPath(hq.xy, p.xy)} />
                      </circle>
                    )}
                  </g>
                ))}
              </g>
              <g className="pmap__pins">
                {points.map((p, i) => (
                  <g
                    key={p.city}
                    transform={`translate(${p.xy[0]} ${p.xy[1]})`}
                    className={`pin pin--${p.type} ${active === i ? 'is-active' : ''} ${visible(p) ? '' : 'is-dim'}`}
                    style={{ '--i': i, '--c': PRESENCE_TYPES[p.type].color }}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setActive(i)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.city}, ${PRESENCE_TYPES[p.type].label}`}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActive(i)}
                  >
                    <circle r="22" fill="url(#pinGlow)" className="pin__glow" />
                    <circle r="6" className="pin__ring" />
                    <circle r={p.type === 'sede' ? 6.5 : 4.5} className="pin__dot" />
                  </g>
                ))}
              </g>
            </svg>

            {hoverInfo && (
              <div className="pmap__tip">
                <strong>{hoverInfo.name}</strong>
                <span>{depts.has(hoverInfo.name) ? deptCities(hoverInfo.name) : 'Atención bajo solicitud'}</span>
              </div>
            )}

            <div className="pmap__card fx" key={cur.city}>
              <span className="pmap__card-icon" style={{ background: PRESENCE_TYPES[cur.type].color }}><CurIcon size={18} /></span>
              <div>
                <small>{PRESENCE_TYPES[cur.type].label}</small>
                <strong>{cur.city}</strong>
                <span>{cur.dept}</span>
                <p>{cur.text}</p>
              </div>
            </div>
          </div>

          <aside className="presence__side">
            <div className="pstats">
              <Stat value={PRESENCE.length} label="ciudades atendidas" start={inView} />
              <Stat value={depts.size} label="departamentos" start={inView} />
              <Stat value={counts.proyectos || 0} label="ciudades con proyectos" start={inView} />
            </div>

            <div className="pfilters" role="group" aria-label="Filtrar por tipo de presencia">
              <button className={!filter ? 'is-on' : ''} aria-pressed={!filter} onClick={() => setFilter(null)}>
                Todas <b>{PRESENCE.length}</b>
              </button>
              {Object.entries(PRESENCE_TYPES).map(([k, t]) => (
                <button key={k} className={filter === k ? 'is-on' : ''} aria-pressed={filter === k} onClick={() => setFilter(filter === k ? null : k)}>
                  <i style={{ background: t.color }} />
                  {t.label} <b>{counts[k] || 0}</b>
                </button>
              ))}
            </div>

            <ul className="pcities">
              {points.map((p, i) => visible(p) && (
                <li key={p.city}>
                  <button className={active === i ? 'is-on' : ''} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}>
                    <MapPin size={16} style={{ color: PRESENCE_TYPES[p.type].color }} />
                    <span>{p.city}<small>{p.dept}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
