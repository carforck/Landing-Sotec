import { useEffect, useRef, useState } from 'react';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useInterval(cb, ms, active = true) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    if (!active || reduced()) return undefined;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}

export function useInView(threshold = 0.25) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

export function useCountUp(target, start, duration = 1400) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (!start) return undefined;
    if (reduced()) { current.current = target; setValue(target); return undefined; }
    // Anima desde el valor actual, así las cifras también se mueven al cambiar el filtro.
    const from = current.current;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const v = Math.round(from + (target - from) * (1 - (1 - p) ** 3));
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return value;
}

// Mantiene el foco del teclado dentro de `ref` mientras `active` sea verdadero y lo devuelve al cerrar.
export function useFocusTrap(active, ref, onEscape) {
  const esc = useRef(onEscape);
  esc.current = onEscape;
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return undefined;
    const prev = document.activeElement;
    const sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const items = () => [...el.querySelectorAll(sel)].filter((x) => x.getClientRects().length);
    const onKey = (e) => {
      if (e.key === 'Escape' && esc.current) { esc.current(); return; }
      if (e.key !== 'Tab') return;
      const f = items();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
    };
  }, [active]);
}

// Índice de la tarjeta visible en un carrusel con scroll-snap (para los puntos indicadores).
export function useSnapIndex(ref) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onScroll = () => {
      const first = el.firstElementChild;
      if (!first) return;
      const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || 0);
      setIndex(Math.round(el.scrollLeft / step));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const go = (i) => {
    const el = ref.current;
    const child = el?.children[i];
    if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || 0), behavior: 'smooth' });
  };
  return [index, go];
}
