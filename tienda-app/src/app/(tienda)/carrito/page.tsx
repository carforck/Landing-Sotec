"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, House, Minus, Plus, Send, Trash2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ImagenProducto } from "@/components/tienda/ImagenProducto";
import { abrirWhatsApp } from "@/lib/abrir";
import { esBot, revisarLimite } from "@/lib/antispam";
import { resumen, subtotal } from "@/lib/carrito";
import { ErrorDatos } from "@/lib/datos";
import { formatoCOP, textoPrecio } from "@/lib/formato";
import type { ItemCarrito, Segmento } from "@/lib/tipos";
import { esquemaCliente } from "@/lib/validacion";
import { enlaceWhatsApp, mensajePedido, numeroPara } from "@/lib/whatsapp";

const CLAVE_ENVIOS = "sotec-tienda-envios";

type Campo = "nombre" | "celular" | "ciudad" | "segmento" | "empresa" | "correo" | "nota" | "general";
type Errores = Partial<Record<Campo, string>>;

function Item({ it }: { it: ItemCarrito }) {
  const { cambiarCantidad, quitar, productos } = useTienda();
  const sub = subtotal(it);
  const servicio = it.tipo === "servicio";
  const categoriaId = productos.find((p) => p.id === it.productoId)?.categoriaId;
  return (
    <li className="tarjeta flex gap-3 p-3" data-item={it.productoId}>
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-24">
        <ImagenProducto src={it.imagen} categoriaId={categoriaId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {servicio && <span className="mb-0.5 inline-block rounded bg-violet-700 px-1.5 text-[11px] font-bold text-white">Servicio</span>}
            <Link href={`/producto/${it.productoId}`} className="block font-semibold text-tinta hover:underline">{it.nombre}</Link>
            {servicio && it.modalidad && <p className="text-xs text-tenue">{it.modalidad}</p>}
          </div>
          <button type="button" className="btn -mr-1 -mt-1 shrink-0 px-2 text-tenue hover:text-red-700" onClick={() => quitar(it.productoId)} aria-label={`Quitar ${it.nombre}`}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="text-sm">{textoPrecio(it.precio, it.tipo)}{!servicio && it.precio != null && " c/u"}</p>
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
          <p className="font-bold text-tinta" data-subtotal>{sub != null ? formatoCOP(sub) : servicio ? "Se cotiza" : "A cotizar"}</p>
        </div>
      </div>
    </li>
  );
}

export default function Carrito() {
  const { listo, repo, carrito, vaciar, config } = useTienda();
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [segmento, setSegmento] = useState<Segmento | "">("");
  const [hecho, setHecho] = useState<{ codigo: string; url: string } | null>(null);
  const r = resumen(carrito);
  const productos = carrito.filter((x) => x.tipo !== "servicio");
  const servicios = carrito.filter((x) => x.tipo === "servicio");

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
      segmento,
      empresa: segmento === "empresa" ? String(f.get("empresa") ?? "") : "",
      correo: String(f.get("correo") ?? ""),
      nota: String(f.get("nota") ?? ""),
    });
    if (!v.success) {
      const errs: Errores = {};
      for (const i of v.error.issues) errs[i.path[0] as Campo] ??= i.message;
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
      // El pedido llega al WhatsApp de ventas del segmento elegido
      const url = enlaceWhatsApp(numeroPara(config, pedido.cliente.segmento), mensajePedido(config, pedido.codigo, pedido.cliente, pedido.items));
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
        <p className="mt-2">Agrega productos o servicios del catálogo para armar tu pedido.</p>
        <Link href="/" className="btn-primario mt-6">Ver el catálogo</Link>
      </div>
    );

  const campo = (id: "nombre" | "celular" | "ciudad" | "correo" | "empresa", etiqueta: string, tipo: string, auto: string) => (
    <div key={id}>
      <label htmlFor={id} className="etiqueta">{etiqueta}</label>
      <input id={id} name={id} type={tipo} autoComplete={auto} className="campo" aria-invalid={!!errores[id]} aria-describedby={errores[id] ? `${id}-error` : undefined} />
      {errores[id] && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{errores[id]}</p>}
    </div>
  );

  return (
    <div className="bg-fondo">
      <div className="contenedor py-8 sm:py-12">
        <h1 className="titulo-seccion">Tu carrito</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <div className="space-y-6">
            {productos.length > 0 && (
              <section aria-labelledby="t-productos">
                <h2 id="t-productos" className="mb-3 text-base font-bold">Productos</h2>
                <ul className="space-y-3">{productos.map((it) => <Item key={it.productoId} it={it} />)}</ul>
              </section>
            )}
            {servicios.length > 0 && (
              <section aria-labelledby="t-servicios">
                <h2 id="t-servicios" className="mb-1 text-base font-bold">Servicios solicitados</h2>
                <p className="mb-3 text-sm">Los servicios se cotizan según el alcance; el precio mostrado es de referencia.</p>
                <ul className="space-y-3">{servicios.map((it) => <Item key={it.productoId} it={it} />)}</ul>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="tarjeta p-4">
              <h2 className="text-lg font-bold">Resumen</h2>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><dt>Unidades</dt><dd>{r.unidades}</dd></div>
                {r.aCotizar > 0 && <div className="flex justify-between"><dt>Productos a cotizar</dt><dd>{r.aCotizar}</dd></div>}
                {r.servicios > 0 && <div className="flex justify-between"><dt>Servicios solicitados</dt><dd>{r.servicios}</dd></div>}
                <div className="flex justify-between border-t border-linea pt-2 text-base font-bold text-tinta"><dt>Total productos</dt><dd data-total>{formatoCOP(r.total)}</dd></div>
              </dl>
              {(r.aCotizar > 0 || r.servicios > 0) && <p className="mt-2 text-xs">El total no incluye servicios ni productos a cotizar: te enviamos su valor por WhatsApp.</p>}
            </div>

            <form id="datos" className="tarjeta scroll-mt-32 space-y-3 p-4" onSubmit={enviar} noValidate>
              <h2 className="text-lg font-bold">Tus datos</h2>
              <fieldset>
                <legend className="etiqueta">¿Es para hogar o empresa?</legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-describedby={errores.segmento ? "segmento-error" : undefined}>
                  {([["hogar", "Hogar", House], ["empresa", "Empresa", Building2]] as const).map(([valor, texto, Icono]) => (
                    <label key={valor} className={`btn cursor-pointer border ${segmento === valor ? "border-marca-btn bg-marca-suave text-marca-oscuro" : "border-linea bg-white text-tinta"} focus-within:ring-2 focus-within:ring-marca-btn`}>
                      <input type="radio" name="segmento" value={valor} checked={segmento === valor} onChange={() => setSegmento(valor)} className="sr-only" data-segmento-form={valor} />
                      <Icono className="h-4 w-4" aria-hidden /> {texto}
                    </label>
                  ))}
                </div>
                {errores.segmento && <p id="segmento-error" className="mt-1 text-sm text-red-700">{errores.segmento}</p>}
              </fieldset>
              {campo("nombre", "Nombre completo", "text", "name")}
              {segmento === "empresa" && campo("empresa", "Empresa (opcional)", "text", "organization")}
              {campo("celular", "Celular (WhatsApp)", "tel", "tel")}
              {campo("ciudad", "Ciudad", "text", "address-level2")}
              {campo("correo", "Correo (opcional)", "email", "email")}
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
    </div>
  );
}
