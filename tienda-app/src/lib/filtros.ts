/** Filtros del catálogo (lógica pura, probada en tests/unit). */
import type { Producto, Segmento, TipoItem } from "./tipos";

export interface Filtros {
  categoria?: string;
  tipo?: TipoItem | "";
  segmento?: Segmento | "";
  marca?: string;
  q?: string;
}

export const normalTexto = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lee los filtros de la URL ignorando valores no válidos. */
export function filtrosDeUrl(p: URLSearchParams): Filtros {
  const tipo = p.get("tipo");
  const segmento = p.get("segmento");
  return {
    categoria: p.get("categoria") ?? "",
    tipo: tipo === "producto" || tipo === "servicio" ? tipo : "",
    segmento: segmento === "hogar" || segmento === "empresa" ? segmento : "",
    marca: p.get("marca") ?? "",
    q: p.get("q") ?? "",
  };
}

export function filtrar(productos: Producto[], f: Filtros, nombres: { categoria: Map<string, string>; marca: Map<string, string> }): Producto[] {
  const q = normalTexto((f.q ?? "").trim());
  return productos.filter(
    (p) =>
      (!f.categoria || p.categoriaId === f.categoria) &&
      (!f.tipo || p.tipo === f.tipo) &&
      (!f.segmento || p.segmentos.includes(f.segmento)) &&
      (!f.marca || p.marcaId === f.marca) &&
      (!q || normalTexto(`${p.nombre} ${p.descripcion} ${p.modalidad} ${nombres.categoria.get(p.categoriaId) ?? ""} ${p.marcaId ? nombres.marca.get(p.marcaId) ?? "" : ""}`).includes(q)),
  );
}
