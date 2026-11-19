"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { useTienda } from "@/components/Proveedor";
import { CarruselProductos } from "@/components/tienda/CarruselProductos";
import { descuento } from "@/lib/formato";

/** Carruseles de la portada (respetan el segmento elegido): Ofertas, Destacados, Servicios y uno por categoría. */
export function FilasPorCategoria() {
  const { listo, productos: todos, categorias } = useTienda();
  const segmento = useSearchParams().get("segmento");
  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  if (!listo) return null;
  const productos = segmento === "hogar" || segmento === "empresa" ? todos.filter((p) => p.segmentos.includes(segmento)) : todos;
  const sufijo = segmento ? `&segmento=${segmento}` : "";
  return (
    <>
      <CarruselProductos id="ofertas" titulo="Ofertas" productos={productos.filter((p) => descuento(p) != null)} nombreCat={nombreCat} />
      <CarruselProductos id="destacados" titulo="Destacados" productos={productos.filter((p) => p.destacado || p.nuevo)} nombreCat={nombreCat} />
      <CarruselProductos id="servicios" titulo="Servicios" productos={productos.filter((p) => p.tipo === "servicio")} verTodo={`/?tipo=servicio${sufijo}#catalogo`} nombreCat={nombreCat} />
      {categorias.map((c) => (
        <CarruselProductos key={c.id} id={c.id} titulo={c.nombre} productos={productos.filter((p) => p.categoriaId === c.id)} verTodo={`/?categoria=${c.id}${sufijo}#catalogo`} nombreCat={nombreCat} />
      ))}
    </>
  );
}
