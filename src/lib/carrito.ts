/** Lógica pura del carrito (sin React ni almacenamiento): se prueba en tests/unit. */
import type { ItemCarrito, Producto } from "./tipos";

export const CANTIDAD_MAXIMA = 999;
export const ITEMS_MAXIMOS = 50;

const acotar = (n: number) => Math.min(CANTIDAD_MAXIMA, Math.max(1, Math.floor(Number.isFinite(n) ? n : 1)));

export function agregar(items: ItemCarrito[], p: Pick<Producto, "id" | "nombre" | "precio" | "imagenes">, cantidad = 1): ItemCarrito[] {
  const i = items.findIndex((x) => x.productoId === p.id);
  if (i >= 0) return items.map((x, k) => (k === i ? { ...x, cantidad: acotar(x.cantidad + cantidad) } : x));
  if (items.length >= ITEMS_MAXIMOS) return items;
  return [...items, { productoId: p.id, nombre: p.nombre, precio: p.precio, imagen: p.imagenes[0] ?? "", cantidad: acotar(cantidad) }];
}

export function cambiarCantidad(items: ItemCarrito[], productoId: string, cantidad: number): ItemCarrito[] {
  if (cantidad <= 0) return quitar(items, productoId);
  return items.map((x) => (x.productoId === productoId ? { ...x, cantidad: acotar(cantidad) } : x));
}

export function quitar(items: ItemCarrito[], productoId: string): ItemCarrito[] {
  return items.filter((x) => x.productoId !== productoId);
}

export function subtotal(item: ItemCarrito): number | null {
  return item.precio == null ? null : item.precio * item.cantidad;
}

export function resumen(items: ItemCarrito[]) {
  const unidades = items.reduce((s, x) => s + x.cantidad, 0);
  const total = items.reduce((s, x) => s + (subtotal(x) ?? 0), 0);
  const aCotizar = items.filter((x) => x.precio == null).length;
  return { unidades, total, aCotizar, referencias: items.length };
}

/** Actualiza nombre, precio e imagen con el catálogo vigente y quita lo que ya no existe o está inactivo. */
export function sincronizar(items: ItemCarrito[], catalogo: Producto[]): ItemCarrito[] {
  const porId = new Map(catalogo.filter((p) => p.activo).map((p) => [p.id, p]));
  return items.flatMap((x) => {
    const p = porId.get(x.productoId);
    return p ? [{ ...x, nombre: p.nombre, precio: p.precio, imagen: p.imagenes[0] ?? "" }] : [];
  });
}

/** Lee un carrito guardado tolerando datos dañados. */
export function leerCarrito(raw: string | null): ItemCarrito[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is ItemCarrito => !!x && typeof x === "object" && typeof (x as ItemCarrito).productoId === "string" && typeof (x as ItemCarrito).nombre === "string")
      .map((x) => ({ ...x, cantidad: acotar(Number(x.cantidad)), precio: typeof x.precio === "number" && x.precio >= 0 ? x.precio : null }))
      .slice(0, ITEMS_MAXIMOS);
  } catch {
    return [];
  }
}
