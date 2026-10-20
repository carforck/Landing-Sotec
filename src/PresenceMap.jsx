import { useMemo, useState } from 'react';
import { DEPARTMENTS, MAP_H, MAP_W, project } from './colombia.js';
import { PRESENCE, PRESENCE_TYPES } from './data.js';

export default function PresenceMap() {
  const [filter, setFilter] = useState(null);
  const [active, setActive] = useState(null);
  const [hoverDept, setHoverDept] = useState(null);

  const points = useMemo(() => PRESENCE.map((p) => ({ ...p, xy: project(p.lon, p.lat) })), []);
  const depts = useMemo(() => new Set(PRESENCE.map((p) => p.dept)), []);
  const counts = useMemo(
    () => PRESENCE.reduce((acc, p) => ({ ...acc, [p.type]: (acc[p.type] || 0) + 1 }), {}),
    [],
  );
  const visible = (p) => !filter || p.type === filter;
  const hoverInfo = hoverDept && DEPARTMENTS.find((d) => d.id === hoverDept);
  const cur = active != null ? points[active] : null;

  return (
    <section id="presencia" className="section">
      <div className="container presence">
        <div className="presence__copy reveal">
          <p className="kicker">Cobertura</p>
          <h2>Presencia en Colombia</h2>
          <p>Desde nuestra sede en la región Caribe atendemos proyectos en distintas ciudades del país.</p>

          <div className="pstats">
            <div><strong>{PRESENCE.length}</strong><span>ciudades atendidas</span></div>
            <div><strong>{depts.size}</strong><span>departamentos</span></div>
            <div><strong>{counts.proyectos || 0}</strong><span>ciudades con proyectos</span></div>
          </div>

          <div className="legend" role="group" aria-label="Filtrar por tipo de presencia">
            {Object.entries(PRESENCE_TYPES).map(([k, t]) => (
              <button key={k} className={filter === k ? 'is-on' : ''} aria-pressed={filter === k} onClick={() => setFilter(filter === k ? null : k)}>
                <i className={`dot dot--${k}`} />
                {t.label} <b>{counts[k] || 0}</b>
              </button>
            ))}
          </div>

          <ul className="pcities">
            {points.map((p, i) => (
              <li key={p.city} className={visible(p) ? '' : 'is-dim'}>
                <button
                  className={active === i ? 'is-on' : ''}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <i className={`dot dot--${p.type}`} />
                  {p.city}
                  <small>{p.dept}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="pmap reveal" onMouseLeave={() => setHoverDept(null)}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Mapa de Colombia con presencia de SOTEC en ${PRESENCE.map((p) => p.city).join(', ')}`}>
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
            <g>
              {points.map((p, i) => (
                <g
                  key={p.city}
                  transform={`translate(${p.xy[0]} ${p.xy[1]})`}
                  className={`pin pin--${p.type} ${active === i ? 'is-active' : ''} ${visible(p) ? '' : 'is-dim'}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  <circle r={p.type === 'sede' ? 8 : 6} />
                </g>
              ))}
            </g>
          </svg>
          {(cur || hoverInfo) && (
            <div className="pmap__tip">
              {cur ? (
                <>
                  <small>{PRESENCE_TYPES[cur.type].label}</small>
                  <strong>{cur.city}</strong>
                  <span>{cur.text}</span>
                </>
              ) : (
                <>
                  <strong>{hoverInfo.name}</strong>
                  <span>{depts.has(hoverInfo.name) ? PRESENCE.filter((p) => p.dept === hoverInfo.name).map((p) => p.city).join(', ') : 'Atención bajo solicitud'}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
