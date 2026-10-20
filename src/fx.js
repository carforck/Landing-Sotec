import { useEffect, useRef } from 'react';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useInterval(cb, ms, active = true) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    if (!active || reduced()) return undefined;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}
