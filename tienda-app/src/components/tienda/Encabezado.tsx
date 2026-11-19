"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Settings, ShoppingCart } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { resumen } from "@/lib/carrito";
import { SITIO_SOTEC, urlImagen } from "@/lib/rutas";

function Buscador({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    const t = q.trim();
    router.push(t ? `/?q=${encodeURIComponent(t)}#catalogo` : "/#catalogo");
  }

  return (
    <form role="search" onSubmit={buscar} className="flex w-full">
      <label htmlFor={id} className="sr-only">Buscar productos</label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar paneles, cámaras, alarmas…"
        className="min-h-[46px] w-full min-w-0 rounded-l-xl border border-r-0 border-linea bg-white px-4 text-base text-tinta placeholder:text-tenue focus:border-marca-btn"
        data-buscador
      />
      <button type="submit" className="flex min-h-[46px] w-12 shrink-0 items-center justify-center rounded-r-xl bg-marca-btn text-white hover:bg-marca-oscuro" aria-label="Buscar">
        <Search className="h-5 w-5" aria-hidden />
      </button>
    </form>
  );
}

export function Encabezado() {
  const { carrito, abrirCarrito, carritoAbierto } = useTienda();
  const { unidades } = resumen(carrito);
  const boton = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);

  // Al cerrar el carrito lateral, el foco vuelve al botón que lo abrió
  useEffect(() => {
    if (estabaAbierto.current && !carritoAbierto) boton.current?.focus();
    estabaAbierto.current = carritoAbierto;
  }, [carritoAbierto]);

  return (
    <header className="sticky top-0 z-30 border-b border-linea bg-white/95 shadow-sm backdrop-blur">
      <div className="contenedor flex h-[72px] items-center gap-3 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Tienda SOTEC, inicio">
          <img src={urlImagen("/img/logo-sotec.webp")} alt="SOTEC" width={150} height={48} className="h-10 w-auto sm:h-12" />
          <span className="hidden rounded-full bg-marca-suave px-2 py-0.5 text-xs font-semibold text-marca-oscuro lg:inline">Tienda</span>
        </Link>
        <div className="hidden flex-1 md:block">
          <Suspense fallback={null}>
            <Buscador id="buscar-escritorio" />
          </Suspense>
        </div>
        <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Principal">
          <Link href="/admin" className="btn w-11 px-0 text-tenue hover:bg-fondo hover:text-tinta lg:w-auto lg:px-3" aria-label="Administrar tienda" title="Administrar tienda" data-enlace-admin="encabezado">
            <Settings className="h-5 w-5 lg:h-4 lg:w-4" aria-hidden />
            <span className="hidden text-xs font-medium lg:inline">Administrar tienda</span>
          </Link>
          <a href={SITIO_SOTEC} className="btn w-11 px-0 text-tenue hover:bg-fondo hover:text-tinta xl:w-auto xl:px-3" aria-label="Volver a sotecse.com">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden text-xs font-medium xl:inline">sotecse.com</span>
          </a>
          <button
            ref={boton}
            type="button"
            onClick={abrirCarrito}
            className="btn-primario relative"
            aria-haspopup="dialog"
            aria-expanded={carritoAbierto}
            aria-label={`Abrir carrito, ${unidades} producto${unidades === 1 ? "" : "s"}`}
            data-abrir-carrito
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">Carrito</span>
            <span data-contador className="min-w-[1.5rem] rounded-full bg-white px-1.5 text-center text-xs font-bold text-marca-oscuro">{unidades}</span>
          </button>
        </nav>
      </div>
      <div className="contenedor pb-3 md:hidden">
        <Suspense fallback={null}>
          <Buscador id="buscar-movil" />
        </Suspense>
      </div>
    </header>
  );
}
