"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ImagenProducto } from "@/components/tienda/ImagenProducto";
import { Etiquetas, Precio } from "@/components/tienda/Precio";
import type { Producto } from "@/lib/tipos";

export { Etiquetas };

export function TarjetaProducto({ producto, categoria }: { producto: Producto; categoria?: string }) {
  const { agregar, marcas } = useTienda();
  const [agregado, setAgregado] = useState(false);
  const servicio = producto.tipo === "servicio";
  const marca = producto.marcaId ? marcas.find((m) => m.id === producto.marcaId)?.nombre : undefined;

  useEffect(() => {
    if (!agregado) return;
    const t = setTimeout(() => setAgregado(false), 1600);
    return () => clearTimeout(t);
  }, [agregado]);

  return (
    <article className="tarjeta group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md" data-producto={producto.id} data-tipo={producto.tipo}>
      <Link href={`/producto/${producto.id}`} className="relative block aspect-square overflow-hidden bg-fondo" tabIndex={-1} aria-hidden>
        <ImagenProducto src={producto.imagenes[0]} categoriaId={producto.categoriaId} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-2 right-2 top-2">
          <Etiquetas producto={producto} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Precio producto={producto} />
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-texto">
          <Link href={`/producto/${producto.id}`} className="hover:text-tinta hover:underline">
            {producto.nombre}
          </Link>
        </h3>
        {(servicio && producto.modalidad) || marca || categoria ? (
          <p className="mt-1 line-clamp-1 text-xs text-tenue">{servicio && producto.modalidad ? producto.modalidad : [marca, categoria].filter(Boolean).join(" · ")}</p>
        ) : null}
        <div className="min-h-3 flex-1 sm:min-h-4" />
        <button
          type="button"
          className={`btn w-full px-2 ${agregado ? "bg-marca-suave text-marca-oscuro" : servicio ? "border-2 border-marca-btn bg-white text-marca-oscuro hover:bg-marca-suave" : "bg-marca-btn text-white hover:bg-marca-oscuro"}`}
          onClick={() => {
            agregar(producto);
            setAgregado(true);
          }}
          aria-label={agregado ? `${producto.nombre} agregado al carrito` : `${servicio ? "Solicitar" : "Agregar"} ${producto.nombre}`}
          data-agregar
        >
          {agregado ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {agregado ? "¡Agregado!" : servicio ? "Solicitar" : "Agregar"}
        </button>
      </div>
    </article>
  );
}
