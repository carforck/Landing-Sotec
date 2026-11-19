import type { Producto, TipoItem } from "./tipos";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** «$ 1.250.000» (pesos colombianos sin decimales). */
export function formatoCOP(valor: number): string {
  return cop.format(Math.round(valor)).replace(/ /g, " ");
}

/** Precio para mostrar según el tipo: «$ X» / «Precio a cotizar» (producto) o «Desde $ X» / «A cotizar» (servicio). */
export function textoPrecio(precio: number | null, tipo: TipoItem = "producto"): string {
  if (tipo === "servicio") return precio == null ? "A cotizar" : `Desde ${formatoCOP(precio)}`;
  return precio == null ? "Precio a cotizar" : formatoCOP(precio);
}

/** Descuento entero en % si hay oferta válida (precio anterior mayor que el precio); si no, null. */
export function descuento(p: Pick<Producto, "precio" | "precioAnterior">): number | null {
  if (p.precio == null || p.precioAnterior == null || p.precioAnterior <= p.precio || p.precioAnterior <= 0) return null;
  const d = Math.round((1 - p.precio / p.precioAnterior) * 100);
  return d >= 1 ? d : null;
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
}
