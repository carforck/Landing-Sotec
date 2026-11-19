"use client";

import Link from "next/link";

import { useTienda } from "@/components/Proveedor";
import { urlImagen } from "@/lib/rutas";

/** Marcas administrables: logo si existe, si no el nombre. Cada una filtra el catálogo. */
export function FranjaMarcas() {
  const { marcas } = useTienda();
  if (!marcas.length) return null;
  return (
    <section aria-labelledby="titulo-marcas" data-franja-marcas>
      <h2 id="titulo-marcas" className="titulo-seccion">Marcas</h2>
      <ul className="mt-5 flex flex-wrap gap-3">
        {marcas.map((m) => (
          <li key={m.id}>
            <Link href={`/?marca=${m.id}#catalogo`} className="flex h-14 min-w-[140px] items-center justify-center rounded-xl border border-linea bg-white px-5 font-titulo text-base font-bold text-tinta shadow-sm hover:border-marca-btn" data-marca={m.id}>
              {m.logo ? <img src={urlImagen(m.logo)} alt={m.nombre} className="max-h-8 w-auto" /> : m.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
