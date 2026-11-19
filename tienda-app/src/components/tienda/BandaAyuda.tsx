"use client";

import { MessageCircle } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { enlaceConsulta } from "@/lib/whatsapp";

/** Banda oscura de llamado a la acción. */
export function BandaAyuda() {
  const { config } = useTienda();
  return (
    <section className="bg-oscuro text-white" aria-labelledby="titulo-ayuda">
      <div className="contenedor flex flex-col items-start gap-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
        <div className="max-w-2xl">
          <h2 id="titulo-ayuda" className="titulo-seccion text-white">¿No encuentras lo que necesitas?</h2>
          <p className="mt-2 text-white/80">Cuéntanos tu proyecto: diseñamos la solución en energía solar, seguridad o redes y te enviamos la cotización.</p>
        </div>
        <a href={enlaceConsulta(config)} target="_blank" rel="noopener noreferrer" className="btn shrink-0 bg-white px-5 text-base text-tinta hover:bg-marca-suave">
          <MessageCircle className="h-5 w-5 text-marca-btn" aria-hidden /> Hablar con un asesor
        </a>
      </div>
    </section>
  );
}
