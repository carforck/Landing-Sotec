"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, MessageCircle, ShoppingCart } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { resumen } from "@/lib/carrito";
import { enlaceConsulta } from "@/lib/whatsapp";

/** Navegación inferior fija en móvil. En la ficha no se muestra: allí va la barra de compra. */
export function BarraInferiorMovil() {
  const { carrito, abrirCarrito, config } = useTienda();
  const ruta = usePathname();
  if (ruta.startsWith("/producto/")) return null;
  const { unidades } = resumen(carrito);
  const item = "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold";
  return (
    <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden" data-barra-inferior>
      <div className="flex">
        <Link href="/" className={`${item} ${ruta === "/" ? "text-marca-oscuro" : "text-tenue"}`} aria-current={ruta === "/" ? "page" : undefined}>
          <House className="h-5 w-5" aria-hidden /> Inicio
        </Link>
        <Link href="/#categorias" className={`${item} text-tenue`}>
          <LayoutGrid className="h-5 w-5" aria-hidden /> Categorías
        </Link>
        <button type="button" onClick={abrirCarrito} className={`${item} relative text-tenue`} aria-label={`Carrito, ${unidades} producto${unidades === 1 ? "" : "s"}`} data-barra-carrito>
          <span className="relative">
            <ShoppingCart className="h-5 w-5" aria-hidden />
            <span className="absolute -right-3 -top-2 min-w-[1.25rem] rounded-full bg-marca-btn px-1 text-center text-[10px] font-bold leading-5 text-white" data-contador-barra>{unidades}</span>
          </span>
          Carrito
        </button>
        <a href={enlaceConsulta(config)} target="_blank" rel="noopener noreferrer" className={`${item} text-[#16773f]`}>
          <MessageCircle className="h-5 w-5" aria-hidden /> WhatsApp
        </a>
      </div>
    </nav>
  );
}
