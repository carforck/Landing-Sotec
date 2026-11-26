"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, MessageCircle, Search, X } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { subtotal } from "@/lib/carrito";
import { ErrorDatos } from "@/lib/datos";
import { fechaCorta, formatoCOP, textoPrecio } from "@/lib/formato";
import { ESTADOS_PEDIDO, ETIQUETA_ESTADO, ETIQUETA_SEGMENTO, type EstadoPedido, type Pedido } from "@/lib/tipos";
import { enlaceWhatsApp } from "@/lib/whatsapp";

const COLOR: Record<EstadoPedido, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  contactado: "bg-sky-100 text-sky-900",
  cotizado: "bg-violet-100 text-violet-900",
  vendido: "bg-green-100 text-green-900",
  cancelado: "bg-gray-200 text-gray-800",
};

/** Siguiente paso habitual de cada estado (botón rápido); los demás cambios, con la lista. */
const SIGUIENTE: Partial<Record<EstadoPedido, { estado: EstadoPedido; texto: string }>> = {
  pendiente: { estado: "contactado", texto: "Marcar como contactado" },
  contactado: { estado: "cotizado", texto: "Marcar como cotizado" },
  cotizado: { estado: "vendido", texto: "Marcar como vendido" },
};

/** «hace 5 minutos», «hace 3 horas», «hace 2 días». */
function haceCuanto(iso: string, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} minuto${min === 1 ? "" : "s"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} hora${h === 1 ? "" : "s"}`;
  const d = Math.floor(h / 24);
  if (d < 31) return `hace ${d} día${d === 1 ? "" : "s"}`;
  const m = Math.floor(d / 30);
  return `hace ${m} mes${m === 1 ? "" : "es"}`;
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function coincide(p: Pedido, q: string): boolean {
  const t = sinTildes(q.trim());
  if (!t) return true;
  const digitos = t.replace(/\D/g, "");
  if (digitos.length >= 3 && p.cliente.celular.replace(/\D/g, "").includes(digitos)) return true;
  return [p.codigo, p.cliente.nombre, p.cliente.empresa ?? "", p.cliente.ciudad].some((x) => sinTildes(x).includes(t));
}

export default function Pedidos() {
  const { repo, avisar } = useTienda();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<EstadoPedido | "">("");
  const [buscar, setBuscar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  // Refresca «hace X minutos» cada minuto
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const cargar = useCallback(async () => {
    if (repo) setPedidos(await repo.pedidos());
  }, [repo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function estado(p: Pedido, e: EstadoPedido) {
    if (!repo || e === p.estado) return;
    setError(null);
    setCambiando(p.id);
    try {
      await repo.cambiarEstadoPedido(p.id, e);
      await cargar();
      avisar(`Pedido ${p.codigo}: ${ETIQUETA_ESTADO[e]}.`);
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo cambiar el estado. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCambiando(null);
    }
  }

  const encontrados = pedidos.filter((p) => coincide(p, buscar));
  const visibles = encontrados.filter((p) => !filtro || p.estado === filtro);

  return (
    <>
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <p className="text-sm">Cada pedido que un cliente envía por WhatsApp queda aquí. Ábrelo para ver el detalle, escribirle al cliente y marcar en qué va.</p>
      <div className="relative max-w-md">
        <label htmlFor="buscar-pedido" className="sr-only">Buscar pedido</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" aria-hidden />
        <input id="buscar-pedido" type="search" className="campo pl-9 pr-11" placeholder="Buscar por código, nombre o celular" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        {buscar && (
          <button type="button" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-tenue hover:text-tinta" onClick={() => setBuscar("")} aria-label="Borrar búsqueda">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {(["", ...ESTADOS_PEDIDO] as const).map((e) => (
          <button key={e || "todos"} type="button" aria-pressed={filtro === e} onClick={() => setFiltro(e)} className={`btn rounded-full border ${filtro === e ? "border-marca-btn bg-marca-btn text-white" : "border-linea bg-white text-tinta"}`}>
            {e ? ETIQUETA_ESTADO[e] : "Todos"} ({e ? encontrados.filter((p) => p.estado === e).length : encontrados.length})
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!visibles.length && <p className="tarjeta p-6 text-center text-sm">{buscar.trim() ? `Ningún pedido coincide con «${buscar.trim()}»${filtro ? " en este estado" : ""}.` : `No hay pedidos${filtro ? " en este estado" : ""}.`}</p>}
      <ul className="space-y-3">
        {visibles.map((p) => (
          <li key={p.id} className="tarjeta" data-pedido={p.codigo}>
            <details>
              <summary className="flex min-h-[44px] cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                <span>
                  <strong className="text-tinta">{p.codigo}</strong> · {p.cliente.nombre} · {p.cliente.ciudad}
                  {p.cliente.segmento && <span className="ml-2 rounded-full bg-fondo px-2 py-0.5 text-xs font-semibold text-tinta" data-segmento-pedido>{ETIQUETA_SEGMENTO[p.cliente.segmento]}</span>}
                  <span className="block text-xs">
                    <time dateTime={p.creado} title={fechaCorta(p.creado)} className={p.estado === "pendiente" && ahora - new Date(p.creado).getTime() > 86400000 ? "font-semibold text-amber-800" : ""}>
                      {haceCuanto(p.creado, ahora)}
                    </time>{" "}
                    · {fechaCorta(p.creado)} · {p.items.length} producto(s) · {p.cliente.celular}
                  </span>
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
                          <td className="py-1.5 text-tinta">
                            {it.tipo === "servicio" && <span className="mr-1 rounded bg-violet-700 px-1 text-[11px] font-bold text-white">Servicio</span>}
                            {it.nombre}{it.modalidad ? ` (${it.modalidad})` : ""}
                          </td>
                          <td>{it.cantidad}</td>
                          <td>{textoPrecio(it.precio, it.tipo)}</td>
                          <td className="text-right">{subtotal(it) != null ? formatoCOP(subtotal(it) ?? 0) : it.tipo === "servicio" ? "Se cotiza" : "A cotizar"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  <strong className="text-tinta">Cliente:</strong> {p.cliente.nombre}{p.cliente.empresa ? ` (${p.cliente.empresa})` : ""} · {p.cliente.celular} · {p.cliente.ciudad}
                  {p.cliente.correo && ` · ${p.cliente.correo}`}
                </p>
                {p.cliente.nota && <p><strong className="text-tinta">Nota:</strong> {p.cliente.nota}</p>}
                <div className="flex flex-wrap items-center gap-2 border-t border-linea pt-3">
                  <a className="btn bg-[#1a7f3c] text-white hover:bg-[#14662f]" target="_blank" rel="noopener noreferrer" href={enlaceWhatsApp(p.cliente.celular, `Hola ${p.cliente.nombre}, te escribimos de SOTEC por tu pedido ${p.codigo} de la tienda virtual.`)}>
                    <MessageCircle className="h-4 w-4" aria-hidden /> Escribir al cliente por WhatsApp
                  </a>
                  {SIGUIENTE[p.estado] && (
                    <button type="button" className="btn-secundario border-marca-btn text-marca-oscuro" disabled={cambiando === p.id} onClick={() => void estado(p, SIGUIENTE[p.estado]!.estado)} data-siguiente-estado>
                      {cambiando === p.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />} {SIGUIENTE[p.estado]!.texto}
                    </button>
                  )}
                  <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <label htmlFor={`e-${p.id}`} className="font-semibold text-tinta">Estado</label>
                    <select id={`e-${p.id}`} className="campo w-auto" value={p.estado} disabled={cambiando === p.id} onChange={(e) => void estado(p, e.target.value as EstadoPedido)} data-cambiar-estado>
                      {ESTADOS_PEDIDO.map((e) => (
                        <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>
                      ))}
                    </select>
                  </span>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
