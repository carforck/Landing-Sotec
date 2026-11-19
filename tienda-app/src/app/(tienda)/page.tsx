import { Suspense } from "react";

import { BandaAyuda } from "@/components/tienda/BandaAyuda";
import { Beneficios } from "@/components/tienda/Beneficios";
import { CarruselBanners } from "@/components/tienda/CarruselBanners";
import { Catalogo } from "@/components/tienda/Catalogo";
import { FilaCategorias } from "@/components/tienda/FilaCategorias";
import { FilasPorCategoria } from "@/components/tienda/FilasPorCategoria";
import { FranjaMarcas } from "@/components/tienda/FranjaMarcas";
import { Promos } from "@/components/tienda/Promos";
import { SelectorSegmento } from "@/components/tienda/SelectorSegmento";

/**
 * Portada por bandas con fondos alternos: hero oscuro con degradado verde (carrusel + promociones) ·
 * segmento y beneficios en verde suave · categorías en blanco · carruseles en gris suave ·
 * marcas en blanco · ayuda en banda oscura · catálogo en blanco.
 */
export default function Inicio() {
  return (
    <>
      <h1 className="sr-only">Tienda virtual SOTEC: tecnología, seguridad electrónica, redes, energía solar, automatización y servicios técnicos</h1>
      <section className="relative overflow-hidden bg-oscuro" aria-label="Promociones destacadas">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,163,14,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(44,132,11,0.25),transparent_50%)]" />
        <div className="contenedor seccion-compacta relative space-y-3 sm:space-y-4">
          <CarruselBanners />
          <Promos />
        </div>
      </section>
      <section className="border-b border-linea bg-marca-suave" aria-label="Segmento y beneficios">
        <div className="contenedor seccion-compacta space-y-5">
          <Suspense fallback={null}>
            <SelectorSegmento />
          </Suspense>
          <Beneficios />
        </div>
      </section>
      <section className="bg-white">
        <div className="contenedor pb-8 pt-10 sm:pb-10 sm:pt-12 lg:pb-12 lg:pt-14">
          <FilaCategorias />
        </div>
      </section>
      <section className="bg-fondo">
        <div className="contenedor space-y-10 py-10 sm:space-y-12 sm:py-12 lg:py-14">
          <Suspense fallback={null}>
            <FilasPorCategoria />
          </Suspense>
        </div>
      </section>
      <section className="bg-white">
        <div className="contenedor py-10 sm:py-12">
          <FranjaMarcas />
        </div>
      </section>
      <BandaAyuda />
      <section className="bg-white">
        <div className="contenedor py-10 sm:py-12 lg:py-16">
          <Suspense fallback={<div aria-busy="true">Cargando catálogo…</div>}>
            <Catalogo />
          </Suspense>
        </div>
      </section>
    </>
  );
}
