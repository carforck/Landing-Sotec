"use client";

import { useMemo } from "react";

import { useTienda } from "@/components/Proveedor";
import { CarruselProductos } from "@/components/tienda/CarruselProductos";

/** Carruseles de la portada: Destacados y uno por cada categoría con productos. */
export function FilasPorCategoria() {
  const { listo, productos, categorias } = useTienda();
  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  if (!listo) return null;
  const destacados = productos.filter((p) => p.destacado || p.nuevo);
  return (
    <>
      <CarruselProductos id="destacados" titulo="Destacados" productos={destacados} nombreCat={nombreCat} />
      {categorias.map((c) => (
        <CarruselProductos key={c.id} id={c.id} titulo={c.nombre} productos={productos.filter((p) => p.categoriaId === c.id)} verTodo={`/?categoria=${c.id}#catalogo`} nombreCat={nombreCat} />
      ))}
    </>
  );
}
