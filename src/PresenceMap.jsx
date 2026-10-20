import { useEffect, useMemo, useRef, useState } from 'react';
import { DEPARTMENTS, MAP_H, MAP_W, project } from './colombia.js';
import { PRESENCE, PRESENCE_TYPES } from './data.js';
import { reduced, useCountUp, useInView } from './fx.js';

const TOUR_MS = 2800;
const TIP_HALF = 125; // mitad del ancho de la ficha (250px)

// Curva suave desde la sede hacia cada ciudad.
const arcPath = ([x1, y1], [x2, y2]) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const bend = 0.2;
  return `M${x1} ${y1} Q${mx - (y2 - y1) * bend} ${my + (x2 - x1) * bend} ${x2} ${y2}`;
};

function Stat({ value, label, start }) {
  const n = useCountUp(value, start, 900);
  return <div><strong>{n}</strong><span>{label}</span></div>;
}

export default function PresenceMap() {
  const [ref, inView] = useInView(0.3);
  const [filter, setFilter] = useState(null);
  const [active, setActive] = useState(null);
  const [hoverDept, setHoverDept] = useState(null);
  const [touring, setTouring] = useState(true);
  const mapRef = useRef(null);
  const [mapW, setMapW] = useState(0);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setMapW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(() => PRESENCE.map((p) => ({ ...p, xy: project(p.lon, p.lat) })), []);
  const hq = points.find((p) => p.type === 'sede') || points[0];
  const visible = (p) => !filter || p.type === filter;
  const shown = points.filter(visible);
  const depts = useMemo(() => new Set(PRESENCE.map((p) => p.dept)), []);
  const shownDepts = new Set(shown.map((p) => p.dept));
  const counts = useMemo(
    () => PRESENCE.reduce((acc, p) => ({ ...acc, [p.type]: (acc[p.type] || 0) + 1 }), {}),
    [],
  );

  // Al entrar en pantalla, el recorrido arranca por la sede cuando terminan de dibujarse las conexiones.
  useEffect(() => {
    if (!inView) return undefined;
    const id = setTimeout(() => setActive((a) => (a == null ? points.indexOf(hq) : a)), 1400);
    return () => clearTimeout(id);
  }, [inView]);

  // Recorrido automático por las ciudades mientras nadie interactúa con el mapa.
  useEffect(() => {
    if (!inView || !touring || reduced()) return undefined;
    const id = setInterval(() => {
      setActive((a) => {
        const idx = points.map((p, i) => (visible(p) ? i : -1)).filter((i) => i >= 0);
        const pos = idx.indexOf(a);
        return idx[(pos + 1) % idx.length];
      });
    }, TOUR_MS);
    return () => clearInterval(id);
  }, [inView, touring, filter]);

  const pick = (i) => { setTouring(false); setActive(i); };
  const release = () => setTouring(true);
  const cur = active != null && visible(points[active]) ? points[active] : null;
  const hoverInfo = hoverDept && DEPARTMENTS.find((d) => d.id === hoverDept);

  return (
    <section id="presencia" className="section">
      <div className={`container presence ${inView ? 'is-live' : ''}`} ref={ref}>
        <div className="presence__copy reveal">
          <p className="kicker">Cobertura</p>
          <h2>Presencia en Colombia</h2>
          <p>Desde nuestra sede en la región Caribe atendemos proyectos en distintas ciudades del país.</p>

          <div className="pstats">
            <Stat value={shown.length} label={filter ? PRESENCE_TYPES[filter].label.toLowerCase() : 'ciudades atendidas'} start={inView} />
            <Stat value={shownDepts.size} label="departamentos" start={inView} />
            <Stat value={counts.proyectos || 0} label="ciudades con proyectos" start={inView} />
          </div>

          <div className="legend" role="group" aria-label="Filtrar por tipo de presencia">
            {Object.entries(PRESENCE_TYPES).map(([k, t]) => (
              <button key={k} className={filter === k ? 'is-on' : ''} aria-pressed={filter === k} onClick={() => setFilter(filter === k ? null : k)}>
                <i className={`dot dot--${k}`} />
                {t.label} <b>{counts[k] || 0}</b>
              </button>
            ))}
          </div>

          <ul className="pcities" onMouseLeave={release}>
            {points.map((p, i) => (
              <li key={p.city} className={visible(p) ? '' : 'is-dim'}>
                <button className={active === i ? 'is-on' : ''} onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={release}>
                  <i className={`dot dot--${p.type}`} />
                  {p.city}
                  <small>{p.dept}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="pmap reveal" ref={mapRef} onMouseLeave={() => { setHoverDept(null); release(); }}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Mapa de Colombia con presencia de SOTEC en ${PRESENCE.map((p) => p.city).join(', ')}`}>
            <g className="pmap__depts">
              {DEPARTMENTS.map((d, i) => (
                <path
                  key={d.id}
                  d={d.d}
                  style={{ '--i': i }}
                  className={`${depts.has(d.name) ? 'has' : ''} ${shownDepts.has(d.name) ? '' : 'is-off'} ${hoverDept === d.id ? 'is-hover' : ''}`}
                  onMouseEnter={() => setHoverDept(d.id)}
                />
              ))}
            </g>
            <g className="pmap__arcs">
              {points.map((p, i) => p !== hq && (
                <g key={p.city} className={`${visible(p) ? '' : 'is-dim'} ${active === i ? 'is-active' : ''}`}>
                  <path className="arc" d={arcPath(hq.xy, p.xy)} pathLength="1" style={{ '--i': i }} />
                  <path className="arc arc--flow" d={arcPath(hq.xy, p.xy)} style={{ '--i': i }} />
                  {inView && visible(p) && !reduced() && (
                    <circle r="3" className="packet">
                      <animateMotion dur={`${2.6 + (i % 4) * 0.5}s`} begin={`${1.2 + i * 0.2}s`} repeatCount="indefinite" path={arcPath(hq.xy, p.xy)} />
                    </circle>
                  )}
                </g>
              ))}
            </g>
            <g>
              {points.map((p, i) => (
                <g
                  key={p.city}
                  transform={`translate(${p.xy[0]} ${p.xy[1]})`}
                  className={`pin pin--${p.type} ${active === i ? 'is-active' : ''} ${visible(p) ? '' : 'is-dim'}`}
                  onMouseEnter={() => pick(i)}
                >
                  <g className="pin__pop" style={{ '--i': i }}>
                    <circle className="pin__ring" r={p.type === 'sede' ? 8 : 6} style={{ '--i': i }} />
                    <circle className="pin__dot" r={p.type === 'sede' ? 8 : 6} />
                  </g>
                </g>
              ))}
            </g>
          </svg>

          {cur && (() => {
            // La ficha se mantiene dentro del mapa; la flecha sigue apuntando al pin.
            const px = (cur.xy[0] / MAP_W) * mapW;
            const left = Math.min(Math.max(px, TIP_HALF), Math.max(TIP_HALF, mapW - TIP_HALF));
            const below = cur.xy[1] / MAP_H < 0.4;
            return (
            <div
              className={`pmap__tip pmap__tip--pin ${below ? 'is-below' : ''}`}
              key={cur.city}
              style={{ left: `${left}px`, top: `${(cur.xy[1] / MAP_H) * 100}%`, '--ax': `${px - left}px` }}
            >
              <small>{PRESENCE_TYPES[cur.type].label}</small>
              <strong>{cur.city}</strong>
              <span>{cur.text}</span>
            </div>
            );
          })()}
          {!cur && hoverInfo && (
            <div className="pmap__tip">
              <strong>{hoverInfo.name}</strong>
              <span>{depts.has(hoverInfo.name) ? PRESENCE.filter((p) => p.dept === hoverInfo.name).map((p) => p.city).join(', ') : 'Atención bajo solicitud'}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
