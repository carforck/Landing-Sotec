"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { urlImagen } from "@/lib/rutas";

/** Cuadrícula de 2–3 promociones bajo el carrusel (banners con ubicación «promo»). */
export function Promos() {
  const { banners } = useTienda();
  const promos = banners.filter((b) => b.ubicacion === "promo").slice(0, 3);
  if (!promos.length) return null;
  return (
    <ul className={`grid gap-3 sm:gap-4 ${promos.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`} aria-label="Promociones" data-promos>
      {promos.map((b) => (
        <li key={b.id}>
          <Link href={b.enlace || "/"} className="group relative flex h-36 items-end overflow-hidden rounded-2xl bg-oscuro sm:h-44" data-promo={b.id}>
            <img src={urlImagen(b.imagen)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b140d]/95 via-[#0f2410]/65 to-transparent" />
            <div className="relative p-4 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
              <p className="font-titulo text-lg font-bold leading-tight">{b.titulo}</p>
              {b.texto && <p className="mt-0.5 text-sm">{b.texto}</p>}
              {b.botonTexto && (
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
                  {b.botonTexto} <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
