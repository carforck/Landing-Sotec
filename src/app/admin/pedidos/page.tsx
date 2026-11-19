"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { subtotal } from "@/lib/carrito";
import { ErrorDatos } from "@/lib/datos";
import { fechaCorta, formatoCOP, textoPrecio } from "@/lib/formato";
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO, type EstadoPedido, type Pedido } from "@/lib/tipos";
import { enlaceWhatsApp } from "@/lib/whatsapp";

const COLOR: Record<EstadoPedido, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  contactado: "bg-sky-100 text-sky-900",
  cotizado: "bg-violet-100 text-violet-900",
  vendido: "bg-green-100 text-green-900",
  cancelado: "bg-gray-200 text-gray-800",
};

export default function Pedidos() {
  const { repo } = useTienda();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<EstadoPedido | "">("");
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (repo) setPedidos(await repo.pedidos());
  }, [repo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function estado(p: Pedido, e: EstadoPedido) {
    if (!repo) return;
    try {
      await repo.cambiarEstadoPedido(p.id, e);
      await cargar();
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo cambiar el estado.");
    }
  }

  const visibles = pedidos.filter((p) => !filtro || p.estado === filtro);

  return (
    <>
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {(["", ...ESTADOS_PEDIDO] as const).map((e) => (
          <button key={e || "todos"} type="button" aria-pressed={filtro === e} onClick={() => setFiltro(e)} className={`btn rounded-full border ${filtro === e ? "border-marca-btn bg-marca-btn text-white" : "border-linea bg-white text-tinta"}`}>
            {e ? ETIQUETA_ESTADO[e] : "Todos"} ({e ? pedidos.filter((p) => p.estado === e).length : pedidos.length})
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!visibles.length && <p className="tarjeta p-6 text-center text-sm">No hay pedidos{filtro ? " en este estado" : ""}.</p>}
      <ul className="space-y-3">
        {visibles.map((p) => (
          <li key={p.id} className="tarjeta" data-pedido={p.codigo}>
            <details>
              <summary className="flex min-h-[44px] cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                <span>
                  <strong className="text-tinta">{p.codigo}</strong> · {p.cliente.nombre} · {p.cliente.ciudad}
                  <span className="block text-xs">{fechaCorta(p.creado)} · {p.items.length} producto(s)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-tinta">{formatoCOP(p.total)}{p.conItemsACotizar && " + a cotizar"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR[p.estado]}`} data-estado>{ETIQUETA_ESTADO[p.estado]}</span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-linea p-4 text-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left">
                    <thead>
                      <tr className="text-xs uppercase text-tenue"><th className="py-1">Producto</th><th>Cant.</th><th>Unitario</th><th className="text-right">Subtotal</th></tr>
                    </thead>
                    <tbody>
                      {p.items.map((it) => (
                        <tr key={it.productoId} className="border-t border-linea">
                          <td className="py-1.5 text-tinta">{it.nombre}</td>
                          <td>{it.cantidad}</td>
                          <td>{textoPrecio(it.precio)}</td>
                          <td className="text-right">{subtotal(it) == null ? "A cotizar" : formatoCOP(subtotal(it) ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  <strong className="text-tinta">Cliente:</strong> {p.cliente.nombre} · {p.cliente.celular} · {p.cliente.ciudad}
                  {p.cliente.correo && ` · ${p.cliente.correo}`}
                </p>
                {p.cliente.nota && <p><strong className="text-tinta">Nota:</strong> {p.cliente.nota}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`e-${p.id}`} className="font-semibold text-tinta">Estado</label>
                  <select id={`e-${p.id}`} className="campo w-auto" value={p.estado} onChange={(e) => void estado(p, e.target.value as EstadoPedido)} data-cambiar-estado>
                    {ESTADOS_PEDIDO.map((e) => (
                      <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>
                    ))}
                  </select>
                  <a className="btn-secundario" target="_blank" rel="noopener noreferrer" href={enlaceWhatsApp(p.cliente.celular, `Hola ${p.cliente.nombre}, te escribimos de SOTEC por tu pedido ${p.codigo} de la tienda virtual.`)}>
                    <MessageCircle className="h-4 w-4" aria-hidden /> Escribir al cliente
                  </a>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
