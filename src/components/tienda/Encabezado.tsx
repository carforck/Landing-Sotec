"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { resumen } from "@/lib/carrito";
import { SITIO_SOTEC, urlImagen } from "@/lib/rutas";

export function Encabezado() {
  const { carrito } = useTienda();
  const { unidades } = resumen(carrito);
  return (
    <header className="sticky top-0 z-30 border-b border-linea bg-white/95 backdrop-blur">
      <div className="contenedor flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Tienda SOTEC, inicio">
            <img src={urlImagen("/img/logo-sotec.webp")} alt="SOTEC" width={112} height={36} className="h-9 w-auto" />
            <span className="hidden rounded-full bg-marca-suave px-2 py-0.5 text-xs font-semibold text-marca-oscuro sm:inline">Tienda</span>
          </Link>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          <a href={SITIO_SOTEC} className="btn px-2 text-tenue hover:text-tinta sm:px-3">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Volver a sotecse.com</span>
            <span className="sm:hidden">Inicio</span>
          </a>
          <Link href="/carrito" className="btn-primario relative" aria-label={`Carrito, ${unidades} producto${unidades === 1 ? "" : "s"}`}>
            <ShoppingCart className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">Carrito</span>
            <span data-contador className="min-w-[1.5rem] rounded-full bg-white px-1.5 text-center text-xs font-bold text-marca-oscuro">{unidades}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
