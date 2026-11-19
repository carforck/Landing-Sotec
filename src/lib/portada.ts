/** Carruseles de la portada (lógica pura, probada en tests/unit). */
import { descuento } from "./formato";
import type { Categoria, Producto, Segmento } from "./tipos";

/** Un carrusel solo aparece con al menos 3 ítems visibles (con el segmento activo). */
export const MINIMO_CARRUSEL = 3;

export interface FilaPortada {
  id: string;
  titulo: string;
  productos: Producto[];
  verTodo?: string;
}

export function filasPortada(todos: Producto[], categorias: Categoria[], segmento?: Segmento | "" | null): FilaPortada[] {
  const productos = segmento ? todos.filter((p) => p.segmentos.includes(segmento)) : todos;
  const sufijo = segmento ? `&segmento=${segmento}` : "";
  const filas: FilaPortada[] = [
    { id: "ofertas", titulo: "Ofertas", productos: productos.filter((p) => descuento(p) != null) },
    { id: "destacados", titulo: "Destacados", productos: productos.filter((p) => p.destacado || p.nuevo) },
    { id: "servicios", titulo: "Servicios", productos: productos.filter((p) => p.tipo === "servicio"), verTodo: `/?tipo=servicio${sufijo}#catalogo` },
    ...categorias.map((c) => ({ id: c.id, titulo: c.nombre, productos: productos.filter((p) => p.categoriaId === c.id), verTodo: `/?categoria=${c.id}${sufijo}#catalogo` })),
  ];
  return filas.filter((f) => f.productos.length >= MINIMO_CARRUSEL);
}
