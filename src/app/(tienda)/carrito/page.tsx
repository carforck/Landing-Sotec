"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Minus, Plus, Send, Trash2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { abrirWhatsApp } from "@/lib/abrir";
import { esBot, revisarLimite } from "@/lib/antispam";
import { resumen, subtotal } from "@/lib/carrito";
import { ErrorDatos } from "@/lib/datos";
import { formatoCOP, textoPrecio } from "@/lib/formato";
import { urlImagen } from "@/lib/rutas";
import { esquemaCliente } from "@/lib/validacion";
import { enlaceWhatsApp, mensajePedido } from "@/lib/whatsapp";

const CLAVE_ENVIOS = "sotec-tienda-envios";

type Errores = Partial<Record<"nombre" | "celular" | "ciudad" | "correo" | "nota" | "general", string>>;

export default function Carrito() {
  const { listo, repo, carrito, cambiarCantidad, quitar, vaciar, config } = useTienda();
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [hecho, setHecho] = useState<{ codigo: string; url: string } | null>(null);
  const r = resumen(carrito);

  // Desde el carrito lateral («Enviar pedido por WhatsApp») se llega a #datos: enfocar el formulario
  useEffect(() => {
    if (!listo || !carrito.length || window.location.hash !== "#datos") return;
    const t = setTimeout(() => {
      document.getElementById("datos")?.scrollIntoView({ block: "start" });
      document.getElementById("nombre")?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(t);
  }, [listo, carrito.length]);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!repo || enviando) return;
    const f = new FormData(e.currentTarget);
    if (esBot(String(f.get("sitio_web") ?? ""))) {
      setHecho({ codigo: "—", url: "" });
      return;
    }
    const v = esquemaCliente.safeParse({
      nombre: String(f.get("nombre") ?? ""),
      celular: String(f.get("celular") ?? ""),
      ciudad: String(f.get("ciudad") ?? ""),
      correo: String(f.get("correo") ?? ""),
      nota: String(f.get("nota") ?? ""),
    });
    if (!v.success) {
      const errs: Errores = {};
      for (const i of v.error.issues) errs[i.path[0] as keyof Errores] ??= i.message;
      setErrores(errs);
      return;
    }
    let marcas: number[] = [];
    try {
      marcas = JSON.parse(localStorage.getItem(CLAVE_ENVIOS) ?? "[]") as number[];
    } catch {
      marcas = [];
    }
    const limite = revisarLimite(Array.isArray(marcas) ? marcas : [], Date.now());
    if (!limite.permitido) {
      setErrores({ general: "Ya enviaste varios pedidos hace poco. Espera unos minutos o escríbenos directo por WhatsApp." });
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      const pedido = await repo.crearPedido({ cliente: v.data, items: carrito });
      try {
        localStorage.setItem(CLAVE_ENVIOS, JSON.stringify([...limite.vigentes, Date.now()]));
      } catch {
        /* ignorar */
      }
      const url = enlaceWhatsApp(config.whatsapp, mensajePedido(config, pedido.codigo, pedido.cliente, pedido.items));
      abrirWhatsApp(url);
      vaciar();
      setHecho({ codigo: pedido.codigo, url });
    } catch (err) {
      setErrores({ general: err instanceof ErrorDatos ? err.message : "No pudimos registrar el pedido. Intenta de nuevo o escríbenos por WhatsApp." });
    } finally {
      setEnviando(false);
    }
  }

  if (hecho)
    return (
      <div className="contenedor max-w-xl py-16 text-center" data-pedido-enviado>
        <CheckCircle2 className="mx-auto h-14 w-14 text-marca" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold">¡Pedido listo!</h1>
        {hecho.url ? (
          <>
            <p className="mt-2">
              Tu pedido <strong className="text-tinta" data-codigo>{hecho.codigo}</strong> se abrió en WhatsApp. Envía el mensaje para que te respondamos con el precio y la disponibilidad.
            </p>
            <a href={hecho.url} target="_blank" rel="noopener noreferrer" className="btn-primario mt-6">
              <Send className="h-4 w-4" aria-hidden /> Abrir WhatsApp de nuevo
            </a>
          </>
        ) : (
          <p className="mt-2">Gracias, te contactaremos pronto.</p>
        )}
        <div>
          <Link href="/" className="btn-secundario mt-3">Seguir comprando</Link>
        </div>
      </div>
    );

  if (!listo) return <div className="contenedor py-10" aria-busy="true">Cargando carrito…</div>;

  if (!carrito.length)
    return (
      <div className="contenedor py-16 text-center">
        <h1 className="text-2xl font-extrabold">Tu carrito está vacío</h1>
        <p className="mt-2">Agrega productos del catálogo para armar tu pedido.</p>
        <Link href="/" className="btn-primario mt-6">Ver el catálogo</Link>
      </div>
    );

  return (
    <div className="contenedor py-8 sm:py-12">
      <h1 className="titulo-seccion">Tu carrito</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        <section aria-label="Productos del carrito">
          <ul className="space-y-3">
            {carrito.map((it) => {
              const sub = subtotal(it);
              return (
                <li key={it.productoId} className="tarjeta flex gap-3 p-3" data-item={it.productoId}>
                  <img src={urlImagen(it.imagen)} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/producto/${it.productoId}`} className="font-semibold text-tinta hover:underline">{it.nombre}</Link>
                      <button type="button" className="btn -mr-1 -mt-1 shrink-0 px-2 text-tenue hover:text-red-700" onClick={() => quitar(it.productoId)} aria-label={`Quitar ${it.nombre}`}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <p className="text-sm">{textoPrecio(it.precio)}{it.precio != null && " c/u"}</p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="flex items-center rounded-xl border border-linea" role="group" aria-label={`Cantidad de ${it.nombre}`}>
                        <button type="button" className="btn px-3" onClick={() => cambiarCantidad(it.productoId, it.cantidad - 1)} aria-label="Menos">
                          <Minus className="h-4 w-4" aria-hidden />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={999}
                          value={it.cantidad}
                          onChange={(e) => cambiarCantidad(it.productoId, Number(e.target.value) || 1)}
                          className="h-11 w-14 border-x border-linea text-center font-semibold text-tinta"
                          aria-label="Cantidad"
                          data-cantidad
                        />
                        <button type="button" className="btn px-3" onClick={() => cambiarCantidad(it.productoId, it.cantidad + 1)} aria-label="Más">
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <p className="font-bold text-tinta" data-subtotal>{sub == null ? "A cotizar" : formatoCOP(sub)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="space-y-4">
          <div className="tarjeta p-4">
            <h2 className="text-lg font-bold">Resumen</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Unidades</dt><dd>{r.unidades}</dd></div>
              {r.aCotizar > 0 && (
                <div className="flex justify-between"><dt>Productos a cotizar</dt><dd>{r.aCotizar}</dd></div>
              )}
              <div className="flex justify-between border-t border-linea pt-2 text-base font-bold text-tinta"><dt>Total</dt><dd data-total>{formatoCOP(r.total)}</dd></div>
            </dl>
            {r.aCotizar > 0 && <p className="mt-2 text-xs">El total no incluye los productos a cotizar: te enviamos su valor por WhatsApp.</p>}
          </div>

          <form id="datos" className="tarjeta scroll-mt-32 space-y-3 p-4" onSubmit={enviar} noValidate>
            <h2 className="text-lg font-bold">Tus datos</h2>
            {(
              [
                ["nombre", "Nombre completo", "text", "name"],
                ["celular", "Celular (WhatsApp)", "tel", "tel"],
                ["ciudad", "Ciudad", "text", "address-level2"],
                ["correo", "Correo (opcional)", "email", "email"],
              ] as const
            ).map(([id, etiqueta, tipo, auto]) => (
              <div key={id}>
                <label htmlFor={id} className="etiqueta">{etiqueta}</label>
                <input id={id} name={id} type={tipo} autoComplete={auto} className="campo" aria-invalid={!!errores[id]} aria-describedby={errores[id] ? `${id}-error` : undefined} />
                {errores[id] && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{errores[id]}</p>}
              </div>
            ))}
            <div>
              <label htmlFor="nota" className="etiqueta">Nota (opcional)</label>
              <textarea id="nota" name="nota" rows={3} className="campo" placeholder="Ej.: necesito instalación en Cartagena" />
              {errores.nota && <p className="mt-1 text-sm text-red-700">{errores.nota}</p>}
            </div>
            {/* Trampa para bots: invisible para personas */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="sitio_web">No llenar este campo</label>
              <input id="sitio_web" name="sitio_web" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            {errores.general && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errores.general}</p>}
            <button type="submit" className="btn-primario w-full" disabled={enviando}>
              <Send className="h-4 w-4" aria-hidden /> {enviando ? "Enviando…" : "Enviar pedido por WhatsApp"}
            </button>
            <p className="text-xs">Al enviar, guardamos tu pedido y abrimos WhatsApp con el detalle para que lo envíes a SOTEC.</p>
          </form>
        </aside>
      </div>
    </div>
  );
}
