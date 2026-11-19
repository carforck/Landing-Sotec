"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { formatoCOP } from "@/lib/formato";
import { urlImagen } from "@/lib/rutas";
import type { Producto } from "@/lib/tipos";

export function Etiquetas({ producto }: { producto: Producto }) {
  return (
    <div className="flex flex-wrap gap-1">
      {producto.destacado && <span className="rounded-md bg-marca-btn px-2 py-0.5 text-xs font-bold text-white">Más vendido</span>}
      {producto.nuevo && <span className="rounded-md bg-sky-700 px-2 py-0.5 text-xs font-bold text-white">Nuevo</span>}
      {producto.precio == null && <span className="rounded-md bg-tinta px-2 py-0.5 text-xs font-bold text-white">Precio a cotizar</span>}
    </div>
  );
}

export function TarjetaProducto({ producto, categoria }: { producto: Producto; categoria?: string }) {
  const { agregar } = useTienda();
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (!agregado) return;
    const t = setTimeout(() => setAgregado(false), 1600);
    return () => clearTimeout(t);
  }, [agregado]);

  return (
    <article className="tarjeta group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md" data-producto={producto.id}>
      <Link href={`/producto/${producto.id}`} className="relative block aspect-square overflow-hidden bg-fondo" tabIndex={-1} aria-hidden>
        <img src={urlImagen(producto.imagenes[0])} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-2 right-2 top-2">
          <Etiquetas producto={producto} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {producto.precio == null ? (
          <p className="text-base font-bold text-tenue sm:text-lg">Precio a cotizar</p>
        ) : (
          <p className="text-xl font-extrabold tracking-tight text-tinta sm:text-2xl" data-precio>{formatoCOP(producto.precio)}</p>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-texto">
          <Link href={`/producto/${producto.id}`} className="hover:text-tinta hover:underline">
            {producto.nombre}
          </Link>
        </h3>
        {categoria && <p className="mt-1 text-xs text-tenue">{categoria}</p>}
        <div className="min-h-3 flex-1 sm:min-h-4" />
        <button
          type="button"
          className={`btn mt-auto w-full px-2 ${agregado ? "bg-marca-suave text-marca-oscuro" : "bg-marca-btn text-white hover:bg-marca-oscuro"}`}
          onClick={() => {
            agregar(producto);
            setAgregado(true);
          }}
          aria-label={agregado ? `${producto.nombre} agregado al carrito` : `Agregar ${producto.nombre} al carrito`}
          data-agregar
        >
          {agregado ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {agregado ? "¡Agregado!" : "Agregar"}
        </button>
      </div>
    </article>
  );
}
