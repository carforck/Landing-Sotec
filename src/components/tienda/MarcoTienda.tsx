import type { ReactNode } from "react";

import { Aviso } from "./Aviso";
import { BarraContacto } from "./BarraContacto";
import { BarraInferiorMovil } from "./BarraInferiorMovil";
import { BotonWhatsApp } from "./BotonWhatsApp";
import { CarritoLateral } from "./CarritoLateral";
import { Encabezado } from "./Encabezado";
import { Pie } from "./Pie";

export function MarcoTienda({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Saltar al contenido
      </a>
      <BarraContacto />
      <Encabezado />
      <main id="contenido">{children}</main>
      <Pie />
      {/* Espacio para la barra inferior fija en móvil */}
      <div className="h-16 md:hidden" aria-hidden />
      <BotonWhatsApp />
      <BarraInferiorMovil />
      <Aviso />
      <CarritoLateral />
    </>
  );
}
