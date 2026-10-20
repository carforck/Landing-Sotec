import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GALLERY, GALLERY_CATS, img } from './data.js';

const INITIAL = 8;

export default function Gallery() {
  const [cat, setCat] = useState('Todos');
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(-1);
  const items = useMemo(() => (cat === 'Todos' ? GALLERY : GALLERY.filter((g) => g.cat === cat)), [cat]);
  const visible = all ? items : items.slice(0, INITIAL);

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
    <section id="galeria" className="section section--soft">
      <div className="container">
        <div className="head reveal">
          <div>
            <p className="kicker">Proyectos</p>
            <h2>Soluciones en campo</h2>
          </div>
          <p>Instalaciones de seguridad, conectividad y energía en hogares, comercios e industria.</p>
        </div>

        <div className="tabs" role="group" aria-label="Filtrar proyectos">
          {GALLERY_CATS.map((c) => (
            <button key={c} className={cat === c ? 'is-on' : ''} aria-pressed={cat === c} onClick={() => { setCat(c); setAll(false); }}>
              {c}
            </button>
          ))}
        </div>

        <div className="gallery" key={cat}>
          {visible.map((g, i) => (
            <button key={g.src} className="gitem" style={{ '--i': i % INITIAL }} onClick={() => setOpen(i)} aria-label={`Ampliar: ${g.title}`}>
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
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={cur.title} onClick={() => setOpen(-1)}>
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
