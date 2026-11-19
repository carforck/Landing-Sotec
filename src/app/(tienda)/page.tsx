import { Suspense } from "react";

import { Catalogo } from "@/components/tienda/Catalogo";

export default function Inicio() {
  return (
    <>
      <section className="bg-fondo">
        <div className="contenedor py-10 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-marca-oscuro">Tienda virtual SOTEC</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">Arma tu pedido y cotízalo por WhatsApp</h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg">
            Energía solar, seguridad electrónica, CCTV, redes y automatización con instalación profesional. Agrega lo que necesitas al carrito y te confirmamos precio y disponibilidad.
          </p>
        </div>
      </section>
      <Suspense fallback={<div className="contenedor py-10">Cargando catálogo…</div>}>
        <Catalogo />
      </Suspense>
    </>
  );
}
