import Link from "next/link";
import { Settings } from "lucide-react";

import { PANEL_DISPONIBLE } from "@/lib/datos/modo";
import { SITIO_SOTEC } from "@/lib/rutas";

export function Pie() {
  return (
    <footer className="bg-oscuro text-sm text-white/80">
      <div className="contenedor grid gap-8 py-12 sm:grid-cols-2 sm:py-14 lg:grid-cols-3">
        <div>
          <p className="font-titulo text-base font-bold text-white">SOTEC</p>
          <p className="mt-2">Soluciones tecnológicas en energía solar, seguridad electrónica, CCTV, redes y automatización.</p>
        </div>
        <div>
          <p className="font-semibold text-white">Cómo comprar</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Agrega productos al carrito.</li>
            <li>Escribe tus datos.</li>
            <li>Envía el pedido por WhatsApp y te confirmamos precio y disponibilidad.</li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-white">Contacto</p>
          <p className="mt-2">info@sotecse.com</p>
          <a className="mt-2 inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-white" href={SITIO_SOTEC}>sotecse.com</a>
          {PANEL_DISPONIBLE && (
            <Link href="/admin" className="mt-1 flex min-h-[44px] items-center gap-2 text-white/80 underline-offset-4 hover:text-white hover:underline" data-enlace-admin="pie">
              <Settings className="h-4 w-4" aria-hidden /> Administrar tienda
            </Link>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs">Precios en pesos colombianos (COP), sujetos a confirmación. © {new Date().getFullYear()} SOTEC</div>
    </footer>
  );
}
