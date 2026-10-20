import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GALLERY, GALLERY_CATS, img } from './data.js';
import { reduced, useFocusTrap } from './fx.js';

const INITIAL = 8;
const CYCLE_MS = 6000; // cambio automático de categoría

// Reparte el mosaico para que no queden huecos con cualquier cantidad de fotos:
// la primera es destacada y las últimas se ensanchan para completar la fila.
function mosaicLayout(count) {
  const rest = count - 1;
  const wide4 = Math.min(rest, (4 - (rest % 4)) % 4); // escritorio: 4 columnas, destacada 2x2
  const left3 = rest % 3; // tablet: 3 columnas, destacada a lo ancho
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return { '--dc': 2, '--dr': 2, '--tc': 3, '--mc': 2 };
    const fromEnd = count - i;
    return {
      '--dc': fromEnd <= wide4 ? 2 : 1,
      '--dr': 1,
      '--tc': fromEnd === 1 && left3 ? 4 - left3 : 1,
      '--mc': fromEnd === 1 && rest % 2 ? 2 : 1,
    };
  });
}

export default function Gallery() {
  const [cat, setCat] = useState('Todos');
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(-1);
  const [auto, setAuto] = useState(true); // se apaga cuando el usuario elige una categoría
  const [hover, setHover] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const secRef = useRef(null);
  const tabsRef = useRef(null);
  const boxRef = useRef(null);
  useFocusTrap(open >= 0, boxRef);

  // En celular las pestañas se desplazan: se centra la activa sin mover la página.
  useEffect(() => {
    const box = tabsRef.current;
    const btn = box?.querySelector('.is-on');
    if (!box || !btn || box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({ left: btn.offsetLeft - (box.clientWidth - btn.offsetWidth) / 2, behavior: 'smooth' });
  }, [cat]);

  // Solo rota mientras la sección está a la vista.
  useEffect(() => {
    const el = secRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const running = auto && onScreen && !hover && open < 0 && !all && !reduced();
  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => {
      setCat((c) => GALLERY_CATS[(GALLERY_CATS.indexOf(c) + 1) % GALLERY_CATS.length]);
    }, CYCLE_MS);
    return () => clearTimeout(id);
  }, [running, cat]);
  const items = useMemo(() => (cat === 'Todos' ? GALLERY : GALLERY.filter((g) => g.cat === cat)), [cat]);
  const visible = all ? items : items.slice(0, INITIAL);
  const layout = mosaicLayout(visible.length);

  const go = (d) => setOpen((i) => (i + d + items.length) % items.length);

  useEffect(() => {
    if (open < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(-1);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [open, items.length]);

  const cur = items[open];

  return (
    <section id="galeria" className="section section--soft" ref={secRef}>
      <div className="container">
        <div className="head reveal">
          <div>
            <p className="kicker">Proyectos</p>
            <h2>Soluciones en campo</h2>
          </div>
          <p>Instalaciones de seguridad, conectividad y energía en hogares, comercios e industria.</p>
        </div>

        <div className="tabs" role="group" aria-label="Filtrar proyectos" ref={tabsRef}>
          {GALLERY_CATS.map((c) => (
            <button key={c} className={cat === c ? 'is-on' : ''} aria-pressed={cat === c} onClick={() => { setCat(c); setAll(false); setAuto(false); }}>
              {c}
              {cat === c && auto && <span className={`tabs__timer ${running ? '' : 'is-paused'}`} key={`${cat}-${running}`} style={{ '--ms': `${CYCLE_MS}ms` }} />}
            </button>
          ))}
        </div>

        <div className="gallery" key={cat} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          {visible.map((g, i) => (
            <button key={g.src} className="gitem" style={{ '--i': i % INITIAL, ...layout[i] }} onClick={() => setOpen(i)} aria-label={`Ampliar: ${g.title}`}>
              <img src={img(g.src)} alt={g.title} loading="lazy" />
              <span className="gitem__cap"><small>{g.cat}</small>{g.title}</span>
            </button>
          ))}
        </div>

        {items.length > INITIAL && (
          <div className="gallery__more">
            <button className="btn btn--outline" onClick={() => setAll(!all)}>
              {all ? 'Ver menos' : `Ver todos (${items.length})`}
            </button>
          </div>
        )}
      </div>

      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={cur.title} onClick={() => setOpen(-1)} ref={boxRef}>
          <button className="lightbox__close" aria-label="Cerrar" onClick={() => setOpen(-1)}><X size={24} /></button>
          <button className="lightbox__nav lightbox__nav--prev" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <ChevronLeft size={26} />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={img(cur.src)} alt={cur.title} />
            <figcaption>{cur.title}<span>{open + 1} / {items.length}</span></figcaption>
          </figure>
          <button className="lightbox__nav lightbox__nav--next" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); go(1); }}>
            <ChevronRight size={26} />
          </button>
        </div>
      )}
    </section>
  );
}
