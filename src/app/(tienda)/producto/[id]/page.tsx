"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, Check, CheckCircle2, Clock, House, Minus, Plus, ShoppingCart, Wrench } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { CarruselProductos } from "@/components/tienda/CarruselProductos";
import { ImagenProducto } from "@/components/tienda/ImagenProducto";
import { Etiquetas, Precio } from "@/components/tienda/Precio";
import { abrirWhatsApp } from "@/lib/abrir";
import type { Producto } from "@/lib/tipos";
import { enlaceWhatsApp, mensajeProducto, numeroProducto } from "@/lib/whatsapp";

function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

export default function FichaProducto({ params }: { params: { id: string } }) {
  const { listo, productos, categorias, marcas, agregar, config } = useTienda();
  const [producto, setProducto] = useState<Producto | null | undefined>(undefined);
  const [foto, setFoto] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    if (!listo) return;
    setProducto(productos.find((p) => p.id === decodeURIComponent(params.id)) ?? null);
    setFoto(0);
    setCantidad(1);
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
  const servicio = p.tipo === "servicio";
  const cat = categorias.find((c) => c.id === p.categoriaId);
  const marca = p.marcaId ? marcas.find((m) => m.id === p.marcaId) : undefined;
  const ficha = p.fichaTecnica.split("\n").map((l) => l.trim()).filter(Boolean);
  const incluye = p.incluye.split("\n").map((l) => l.trim()).filter(Boolean);
  const relacionados = productos.filter((x) => x.categoriaId === p.categoriaId && x.id !== p.id);
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
  const textoAgregar = servicio ? "Solicitar servicio" : "Agregar al carrito";

  const alAgregar = () => {
    agregar(p, cantidad);
    setAgregado(true);
  };
  const cotizar = () => abrirWhatsApp(enlaceWhatsApp(numeroProducto(config, p), mensajeProducto(p, cantidad, `https://sotecse.com/tienda/producto/${p.id}`)));

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
    <div className="contenedor pb-32 pt-4 sm:pt-6 md:pb-16 lg:pb-20" data-ficha-tipo={p.tipo}>
      <Link href={cat ? `/?categoria=${cat.id}#catalogo` : "/"} className="btn -ml-2 px-2 text-sm text-tenue hover:text-tinta">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {cat?.nombre ?? "Catálogo"}
      </Link>

      <div className="mt-3 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        {/* Galería: miniaturas a la izquierda en escritorio, debajo en móvil */}
        <div className="flex flex-col-reverse gap-3 md:flex-row" data-galeria>
          {p.imagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible" role="group" aria-label="Fotos">
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
                  <ImagenProducto src={src} categoriaId={p.categoriaId} />
                </button>
              ))}
            </div>
          )}
          <div className="aspect-square flex-1 overflow-hidden rounded-2xl border border-linea bg-fondo md:aspect-[4/3]">
            <ImagenProducto src={p.imagenes[foto]} categoriaId={p.categoriaId} alt={p.nombre} tamIcono="h-1/4 w-1/4" eager />
          </div>
        </div>

        {/* Recuadro de compra */}
        <aside className="tarjeta h-fit space-y-4 p-5 md:sticky md:top-24" aria-label={servicio ? "Solicitar" : "Comprar"}>
          <Etiquetas producto={p} />
          <div>
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{p.nombre}</h1>
            {marca && <p className="mt-1 text-sm">Marca: <Link href={`/?marca=${marca.id}#catalogo`} className="font-semibold text-marca-oscuro hover:underline">{marca.nombre}</Link></p>}
          </div>
          <Precio producto={p} tamano="ficha" />
          {servicio && p.modalidad && (
            <p className="flex items-center gap-2 text-sm font-semibold text-tinta" data-modalidad>
              <Clock className="h-4 w-4 text-marca-btn" aria-hidden /> {p.modalidad}
            </p>
          )}
          {p.precio == null && <p className="text-sm">{servicio ? "Solicítalo y te enviamos la cotización por WhatsApp." : "Agrégalo al carrito o cotízalo ya: te enviamos el valor por WhatsApp."}</p>}
          {servicio && p.precio != null && <p className="text-sm">Precio de referencia: el valor final depende del alcance.</p>}
          <p className="text-sm">{p.descripcion}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-tinta" data-segmentos>
            Para:
            {p.segmentos.includes("hogar") && <span className="inline-flex items-center gap-1 rounded-full bg-fondo px-2 py-1"><House className="h-3.5 w-3.5" aria-hidden /> Hogar</span>}
            {p.segmentos.includes("empresa") && <span className="inline-flex items-center gap-1 rounded-full bg-fondo px-2 py-1"><Building2 className="h-3.5 w-3.5" aria-hidden /> Empresas</span>}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-tinta">Cantidad</span>
            {selector}
          </div>
          <div className="hidden space-y-2 md:block">
            <button type="button" className={`btn w-full text-base ${agregado ? "bg-marca-suave text-marca-oscuro" : "bg-marca-btn text-white hover:bg-marca-oscuro"}`} onClick={alAgregar} data-agregar-ficha>
              {agregado ? <Check className="h-5 w-5" aria-hidden /> : servicio ? <Wrench className="h-5 w-5" aria-hidden /> : <ShoppingCart className="h-5 w-5" aria-hidden />}
              {agregado ? "¡Agregado al carrito!" : textoAgregar}
            </button>
            <button type="button" className="btn w-full border-2 border-[#1f9d55] text-base text-[#16773f] hover:bg-[#1f9d55]/10" onClick={cotizar} data-cotizar>
              <IconoWhatsApp /> Cotizar ahora por WhatsApp
            </button>
          </div>
          <ul className="space-y-1 border-t border-linea pt-3 text-sm">
            <li className="flex items-center gap-2"><Wrench className="h-4 w-4 text-marca-btn" aria-hidden /> {servicio ? "Técnicos de SOTEC" : "Instalación profesional disponible"}</li>
            <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-marca-btn" aria-hidden /> Garantía SOTEC</li>
          </ul>
        </aside>
      </div>

      {incluye.length > 0 && (
        <section className="mt-10 max-w-3xl sm:mt-14" aria-labelledby="incluye">
          <h2 id="incluye" className="titulo-seccion">Qué incluye</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-incluye>
            {incluye.map((l, i) => (
              <li key={i} className="tarjeta flex items-start gap-2 p-3 text-sm text-tinta">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-marca-btn" aria-hidden /> {l}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ficha.length > 0 && (
        <section className="mt-10 max-w-3xl sm:mt-14" aria-labelledby="ficha">
          <h2 id="ficha" className="titulo-seccion">Ficha técnica</h2>
          <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white">
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

      {/* Barra inferior fija en móvil (reemplaza la navegación inferior en la ficha) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden" data-barra-movil>
        <div className="flex gap-2">
          <button type="button" className="btn flex-1 border-2 border-[#1f9d55] px-2 text-[#16773f]" onClick={cotizar} aria-label="Cotizar ahora por WhatsApp">
            <IconoWhatsApp /> Cotizar
          </button>
          <button type="button" className={`btn flex-[1.4] px-2 ${agregado ? "bg-marca-suave text-marca-oscuro" : "bg-marca-btn text-white"}`} onClick={alAgregar} data-agregar-barra>
            {agregado ? <Check className="h-4 w-4" aria-hidden /> : servicio ? <Wrench className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
            {agregado ? "¡Agregado!" : textoAgregar}
          </button>
        </div>
      </div>
    </div>
  );
}
