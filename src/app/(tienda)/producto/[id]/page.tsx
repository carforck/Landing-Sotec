"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Check, Minus, Plus, ShoppingCart, Wrench } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { CarruselProductos } from "@/components/tienda/CarruselProductos";
import { Etiquetas } from "@/components/tienda/TarjetaProducto";
import { abrirWhatsApp } from "@/lib/abrir";
import { formatoCOP } from "@/lib/formato";
import { urlImagen } from "@/lib/rutas";
import type { Producto } from "@/lib/tipos";
import { enlaceWhatsApp, mensajeProducto } from "@/lib/whatsapp";

function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

export default function FichaProducto({ params }: { params: { id: string } }) {
  const { listo, productos, categorias, agregar, config } = useTienda();
  const [producto, setProducto] = useState<Producto | null | undefined>(undefined);
  const [foto, setFoto] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (!listo) return;
    setProducto(productos.find((p) => p.id === decodeURIComponent(params.id)) ?? null);
    setFoto(0);
  }, [listo, productos, params.id]);

  useEffect(() => {
    if (!agregado) return;
    const t = setTimeout(() => setAgregado(false), 1600);
    return () => clearTimeout(t);
  }, [agregado]);

  if (producto === undefined) return <div className="contenedor py-10" aria-busy="true">Cargando…</div>;
  if (producto === null)
    return (
      <div className="contenedor py-16 text-center">
        <h1 className="text-2xl font-bold">Este producto no está disponible</h1>
        <Link href="/" className="btn-primario mt-6">Ver el catálogo</Link>
      </div>
    );

  const p = producto;
  const cat = categorias.find((c) => c.id === p.categoriaId);
  const ficha = p.fichaTecnica.split("\n").map((l) => l.trim()).filter(Boolean);
  const relacionados = productos.filter((x) => x.categoriaId === p.categoriaId && x.id !== p.id);
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));

  const alAgregar = () => {
    agregar(p, cantidad);
    setAgregado(true);
  };
  const cotizar = () => abrirWhatsApp(enlaceWhatsApp(config.whatsapp, mensajeProducto(p, cantidad, `https://sotecse.com/tienda/producto/${p.id}`)));

  const precio = p.precio == null ? (
    <p className="text-xl font-bold text-tenue">Precio a cotizar</p>
  ) : (
    <p className="font-extrabold tracking-tight text-tinta [font-size:clamp(1.875rem,1.5rem+1.5vw,2.5rem)]" data-precio-ficha>{formatoCOP(p.precio)}</p>
  );

  const selector = (
    <div className="flex items-center rounded-xl border border-linea" role="group" aria-label="Cantidad">
      <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => setCantidad((c) => Math.max(1, c - 1))} aria-label="Menos">
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="w-10 text-center font-semibold text-tinta" aria-live="polite" data-cantidad-ficha>{cantidad}</span>
      <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => setCantidad((c) => Math.min(999, c + 1))} aria-label="Más">
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );

  return (
    <div className="contenedor pb-32 pt-4 sm:pt-6 md:pb-16 lg:pb-20">
      <Link href={cat ? `/?categoria=${cat.id}#catalogo` : "/"} className="btn -ml-2 px-2 text-sm text-tenue hover:text-tinta">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {cat?.nombre ?? "Catálogo"}
      </Link>

      <div className="mt-3 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        {/* Galería: miniaturas a la izquierda en escritorio, debajo en móvil */}
        <div className="flex flex-col-reverse gap-3 md:flex-row" data-galeria>
          {p.imagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible" role="group" aria-label="Fotos del producto">
              {p.imagenes.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFoto(i)}
                  onMouseEnter={() => setFoto(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-pressed={i === foto}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-fondo ${i === foto ? "border-marca-btn" : "border-linea"}`}
                >
                  <img src={urlImagen(src)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="aspect-square flex-1 overflow-hidden rounded-2xl border border-linea bg-fondo md:aspect-[4/3]">
            <img src={urlImagen(p.imagenes[foto])} alt={p.nombre} className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Recuadro de compra */}
        <aside className="tarjeta h-fit space-y-4 p-5 md:sticky md:top-24" aria-label="Comprar">
          <Etiquetas producto={p} />
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{p.nombre}</h1>
          {precio}
          {p.precio == null && <p className="text-sm">Agrégalo al carrito o cotízalo ya: te enviamos el valor por WhatsApp.</p>}
          <p className="text-sm">{p.descripcion}</p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-tinta">Cantidad</span>
            {selector}
          </div>
          <div className="hidden space-y-2 md:block">
            <button type="button" className={`btn w-full text-base ${agregado ? "bg-marca-suave text-marca-oscuro" : "bg-marca-btn text-white hover:bg-marca-oscuro"}`} onClick={alAgregar} data-agregar-ficha>
              {agregado ? <Check className="h-5 w-5" aria-hidden /> : <ShoppingCart className="h-5 w-5" aria-hidden />}
              {agregado ? "¡Agregado al carrito!" : "Agregar al carrito"}
            </button>
            <button type="button" className="btn w-full border-2 border-[#1f9d55] text-base text-[#16773f] hover:bg-[#1f9d55]/10" onClick={cotizar} data-cotizar>
              <IconoWhatsApp /> Cotizar ahora por WhatsApp
            </button>
          </div>
          <ul className="space-y-1 border-t border-linea pt-3 text-sm">
            <li className="flex items-center gap-2"><Wrench className="h-4 w-4 text-marca-btn" aria-hidden /> Instalación profesional disponible</li>
            <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-marca-btn" aria-hidden /> Garantía SOTEC</li>
          </ul>
        </aside>
      </div>

      {ficha.length > 0 && (
        <section className="mt-10 max-w-3xl sm:mt-14" aria-labelledby="ficha">
          <h2 id="ficha" className="titulo-seccion">Ficha técnica</h2>
          <ul className="mt-2 divide-y divide-linea rounded-xl border border-linea bg-white">
            {ficha.map((l, i) => {
              const [k, ...v] = l.split(":");
              return (
                <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-sm">
                  {v.length ? (
                    <>
                      <span className="font-semibold text-tinta">{k.trim()}</span>
                      <span>{v.join(":").trim()}</span>
                    </>
                  ) : (
                    <span>{l}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {relacionados.length > 0 && (
        <div className="mt-10 sm:mt-14">
          <CarruselProductos id="relacionados" titulo="También te puede interesar" productos={relacionados} nombreCat={nombreCat} />
        </div>
      )}

      {/* Barra inferior fija en móvil */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden" data-barra-movil>
        <div className="flex gap-2">
          <button type="button" className="btn flex-1 border-2 border-[#1f9d55] px-2 text-[#16773f]" onClick={cotizar} aria-label="Cotizar ahora por WhatsApp">
            <IconoWhatsApp /> Cotizar
          </button>
          <button type="button" className={`btn flex-[1.4] px-2 ${agregado ? "bg-marca-suave text-marca-oscuro" : "bg-marca-btn text-white"}`} onClick={alAgregar} data-agregar-barra>
            {agregado ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
            {agregado ? "¡Agregado!" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
