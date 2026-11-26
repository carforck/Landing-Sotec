"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Circle, CircleCheck, CircleDot, PartyPopper } from "lucide-react";

export type EstadoPaso = "hecho" | "pendiente" | "revisar";

export interface PasoGuia {
  id: string;
  titulo: string;
  detalle: string;
  estado: EstadoPaso;
  href: string;
  boton: string;
  opcional?: boolean;
}

const CLAVE_OCULTA = "sotec-tienda-guia-oculta";

/** Checklist «Guía para poner en marcha la tienda» con progreso. Se puede contraer cuando todo está listo. */
export function InicioGuia({ pasos }: { pasos: PasoGuia[] }) {
  const obligatorios = pasos.filter((p) => !p.opcional);
  const listos = obligatorios.filter((p) => p.estado === "hecho").length;
  const completa = listos === obligatorios.length;
  const [abierta, setAbierta] = useState(true);

  // Si todo está listo y la persona la contrajo antes, se recuerda contraída.
  useEffect(() => {
    if (!completa) return setAbierta(true);
    try {
      setAbierta(localStorage.getItem(CLAVE_OCULTA) !== "1");
    } catch {
      /* sin almacenamiento */
    }
  }, [completa]);

  function alternar() {
    const nueva = !abierta;
    setAbierta(nueva);
    try {
      if (nueva) localStorage.removeItem(CLAVE_OCULTA);
      else localStorage.setItem(CLAVE_OCULTA, "1");
    } catch {
      /* sin almacenamiento */
    }
  }

  const porcentaje = obligatorios.length ? Math.round((listos / obligatorios.length) * 100) : 100;

  return (
    <section className="tarjeta p-4 sm:p-5" aria-labelledby="titulo-guia" data-guia-inicio>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="titulo-guia" className="flex items-center gap-2 text-lg font-bold">
            {completa && <PartyPopper className="h-5 w-5 text-marca-btn" aria-hidden />}
            Guía para poner en marcha la tienda
          </h2>
          <p className="mt-0.5 text-sm">
            {completa ? "¡Listo! La tienda tiene todo lo básico. Puedes ocultar esta guía." : "Sigue estos pasos en orden. Cada botón te lleva a la pantalla donde se hace."}
          </p>
        </div>
        {completa && (
          <button type="button" className="btn-secundario" aria-expanded={abierta} aria-controls="pasos-guia" onClick={alternar} data-alternar-guia>
            {abierta ? "Ocultar guía" : "Ver guía"}
            <ChevronDown className={`h-4 w-4 transition-transform ${abierta ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-tinta" data-progreso-guia>
          {listos} de {obligatorios.length} listos
        </p>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-fondo" role="progressbar" aria-valuemin={0} aria-valuemax={obligatorios.length} aria-valuenow={listos} aria-label="Avance de la guía">
          <div className="h-full rounded-full bg-marca-btn transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
      </div>

      {abierta && (
        <ol id="pasos-guia" className="mt-4 divide-y divide-linea">
          {pasos.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center" data-paso-guia={p.id} data-estado={p.estado}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <IconoEstado estado={p.estado} />
                <div className="min-w-0">
                  <p className={`font-semibold ${p.estado === "hecho" ? "text-tenue line-through decoration-1" : "text-tinta"}`}>
                    {p.titulo}
                    {p.opcional && <span className="ml-2 rounded-full bg-fondo px-2 py-0.5 text-xs font-medium text-tenue no-underline">Opcional</span>}
                  </p>
                  <p className="text-sm">{p.detalle}</p>
                </div>
              </div>
              <Link href={p.href} className={`${p.estado === "hecho" ? "btn-secundario" : "btn-primario"} w-full shrink-0 sm:w-auto`}>
                {p.boton}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function IconoEstado({ estado }: { estado: EstadoPaso }) {
  if (estado === "hecho")
    return (
      <span className="mt-0.5 shrink-0 text-marca-btn" title="Hecho">
        <CircleCheck className="h-6 w-6" aria-hidden />
        <span className="sr-only">Hecho:</span>
      </span>
    );
  if (estado === "revisar")
    return (
      <span className="mt-0.5 shrink-0 text-amber-600" title="Por revisar">
        <CircleDot className="h-6 w-6" aria-hidden />
        <span className="sr-only">Por revisar:</span>
      </span>
    );
  return (
    <span className="mt-0.5 shrink-0 text-tenue" title="Pendiente">
      <Circle className="h-6 w-6" aria-hidden />
      <span className="sr-only">Pendiente:</span>
    </span>
  );
}
