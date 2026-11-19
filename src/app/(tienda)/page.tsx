import { Suspense } from "react";

import { Beneficios } from "@/components/tienda/Beneficios";
import { BandaAyuda } from "@/components/tienda/BandaAyuda";
import { CarruselBanners } from "@/components/tienda/CarruselBanners";
import { Catalogo } from "@/components/tienda/Catalogo";
import { FilaCategorias } from "@/components/tienda/FilaCategorias";
import { FilasPorCategoria } from "@/components/tienda/FilasPorCategoria";

/**
 * Portada por bandas con fondos alternos: hero oscuro con degradado verde (banners) · beneficios en
 * verde suave · categorías en blanco · carruseles en gris suave · ayuda en banda oscura · catálogo en blanco.
 */
export default function Inicio() {
  return (
    <>
      <h1 className="sr-only">Tienda virtual SOTEC: energía solar, seguridad electrónica, CCTV, redes y automatización</h1>
      <section className="relative overflow-hidden bg-oscuro" aria-label="Promociones destacadas">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,163,14,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(44,132,11,0.25),transparent_50%)]" />
        <div className="contenedor seccion-compacta relative">
          <CarruselBanners />
        </div>
      </section>
      <section className="border-b border-linea bg-marca-suave" aria-label="Beneficios">
        <div className="contenedor seccion-compacta">
          <Beneficios />
        </div>
      </section>
      {/* Categorías: padding inferior menor para no dejar hueco antes de Destacados */}
      <section className="bg-white">
        <div className="contenedor pb-8 pt-10 sm:pb-10 sm:pt-12 lg:pb-12 lg:pt-14">
          <FilaCategorias />
        </div>
      </section>
      <section className="bg-fondo">
        <div className="contenedor space-y-10 py-10 sm:space-y-12 sm:py-12 lg:py-14">
          <FilasPorCategoria />
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
