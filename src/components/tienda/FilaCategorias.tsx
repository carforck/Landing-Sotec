"use client";

import Link from "next/link";

import { useTienda } from "@/components/Proveedor";
import { iconoDe } from "@/lib/iconos";

/** Categorías como íconos circulares (desplazable en móvil). */
export function FilaCategorias() {
  const { categorias } = useTienda();
  if (!categorias.length) return null;
  return (
    <section aria-labelledby="titulo-categorias">
      <h2 id="titulo-categorias" className="titulo-seccion">Compra por categoría</h2>
      <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <ul className="flex w-max gap-2 pb-2 sm:gap-4 lg:w-full lg:justify-between">
          {categorias.map((c) => {
            const Icono = iconoDe(c.icono);
            return (
              <li key={c.id}>
                <Link href={`/?categoria=${c.id}#catalogo`} className="group flex w-[88px] flex-col items-center gap-2 rounded-xl p-1 text-center sm:w-28" data-cat-circulo={c.id}>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-linea bg-fondo text-marca-btn shadow-sm transition-colors group-hover:border-marca-btn group-hover:bg-marca-suave sm:h-20 sm:w-20">
                    <Icono className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-tinta sm:text-sm">{c.nombre}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
