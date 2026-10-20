import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { GALLERY, GALLERY_CATS, img } from './data.js';
import { useInterval } from './fx.js';

const TILES = 7;
// Orden en que cambian los mosaicos, para que no cambien todos a la vez.
const ORDER = [0, 4, 2, 6, 1, 5, 3];

// Mosaico tipo bento: cada recuadro rota sus fotos con fundido y zoom lento.
function Mosaic({ items, onOpen }) {
  const n = items.length;
  const init = () => Array.from({ length: TILES }, (_, k) => k % n);
  const [shown, setShown] = useState(init);
  const [prev, setPrev] = useState(() => Array(TILES).fill(null));
  const tick = useRef(0);
  const paused = useRef(-1);

  useInterval(() => {
    const t = ORDER[tick.current % TILES];
    tick.current += 1;
    if (t === paused.current || n < 2) return;
    setShown((cur) => {
      let j = cur[t];
      // Siguiente foto que no esté visible en otro recuadro (si hay suficientes).
      for (let s = 1; s <= n; s += 1) {
        const cand = (cur[t] + s) % n;
        if (n <= TILES || !cur.includes(cand)) { j = cand; break; }
      }
      setPrev((p) => p.map((v, i) => (i === t ? cur[t] : v)));
      return cur.map((v, i) => (i === t ? j : v));
    });
  }, 1700);

  return (
    <div className="mosaic">
      {shown.map((idx, t) => {
        const g = items[idx];
        const pg = prev[t] != null ? items[prev[t]] : null;
        return (
          <button
            key={t}
            className={`mtile mtile--${t} fx`}
            onClick={() => onOpen(idx)}
            onMouseEnter={() => { paused.current = t; }}
            onMouseLeave={() => { paused.current = -1; }}
            aria-label={`Ampliar: ${g.title}`}
          >
            {pg && pg !== g && <img className="mtile__prev" src={img(pg.src)} alt="" />}
            <img className="mtile__img" key={g.src} src={img(g.src)} alt={g.title} loading="lazy" />
            <span className="mtile__cap">
              <small>{g.cat}</small>
              {g.title}
            </span>
            <span className="gitem__zoom"><Expand size={18} /></span>
            <span className="mtile__timer" key={`t${g.src}`} />
          </button>
        );
      })}
    </div>
  );
}

// Cinta infinita de fotos en dos filas que se desplazan en sentidos opuestos.
function Ribbon({ onOpen }) {
  const half = Math.ceil(GALLERY.length / 2);
  const rows = [GALLERY.slice(0, half), GALLERY.slice(half)];
  return (
    <div className="ribbon" aria-label="Fotos en movimiento">
      {rows.map((row, r) => (
        <div className={`ribbon__row ${r ? 'ribbon__row--rev' : ''}`} key={r}>
          <div className="ribbon__track">
            {[...row, ...row].map((g, i) => (
              <button
                key={`${g.src}-${i}`}
                className="ribbon__item"
                onClick={() => onOpen(GALLERY.indexOf(g), true)}
                aria-hidden={i >= row.length}
                tabIndex={i >= row.length ? -1 : 0}
                aria-label={`Ampliar: ${g.title}`}
              >
                <img src={img(g.src)} alt="" loading="lazy" />
                <span>{g.title}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Gallery() {
  const [cat, setCat] = useState('Todos');
  const [box, setBox] = useState(null); // { list, i }
  const items = useMemo(() => (cat === 'Todos' ? GALLERY : GALLERY.filter((g) => g.cat === cat)), [cat]);

  const openAt = (i, all = false) => setBox({ list: all ? GALLERY : items, i });
  const go = (d) => setBox((b) => ({ ...b, i: (b.i + d + b.list.length) % b.list.length }));

  useEffect(() => {
    if (!box) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setBox(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [box]);

  const cur = box && box.list[box.i];

  return (
    <section id="galeria" className="section gallery-sec">
      <div className="container">
        <div className="section__head reveal">
          <p className="eyebrow">Lo que hacemos</p>
          <h2>Soluciones que se ven en cada instalación</h2>
          <p>Seguridad, conectividad y energía en hogares, comercios e industria.</p>
        </div>

        <div className="gfilters reveal" role="group" aria-label="Filtrar galería">
          {GALLERY_CATS.map((c) => (
            <button key={c} className={cat === c ? 'is-on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>

        <Mosaic items={items} onOpen={openAt} key={cat} />
      </div>

      <Ribbon onOpen={openAt} />

      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={cur.title} onClick={() => setBox(null)}>
          <button className="lightbox__close" aria-label="Cerrar" onClick={() => setBox(null)}><X size={26} /></button>
          <button className="lightbox__nav lightbox__nav--prev" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <ChevronLeft size={28} />
          </button>
          <figure onClick={(e) => e.stopPropagation()} key={cur.src}>
            <img src={img(cur.src)} alt={cur.title} />
            <figcaption><small>{cur.cat}</small>{cur.title}<span>{box.i + 1} / {box.list.length}</span></figcaption>
          </figure>
          <button className="lightbox__nav lightbox__nav--next" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); go(1); }}>
            <ChevronRight size={28} />
          </button>
        </div>
      )}
    </section>
  );
}
