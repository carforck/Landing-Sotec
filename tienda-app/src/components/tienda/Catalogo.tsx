"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";
import { filtrar, filtrosDeUrl } from "@/lib/filtros";
import { ETIQUETA_SEGMENTO } from "@/lib/tipos";

function Chip({ activa, onClick, children, data }: { activa: boolean; onClick: () => void; children: React.ReactNode; data?: string }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      data-filtro={data}
      className={`btn whitespace-nowrap rounded-full border px-3 ${activa ? "border-marca-btn bg-marca-btn text-white" : "border-linea bg-white text-tinta hover:bg-fondo"}`}
    >
      {children}
    </button>
  );
}

export function Catalogo() {
  const { listo, error, categorias, productos, marcas } = useTienda();
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const f = filtrosDeUrl(params);
  const [busqueda, setBusqueda] = useState(f.q ?? "");
  useEffect(() => setBusqueda(f.q ?? ""), [f.q]);

  const nombres = useMemo(() => ({ categoria: new Map(categorias.map((c) => [c.id, c.nombre])), marca: new Map(marcas.map((m) => [m.id, m.nombre])) }), [categorias, marcas]);
  const visibles = useMemo(() => filtrar(productos, { ...f, q: busqueda }, nombres), [productos, f.categoria, f.tipo, f.segmento, f.marca, busqueda, nombres]); // eslint-disable-line react-hooks/exhaustive-deps

  const poner = (clave: string, valor: string) => {
    const q = new URLSearchParams(params.toString());
    if (valor) q.set(clave, valor);
    else q.delete(clave);
    router.replace(`${ruta}${q.size ? `?${q}` : ""}#catalogo`, { scroll: false });
  };
  const hayFiltros = Boolean(f.categoria || f.tipo || f.segmento || f.marca || busqueda);

  if (!listo) return <div aria-busy="true">Cargando catálogo…</div>;
  if (error) return <div className="text-red-700" role="alert">{error}</div>;

  return (
    <div id="catalogo" className="scroll-mt-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="titulo-seccion">Catálogo completo</h2>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Buscar en el catálogo</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" aria-hidden />
          <input type="search" data-buscar-catalogo value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en el catálogo…" className="campo pl-9" />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" role="group" aria-label="Filtrar por categoría">
          <div className="flex w-max gap-2 pb-1 lg:w-auto lg:flex-wrap">
            <Chip activa={!f.categoria} onClick={() => poner("categoria", "")} data="cat-todo">Todas las categorías</Chip>
            {categorias.map((c) => (
              <Chip key={c.id} activa={f.categoria === c.id} onClick={() => poner("categoria", c.id)} data={c.id}>{c.nombre}</Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Productos o servicios">
            <Chip activa={!f.tipo} onClick={() => poner("tipo", "")} data="tipo-todo">Todo</Chip>
            <Chip activa={f.tipo === "producto"} onClick={() => poner("tipo", "producto")} data="tipo-producto">Productos</Chip>
            <Chip activa={f.tipo === "servicio"} onClick={() => poner("tipo", "servicio")} data="tipo-servicio">Servicios</Chip>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Para hogar o empresa">
            <Chip activa={!f.segmento} onClick={() => poner("segmento", "")} data="seg-todo">Hogar y empresas</Chip>
            <Chip activa={f.segmento === "hogar"} onClick={() => poner("segmento", "hogar")} data="seg-hogar">{ETIQUETA_SEGMENTO.hogar}</Chip>
            <Chip activa={f.segmento === "empresa"} onClick={() => poner("segmento", "empresa")} data="seg-empresa">{ETIQUETA_SEGMENTO.empresa}</Chip>
          </div>
          {marcas.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-semibold text-tinta">
              Marca
              <select className="campo w-auto py-1" value={f.marca} onChange={(e) => poner("marca", e.target.value)} data-filtro-marca>
                <option value="">Todas</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <section className="mt-6" aria-labelledby="todos">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="todos" className="text-base font-bold sm:text-lg" aria-live="polite">
            {visibles.length} resultado{visibles.length === 1 ? "" : "s"}
          </h3>
          {hayFiltros && (
            <button
              type="button"
              className="btn px-2 text-sm text-marca-oscuro hover:underline"
              onClick={() => {
                setBusqueda("");
                router.replace(`${ruta}#catalogo`, { scroll: false });
              }}
              data-quitar-filtros
            >
              <X className="h-4 w-4" aria-hidden /> Quitar filtros
            </button>
          )}
        </div>
        {visibles.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5" data-grilla>
            {visibles.map((p) => (
              <TarjetaProducto key={p.id} producto={p} categoria={nombres.categoria.get(p.categoriaId)} />
            ))}
          </div>
        ) : (
          <p className="tarjeta mt-4 p-6 text-center">No hay resultados con estos filtros. Prueba con otros o escríbenos por WhatsApp.</p>
        )}
      </section>
    </div>
  );
}
