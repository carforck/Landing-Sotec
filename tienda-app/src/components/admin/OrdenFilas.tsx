"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, RotateCcw, Save } from "lucide-react";

type Fila = { id: string; orden: number };

const porOrden = <T extends Fila>(xs: T[]) => [...xs].sort((a, b) => a.orden - b.orden);
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Lista editable fila por fila (categorías, marcas, banners): recuerda lo guardado para saber
 * qué fila cambió, guarda una fila sin tocar las demás y reordena con «Subir / Bajar».
 */
export function useFilasOrdenables<T extends Fila>(leer: (() => Promise<T[]>) | null, escribir: ((x: T) => Promise<unknown>) | null) {
  const [filas, setFilas] = useState<T[]>([]);
  const [guardadas, setGuardadas] = useState<Record<string, T>>({});
  const [ocupada, setOcupada] = useState<string | null>(null);
  const guardadasRef = useRef(guardadas);
  guardadasRef.current = guardadas;

  /** Relee la lista; las filas con cambios sin guardar conservan lo escrito. */
  const cargar = useCallback(async () => {
    if (!leer) return;
    const xs = porOrden(await leer());
    const antes = guardadasRef.current;
    setFilas((prev) =>
      xs.map((x) => {
        const p = prev.find((y) => y.id === x.id);
        return p && antes[x.id] && !igual(p, antes[x.id]) ? { ...p, orden: x.orden } : x;
      }),
    );
    setGuardadas(Object.fromEntries(xs.map((x) => [x.id, x])));
  }, [leer]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const editar = (id: string, cambios: Partial<T>) => setFilas((xs) => xs.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
  const cambiada = (id: string) => {
    const x = filas.find((f) => f.id === id);
    return !!x && !!guardadas[id] && !igual(x, guardadas[id]);
  };
  const deshacer = (id: string) => guardadas[id] && setFilas((xs) => xs.map((x) => (x.id === id ? guardadas[id] : x)));
  const hayCambios = filas.some((x) => guardadas[x.id] && !igual(x, guardadas[x.id]));

  /** Guarda una fila (con lo que tenga escrito) sin borrar lo pendiente en las demás. */
  async function guardar(x: T) {
    if (!escribir) return;
    setOcupada(x.id);
    try {
      await escribir(x);
      setGuardadas((g) => ({ ...g, [x.id]: x }));
      setFilas((xs) => xs.map((y) => (y.id === x.id ? x : y)));
    } finally {
      setOcupada(null);
    }
  }

  /**
   * Mueve la fila un puesto (-1 sube, +1 baja) dentro de `grupo` (por defecto, todas) y renumera
   * 1, 2, 3…; solo guarda las filas cuyo orden cambió, con su versión guardada (no lo pendiente).
   */
  async function mover(id: string, dir: -1 | 1, grupo?: (x: T) => boolean) {
    if (!escribir) return;
    const lista = porOrden(filas).filter((x) => !grupo || grupo(x));
    const i = lista.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    const base = Math.min(...lista.map((x) => x.orden), 1);
    const nuevos = new Map(lista.map((x, k) => [x.id, base + k]));
    const cambian = lista.filter((x) => x.orden !== nuevos.get(x.id));
    setOcupada(id);
    try {
      for (const x of cambian) await escribir({ ...(guardadas[x.id] ?? x), orden: nuevos.get(x.id)! });
      setGuardadas((g) => {
        const n = { ...g };
        for (const x of cambian) n[x.id] = { ...(g[x.id] ?? x), orden: nuevos.get(x.id)! };
        return n;
      });
      setFilas((xs) => porOrden(xs.map((x) => (nuevos.has(x.id) ? { ...x, orden: nuevos.get(x.id)! } : x))));
    } finally {
      setOcupada(null);
    }
  }

  // Avisa antes de salir de la página si quedó algo sin guardar
  useEffect(() => {
    if (!hayCambios) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [hayCambios]);

  return { filas, setFilas, cargar, editar, cambiada, deshacer, guardar, mover, ocupada, hayCambios };
}

/** Flechas «Subir / Bajar» para cambiar la posición de una fila. */
export function BotonesOrden({ nombre, primero, ultimo, alMover, disabled }: { nombre: string; primero: boolean; ultimo: boolean; alMover: (dir: -1 | 1) => void; disabled?: boolean }) {
  const clase = "btn-secundario h-11 w-11 px-0";
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Posición de ${nombre}`}>
      <button type="button" className={clase} disabled={disabled || primero} onClick={() => alMover(-1)} aria-label={`Subir ${nombre}`} title="Subir (sale antes)">
        <ArrowUp className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" className={clase} disabled={disabled || ultimo} onClick={() => alMover(1)} aria-label={`Bajar ${nombre}`} title="Bajar (sale después)">
        <ArrowDown className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** Franja que aparece solo cuando la fila tiene cambios sin guardar. */
export function BarraCambios({ nombre, guardando, alDeshacer }: { nombre: string; guardando: boolean; alDeshacer: () => void }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900" data-cambios-pendientes>
      <span className="flex-1 font-semibold">Tienes cambios sin guardar.</span>
      <button type="button" className="btn px-3 text-amber-900 hover:bg-amber-100" onClick={alDeshacer} disabled={guardando}>
        <RotateCcw className="h-4 w-4" aria-hidden /> Deshacer
      </button>
      <button type="submit" className="btn-primario" disabled={guardando} aria-label={`Guardar cambios de ${nombre}`}>
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Guardar cambios
      </button>
    </div>
  );
}
