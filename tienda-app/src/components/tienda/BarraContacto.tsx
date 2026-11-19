"use client";

import { Mail, MessageCircle } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { enlaceConsulta } from "@/lib/whatsapp";

/** Franja delgada superior, estática (sin marquesina), oculta en móvil. */
export function BarraContacto() {
  const { config } = useTienda();
  return (
    <div className="hidden bg-oscuro text-xs text-white/85 md:block" data-barra-contacto>
      <div className="contenedor flex h-9 items-center justify-between gap-4">
        <p>Instalación profesional y asesoría técnica sin costo</p>
        <div className="flex items-center gap-5">
          <a href={enlaceConsulta(config)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white hover:underline">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> ¿Necesitas ayuda? Escríbenos por WhatsApp
          </a>
          <a href="mailto:info@sotecse.com" className="flex items-center gap-1.5 hover:text-white hover:underline">
            <Mail className="h-3.5 w-3.5" aria-hidden /> info@sotecse.com
          </a>
        </div>
      </div>
    </div>
  );
}
