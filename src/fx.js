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
