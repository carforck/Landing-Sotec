"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { iconoDe } from "@/lib/iconos";
import { urlImagen } from "@/lib/rutas";
import type { Categoria } from "@/lib/tipos";

/** px por segundo de la cinta: ~35–45 s por vuelta con 8 categorías. */
const VELOCIDAD = 40;

function Tarjeta({ c, copia }: { c: Categoria; copia?: boolean }) {
  const Icono = iconoDe(c.icono);
  return (
    <li className="w-40 shrink-0 sm:w-48">
      <Link
        href={`/?categoria=${c.id}#catalogo`}
        tabIndex={copia ? -1 : undefined}
        className="tarjeta group flex h-full flex-col overflow-hidden hover:border-marca-btn"
        data-cat-tarjeta={copia ? undefined : c.id}
      >
        <span className="relative block aspect-[4/3] overflow-hidden bg-fondo">
          {c.imagen ? (
            <img src={urlImagen(c.imagen)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-marca-suave to-fondo text-marca-btn" data-cat-icono={copia ? undefined : ""}>
              <Icono className="h-12 w-12" strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </span>
        <span className="flex flex-1 items-center gap-2 p-3">
          <Icono className="h-4 w-4 shrink-0 text-marca-btn" aria-hidden />
          <span className="text-sm font-semibold leading-tight text-tinta">{c.nombre}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Categorías como tarjetas con foto (o ícono) en una cinta que se desplaza sola en bucle.
 * Accesible: se pausa con hover, foco, toque o el botón; la copia del bucle es aria-hidden e inert;
 * con «reducir movimiento» o si no llenan el ancho, no se anima.
 */
export function FilaCategorias() {
  const { categorias } = useTienda();
  const marco = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const copia = useRef<HTMLUListElement>(null);
  const [anchoLista, setAnchoLista] = useState(0);
  const [cabe, setCabe] = useState(true);
  const [reducido, setReducido] = useState(false);
  const [pausaBoton, setPausaBoton] = useState(false);
  const [pausaToque, setPausaToque] = useState(false);
  const toque = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducido(m.matches);
    const f = () => setReducido(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    const medir = () => {
      if (!marco.current || !lista.current) return;
      const w = lista.current.scrollWidth;
      setAnchoLista(w);
      setCabe(w <= marco.current.clientWidth + 1);
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (marco.current) ro.observe(marco.current);
    if (lista.current) ro.observe(lista.current);
    return () => ro.disconnect();
  }, [categorias.length]);

  const animar = !reducido && !cabe && categorias.length > 1;

  // La copia del bucle no se puede enfocar ni la leen los lectores de pantalla
  useEffect(() => {
    copia.current?.setAttribute("inert", "");
  }, [animar]);

  useEffect(() => () => clearTimeout(toque.current), []);

  if (!categorias.length) return null;
  const pausada = pausaBoton || pausaToque;
  const duracion = Math.min(60, Math.max(30, anchoLista / VELOCIDAD));

  return (
    <section aria-labelledby="titulo-categorias" id="categorias" className="scroll-mt-32">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-categorias" className="titulo-seccion">Compra por categoría</h2>
        {animar && (
          <button
            type="button"
            onClick={() => setPausaBoton((x) => !x)}
            aria-pressed={pausaBoton}
            aria-label={pausaBoton ? "Reanudar el movimiento de las categorías" : "Pausar el movimiento de las categorías"}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-linea bg-white text-tinta hover:bg-fondo"
            data-pausa-categorias
          >
            {pausaBoton ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
          </button>
        )}
      </div>
      <div
        ref={marco}
        className={`cinta mt-5 ${animar ? "cinta-animada overflow-hidden" : "-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"} ${animar && pausada ? "cinta-pausada" : ""}`}
        onTouchStart={() => {
          clearTimeout(toque.current);
          setPausaToque(true);
        }}
        onTouchEnd={() => {
          // Reanuda unos segundos después de soltar, para poder tocar una categoría
          toque.current = setTimeout(() => setPausaToque(false), 3000);
        }}
        data-cinta={animar ? "animada" : "quieta"}
      >
        <div className={`flex w-max ${animar ? "cinta-pista" : cabe ? "mx-auto" : ""}`} style={animar ? { animationDuration: `${duracion}s` } : undefined} data-cinta-pista>
          <ul ref={lista} className={`flex shrink-0 gap-3 sm:gap-4 ${animar ? "pr-3 sm:pr-4" : "pb-2"}`}>
            {categorias.map((c) => (
              <Tarjeta key={c.id} c={c} />
            ))}
          </ul>
          {animar && (
            <ul ref={copia} aria-hidden="true" className="flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4" data-cinta-copia>
              {categorias.map((c) => (
                <Tarjeta key={c.id} c={c} copia />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
