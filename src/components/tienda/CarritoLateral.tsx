"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Send, ShoppingCart, Trash2, X } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { resumen, subtotal } from "@/lib/carrito";
import { formatoCOP, textoPrecio } from "@/lib/formato";
import { urlImagen } from "@/lib/rutas";

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Carrito en panel lateral: foco atrapado, Escape cierra y el foco vuelve al botón del encabezado. */
export function CarritoLateral() {
  const { carritoAbierto, cerrarCarrito, carrito, cambiarCantidad, quitar } = useTienda();
  const panel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const r = resumen(carrito);

  useEffect(() => {
    if (!carritoAbierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-cerrar-carrito]")?.focus();
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrarCarrito();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const xs = [...panel.current.querySelectorAll<HTMLElement>(ENFOCABLES)].filter((x) => x.offsetParent !== null);
      if (!xs.length) return;
      const primero = xs[0];
      const ultimo = xs[xs.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", teclas);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", teclas);
    };
  }, [carritoAbierto, cerrarCarrito]);

  if (!carritoAbierto) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 h-full w-full cursor-default bg-black/40" onClick={cerrarCarrito} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-carrito"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
        data-carrito-lateral
      >
        <div className="flex items-center justify-between border-b border-linea px-4 py-3">
          <h2 id="titulo-carrito" className="flex items-center gap-2 text-lg font-bold">
            <ShoppingCart className="h-5 w-5 text-marca-btn" aria-hidden /> Tu carrito ({r.unidades})
          </h2>
          <button type="button" className="btn px-3 text-tinta hover:bg-fondo" onClick={cerrarCarrito} aria-label="Cerrar carrito" data-cerrar-carrito>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {carrito.length ? (
          <ul className="flex-1 divide-y divide-linea overflow-y-auto px-4">
            {carrito.map((it) => {
              const sub = subtotal(it);
              return (
                <li key={it.productoId} className="flex gap-3 py-3" data-item-lateral={it.productoId}>
                  <img src={urlImagen(it.imagen)} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-tinta">{it.nombre}</p>
                    <p className="text-xs">{textoPrecio(it.precio)}{it.precio != null && " c/u"}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-linea" role="group" aria-label={`Cantidad de ${it.nombre}`}>
                        <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => cambiarCantidad(it.productoId, it.cantidad - 1)} aria-label="Menos">
                          <Minus className="h-4 w-4" aria-hidden />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-tinta" data-cantidad-lateral>{it.cantidad}</span>
                        <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => cambiarCantidad(it.productoId, it.cantidad + 1)} aria-label="Más">
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-tinta">{sub == null ? "A cotizar" : formatoCOP(sub)}</span>
                      <button type="button" className="flex h-11 w-11 items-center justify-center text-tenue hover:text-red-700" onClick={() => quitar(it.productoId)} aria-label={`Quitar ${it.nombre}`}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p>Tu carrito está vacío.</p>
            <button type="button" className="btn-secundario" onClick={cerrarCarrito}>Seguir comprando</button>
          </div>
        )}

        {carrito.length > 0 && (
          <div className="space-y-2 border-t border-linea p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-tinta">Total</span>
              <span className="text-2xl font-extrabold text-tinta" data-total-lateral>{formatoCOP(r.total)}</span>
            </div>
            {r.aCotizar > 0 && <p className="text-xs">+ {r.aCotizar} producto{r.aCotizar === 1 ? "" : "s"} a cotizar (te enviamos el valor por WhatsApp).</p>}
            <button
              type="button"
              className="btn-primario w-full text-base"
              onClick={() => {
                cerrarCarrito();
                router.push("/carrito#datos");
              }}
              data-ir-formulario
            >
              <Send className="h-4 w-4" aria-hidden /> Enviar pedido por WhatsApp
            </button>
            <Link href="/carrito" className="btn-secundario w-full" onClick={cerrarCarrito}>Ver carrito completo</Link>
          </div>
        )}
      </div>
    </div>
  );
}
