"use client";

import { EyeOff, Plus } from "lucide-react";

import { ImagenProducto } from "@/components/tienda/ImagenProducto";
import { Etiquetas, Precio } from "@/components/tienda/Precio";
import type { Producto } from "@/lib/tipos";

/**
 * Vista previa fiel a la tarjeta de la tienda (misma foto, etiquetas y precio), pero sin enlaces
 * ni botón real: no agrega al carrito ni navega.
 */
export function ProductoVistaPrevia({ producto, marca, categoria }: { producto: Producto; marca?: string; categoria?: string }) {
  const servicio = producto.tipo === "servicio";
  const detalle = servicio && producto.modalidad ? producto.modalidad : [marca, categoria].filter(Boolean).join(" · ");
  return (
    <div>
      <div className="relative mx-auto max-w-[260px]" aria-hidden>
        <div className={`tarjeta flex flex-col overflow-hidden ${producto.activo ? "" : "opacity-60"}`}>
          <div className="relative aspect-square overflow-hidden bg-fondo">
            <ImagenProducto src={producto.imagenes[0]} categoriaId={producto.categoriaId} />
            <div className="absolute left-2 right-2 top-2">
              <Etiquetas producto={producto} />
            </div>
          </div>
          <div className="flex flex-1 flex-col p-3 sm:p-4">
            <Precio producto={producto} />
            <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-texto">{producto.nombre.trim() || <span className="italic text-tenue">Nombre del producto</span>}</p>
            {detalle && <p className="mt-1 line-clamp-1 text-xs text-tenue">{detalle}</p>}
            <div className="min-h-3" />
            <span className={`btn w-full px-2 ${servicio ? "border-2 border-marca-btn bg-white text-marca-oscuro" : "bg-marca-btn text-white"}`}>
              <Plus className="h-4 w-4" /> {servicio ? "Solicitar" : "Agregar"}
            </span>
          </div>
        </div>
      </div>
      {!producto.activo && (
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs font-semibold text-tenue">
          <EyeOff className="h-3.5 w-3.5" aria-hidden /> Oculto: los clientes no lo ven.
        </p>
      )}
      {!producto.segmentos.length && <p className="mt-1 text-center text-xs font-semibold text-red-700">Falta elegir para quién es: Hogar, Empresas o ambos.</p>}
    </div>
  );
}
