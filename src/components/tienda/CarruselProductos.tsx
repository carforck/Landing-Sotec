"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";
import type { Producto } from "@/lib/tipos";

/** Fila horizontal de productos con desplazamiento por botones, teclado o gesto. */
export function CarruselProductos({ id, titulo, productos, verTodo, nombreCat }: { id: string; titulo: string; productos: Producto[]; verTodo?: string; nombreCat: Map<string, string> }) {
  const pista = useRef<HTMLUListElement>(null);
  if (!productos.length) return null;
  const mover = (dir: 1 | -1) => pista.current?.scrollBy({ left: dir * pista.current.clientWidth * 0.9, behavior: "smooth" });

  return (
    <section aria-labelledby={`fila-${id}`} data-fila={id}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={`fila-${id}`} className="titulo-seccion">{titulo}</h2>
        <div className="flex items-center gap-1">
          {verTodo && (
            <Link href={verTodo} className="btn px-2 text-sm text-marca-oscuro hover:underline">Ver todo</Link>
          )}
          <button type="button" className="btn-secundario hidden w-11 px-0 sm:flex" onClick={() => mover(-1)} aria-label={`${titulo}: anteriores`}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" className="btn-secundario hidden w-11 px-0 sm:flex" onClick={() => mover(1)} aria-label={`${titulo}: siguientes`}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      <ul ref={pista} className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-3 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0" aria-label={titulo}>
        {productos.map((p) => (
          <li key={p.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-3rem)/4)] 2xl:w-[calc((100%-4rem)/5)]">
            <TarjetaProducto producto={p} categoria={nombreCat.get(p.categoriaId)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
