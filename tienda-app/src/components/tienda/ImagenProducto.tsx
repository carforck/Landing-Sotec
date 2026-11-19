"use client";

import { useTienda } from "@/components/Proveedor";
import { iconoDe } from "@/lib/iconos";
import { urlImagen } from "@/lib/rutas";

/** Foto del producto o, si no tiene, el ícono de su categoría sobre fondo suave (sin texto en imágenes). */
export function ImagenProducto({ src, categoriaId, alt = "", className = "", tamIcono = "h-1/3 w-1/3", eager }: { src?: string; categoriaId?: string; alt?: string; className?: string; tamIcono?: string; eager?: boolean }) {
  const { categorias } = useTienda();
  if (src) return <img src={urlImagen(src)} alt={alt} loading={eager ? "eager" : "lazy"} className={`h-full w-full object-cover ${className}`} />;
  const Icono = iconoDe(categorias.find((c) => c.id === categoriaId)?.icono);
  return (
    <div role={alt ? "img" : undefined} aria-label={alt || undefined} className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-marca-suave to-fondo text-marca-btn ${className}`} data-sin-foto>
      <Icono className={tamIcono} strokeWidth={1.25} aria-hidden />
    </div>
  );
}
