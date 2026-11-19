"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { textoPrecio } from "@/lib/formato";
import { urlImagen } from "@/lib/rutas";
import type { Producto } from "@/lib/tipos";

export function TarjetaProducto({ producto, categoria }: { producto: Producto; categoria?: string }) {
  const { agregar } = useTienda();
  return (
    <article className="tarjeta flex flex-col overflow-hidden" data-producto={producto.id}>
      <Link href={`/producto/${producto.id}`} className="group block aspect-[4/3] overflow-hidden bg-fondo">
        <img
          src={urlImagen(producto.imagenes[0])}
          alt={producto.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {categoria && <p className="text-xs font-semibold uppercase tracking-wide text-marca-oscuro">{categoria}</p>}
        <h3 className="mt-1 text-base font-bold leading-snug">
          <Link href={`/producto/${producto.id}`} className="hover:underline">
            {producto.nombre}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm">{producto.descripcion}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className={producto.precio == null ? "text-sm font-semibold text-tenue" : "text-lg font-bold text-tinta"}>{textoPrecio(producto.precio)}</p>
          <button type="button" className="btn-primario px-3" onClick={() => agregar(producto)} aria-label={`Agregar ${producto.nombre} al carrito`}>
            <Plus className="h-4 w-4" aria-hidden /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
