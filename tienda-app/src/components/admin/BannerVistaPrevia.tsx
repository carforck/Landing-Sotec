"use client";

import { ArrowRight, ImageIcon } from "lucide-react";

import { urlImagen } from "@/lib/rutas";
import type { Banner, UbicacionBanner } from "@/lib/tipos";

/** Tamaños recomendados de imagen según dónde va el banner. */
export const TAMANO_BANNER = {
  carrusel: "Recomendado: 1600 × 600 px (horizontal).",
  movil: "Recomendado: 800 × 600 px. Si no subes una, se usa la de escritorio.",
  promo: "Recomendado: 900 × 450 px (horizontal).",
} as const;

function Fondo({ src }: { src: string }) {
  return src ? (
    <img src={urlImagen(src)} alt="" className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-700 text-xs text-white/80">
      <ImageIcon className="h-6 w-6" aria-hidden /> Aquí va tu imagen
    </span>
  );
}

/**
 * Vista previa en vivo (aproximada) de cómo se verá el banner en la portada: igual que el
 * carrusel o la tarjeta de promoción de la tienda, pero a escala.
 */
export function BannerVistaPrevia({ banner: b }: { banner: Banner }) {
  const titulo = b.titulo.trim() || "Escribe el título";
  if (b.ubicacion === "promo") {
    return (
      <figure>
        <div className="relative flex aspect-[2/1] w-full max-w-sm items-end overflow-hidden rounded-2xl bg-oscuro">
          <Fondo src={b.imagen} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b140d]/95 via-[#0f2410]/65 to-transparent" />
          <div className="relative p-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
            <p className="font-titulo text-base font-bold leading-tight">{titulo}</p>
            {b.texto && <p className="mt-0.5 text-xs">{b.texto}</p>}
            {b.botonTexto && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                {b.botonTexto} <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
            )}
          </div>
        </div>
        <figcaption className="mt-1 text-xs text-tenue">Tarjeta de promoción bajo el carrusel.</figcaption>
      </figure>
    );
  }
  const boton = b.botonTexto && b.enlace;
  return (
    <div className="space-y-3">
      <figure>
        <div className="relative aspect-[8/3] w-full overflow-hidden rounded-2xl bg-oscuro">
          <Fondo src={b.imagen} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,13,0.94)_0%,rgba(14,34,14,0.86)_38%,rgba(18,48,14,0.45)_65%,rgba(18,48,14,0.05)_100%)]" />
          <div className="absolute inset-0 flex items-center px-[8%]">
            <div className="max-w-[65%] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
              <p className="font-titulo text-base font-extrabold leading-tight sm:text-xl">{titulo}</p>
              {b.texto && <p className="mt-1 line-clamp-2 text-[11px] sm:text-sm">{b.texto}</p>}
              {boton && <span className="mt-2 inline-flex rounded-lg bg-marca-btn px-2.5 py-1 text-[11px] font-semibold sm:text-xs">{b.botonTexto}</span>}
            </div>
          </div>
        </div>
        <figcaption className="mt-1 text-xs text-tenue">En computador.{!boton && " (Sin botón: elige a dónde lleva para que aparezca.)"}</figcaption>
      </figure>
      <figure>
        <div className="relative h-36 w-52 overflow-hidden rounded-2xl bg-oscuro">
          <Fondo src={b.imagenMovil || b.imagen} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b140d]/95 via-[#0f2410]/70 to-[#0f2410]/10" />
          <div className="absolute inset-0 flex items-end p-3">
            <div className="text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
              <p className="font-titulo text-sm font-extrabold leading-tight">{titulo}</p>
              {boton && <span className="mt-1 inline-flex rounded-md bg-marca-btn px-2 py-0.5 text-[10px] font-semibold">{b.botonTexto}</span>}
            </div>
          </div>
        </div>
        <figcaption className="mt-1 text-xs text-tenue">En celular.</figcaption>
      </figure>
    </div>
  );
}

/** Dibujo mínimo de la portada que resalta la zona elegida. */
function Esquema({ zona }: { zona: UbicacionBanner }) {
  const fuerte = "bg-marca-btn";
  const suave = "bg-gray-300";
  return (
    <span className="flex w-20 shrink-0 flex-col gap-1 rounded-md border border-linea bg-white p-1.5" aria-hidden>
      <span className="h-1 w-full rounded-sm bg-gray-200" />
      <span className={`h-6 w-full rounded-sm ${zona === "carrusel" ? fuerte : suave}`} />
      <span className="grid grid-cols-3 gap-0.5">
        {[0, 1, 2].map((k) => (
          <span key={k} className={`h-3 rounded-sm ${zona === "promo" ? fuerte : suave}`} />
        ))}
      </span>
      <span className="grid grid-cols-4 gap-0.5">
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className="h-2 rounded-sm bg-gray-200" />
        ))}
      </span>
    </span>
  );
}

const OPCIONES: { valor: UbicacionBanner; titulo: string; texto: string }[] = [
  { valor: "carrusel", titulo: "Carrusel principal", texto: "Banner grande arriba de la portada. Van pasando uno tras otro." },
  { valor: "promo", titulo: "Promoción bajo el carrusel", texto: "Tarjeta más pequeña debajo del carrusel. Se ven hasta 3." },
];

/** Selector visual de dónde va el banner: dos tarjetas con un dibujo de la portada. */
export function BannerUbicacion({ valor, alCambiar }: { valor: UbicacionBanner; alCambiar: (u: UbicacionBanner) => void }) {
  return (
    <fieldset>
      <legend className="etiqueta">¿Dónde se muestra?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPCIONES.map((o) => {
          const activo = o.valor === valor;
          return (
            <label key={o.valor} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors focus-within:ring-2 focus-within:ring-marca-btn ${activo ? "border-marca-btn bg-marca-suave" : "border-linea bg-white hover:border-gray-400"}`}>
              <input type="radio" name="b-ubicacion" value={o.valor} checked={activo} onChange={() => alCambiar(o.valor)} className="sr-only" />
              <Esquema zona={o.valor} />
              <span>
                <span className="block text-sm font-bold text-tinta">{o.titulo}</span>
                <span className="block text-xs text-tenue">{o.texto}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
