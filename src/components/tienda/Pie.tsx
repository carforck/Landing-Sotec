import { SITIO_SOTEC } from "@/lib/rutas";

export function Pie() {
  return (
    <footer className="mt-16 bg-oscuro text-sm text-white/75">
      <div className="contenedor grid gap-6 py-10 sm:grid-cols-3">
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
          <a className="mt-2 inline-block underline underline-offset-4 hover:text-white" href={SITIO_SOTEC}>sotecse.com</a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">Precios en pesos colombianos (COP), sujetos a confirmación. © {new Date().getFullYear()} SOTEC</div>
    </footer>
  );
}
