"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { useTienda } from "@/components/Proveedor";
import { CarruselProductos } from "@/components/tienda/CarruselProductos";
import { filasPortada } from "@/lib/portada";

/**
 * Carruseles de la portada (respetan el segmento elegido): Ofertas, Destacados, Servicios y uno
 * por categoría, solo los que tienen 3 o más ítems. Las demás categorías siguen en la cinta y el catálogo.
 */
export function FilasPorCategoria() {
  const { listo, productos, categorias } = useTienda();
  const s = useSearchParams().get("segmento");
  const segmento = s === "hogar" || s === "empresa" ? s : "";
  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  const filas = useMemo(() => filasPortada(productos, categorias, segmento), [productos, categorias, segmento]);
  if (!listo) return null;
  return (
    <>
      {filas.map((f) => (
        <CarruselProductos key={f.id} id={f.id} titulo={f.titulo} productos={f.productos} verTodo={f.verTodo} nombreCat={nombreCat} />
      ))}
    </>
  );
}
