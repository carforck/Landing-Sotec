"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { ICONOS, iconoDe } from "@/lib/iconos";

/**
 * Ícono de la categoría: el botón muestra el actual y abre una cuadrícula para elegir otro
 * (con su nombre debajo). Pensado para ir dentro de una fila `flex-wrap`: la cuadrícula ocupa
 * la fila completa.
 */
export function SelectorIcono({ valor, alCambiar, nombre }: { valor: string; alCambiar: (clave: string) => void; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const Icono = iconoDe(valor);
  return (
    <>
      <button
        type="button"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-marca-suave text-marca-oscuro transition-colors hover:border-marca-btn ${abierto ? "border-marca-btn" : "border-transparent"}`}
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label={`Cambiar el ícono de ${nombre}`}
        title="Cambiar ícono"
        data-icono={valor}
      >
        <Icono className="h-5 w-5" aria-hidden />
      </button>
      {abierto && (
        <div className="order-last w-full rounded-xl border border-linea bg-fondo p-3">
          <p className="mb-2 text-sm font-semibold text-tinta">Elige el ícono (se ve cuando la categoría no tiene foto):</p>
          <ul className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-6 lg:grid-cols-9" role="list">
            {ICONOS.map(({ clave, nombre: n, Icono: I }) => {
              const elegido = clave === valor;
              return (
                <li key={clave}>
                  <button
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => {
                      alCambiar(clave);
                      setAbierto(false);
                    }}
                    className={`relative flex h-full min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-xl border bg-white p-2 text-center text-[11px] leading-tight transition-colors hover:border-marca-btn ${elegido ? "border-marca-btn ring-2 ring-marca-btn" : "border-linea"}`}
                  >
                    <I className="h-5 w-5 text-marca-oscuro" aria-hidden />
                    <span className="text-tinta">{n}</span>
                    {elegido && <Check className="absolute right-1 top-1 h-3.5 w-3.5 text-marca-btn" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn mt-2 px-3 text-tenue hover:text-tinta" onClick={() => setAbierto(false)}>Cerrar</button>
        </div>
      )}
    </>
  );
}
