"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { urlImagen } from "@/lib/rutas";

const INTERVALO = 6000;

/**
 * Carrusel de banners: avanza solo cada 6 s salvo con «reducir movimiento», se pausa al pasar el
 * mouse o enfocar, tiene botón de pausa, flechas, puntos y teclado (← →).
 */
export function CarruselBanners() {
  const { banners, listo } = useTienda();
  const [i, setI] = useState(0);
  const [pausaUsuario, setPausaUsuario] = useState(false);
  const [encima, setEncima] = useState(false);
  const [reducido, setReducido] = useState(false);
  const n = banners.length;

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducido(m.matches);
    const f = () => setReducido(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  const ir = useCallback((k: number) => setI(((k % n) + n) % n), [n]);
  const corriendo = n > 1 && !pausaUsuario && !encima && !reducido;

  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), INTERVALO);
    return () => clearInterval(t);
  }, [corriendo, n]);

  useEffect(() => {
    if (i >= n && n) setI(0);
  }, [i, n]);

  if (!listo) return <div className="h-[260px] animate-pulse rounded-2xl bg-fondo sm:h-[340px] lg:h-[380px]" aria-hidden />;
  if (!n) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Promociones"
      className="relative overflow-hidden rounded-2xl bg-oscuro shadow-xl ring-1 ring-white/10"
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setEncima(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") ir(i + 1);
        if (e.key === "ArrowLeft") ir(i - 1);
      }}
      data-carrusel-banners
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, k) => (
          <div
            key={b.id}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${k + 1} de ${n}: ${b.titulo}`}
            aria-hidden={k !== i}
            className="relative h-[260px] w-full shrink-0 sm:h-[340px] lg:h-[380px]"
            data-banner={b.id}
          >
            <picture>
              {b.imagenMovil && <source media="(max-width: 639px)" srcSet={urlImagen(b.imagenMovil)} />}
              <img src={urlImagen(b.imagen)} alt="" className="h-full w-full object-cover" loading={k === 0 ? "eager" : "lazy"} />
            </picture>
            {/* Degradado oscuro-verde detrás del texto (contraste AA): de abajo hacia arriba en móvil, de izquierda a derecha desde sm */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b140d]/95 via-[#0f2410]/70 to-[#0f2410]/10 sm:hidden" />
            <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(11,20,13,0.94)_0%,rgba(14,34,14,0.86)_38%,rgba(18,48,14,0.45)_65%,rgba(18,48,14,0.05)_100%)] sm:block" />
            {/* El contenido deja libre la franja de las flechas (izquierda 8 px + 44 px) */}
            <div className="absolute inset-0 flex items-end px-5 pb-12 pt-5 sm:items-center sm:py-10 sm:pl-20 sm:pr-20 lg:pl-24">
              <div className="max-w-xl text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]" data-texto-banner>
                <h2 className="titulo-hero font-extrabold text-white">{b.titulo}</h2>
                {b.texto && <p className="mt-2 text-sm text-white sm:text-lg">{b.texto}</p>}
                {b.botonTexto && b.enlace && (
                  <Link href={b.enlace} tabIndex={k === i ? 0 : -1} className="btn-primario mt-4" data-boton-banner>
                    {b.botonTexto}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button type="button" onClick={() => ir(i - 1)} aria-label="Banner anterior" data-banner-anterior className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-tinta shadow hover:bg-white sm:flex">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => ir(i + 1)} aria-label="Banner siguiente" className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-tinta shadow hover:bg-white sm:flex" data-banner-siguiente>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center">
            {banners.map((b, k) => (
              <button key={b.id} type="button" onClick={() => ir(k)} aria-label={`Ir al banner ${k + 1}`} aria-current={k === i ? "true" : undefined} className="flex h-11 w-8 items-center justify-center">
                <span className={`block h-2.5 rounded-full transition-all ${k === i ? "w-6 bg-white" : "w-2.5 bg-white/55"}`} />
              </button>
            ))}
            {!reducido && (
              <button type="button" onClick={() => setPausaUsuario((p) => !p)} aria-label={pausaUsuario ? "Reanudar carrusel" : "Pausar carrusel"} className="ml-1 flex h-11 w-11 items-center justify-center text-white" data-pausa>
                {pausaUsuario ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
              </button>
            )}
          </div>
        </>
      )}
      <p className="sr-only" aria-live={corriendo ? "off" : "polite"}>Banner {i + 1} de {n}</p>
    </section>
  );
}
