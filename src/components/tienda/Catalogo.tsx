"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Catalogo() {
  const { listo, error, categorias, productos } = useTienda();
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const categoria = params.get("categoria") ?? "";
  const qUrl = params.get("q") ?? "";
  const [busqueda, setBusqueda] = useState(qUrl);
  useEffect(() => setBusqueda(qUrl), [qUrl]);

  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  const visibles = useMemo(() => {
    const q = normal(busqueda.trim());
    return productos.filter(
      (p) => (!categoria || p.categoriaId === categoria) && (!q || normal(`${p.nombre} ${p.descripcion} ${nombreCat.get(p.categoriaId) ?? ""}`).includes(q)),
    );
  }, [productos, categoria, busqueda, nombreCat]);

  const elegir = (id: string) => {
    const q = new URLSearchParams(params.toString());
    if (id) q.set("categoria", id);
    else q.delete("categoria");
    router.replace(`${ruta}${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  if (!listo) return <div aria-busy="true">Cargando catálogo…</div>;
  if (error) return <div className="text-red-700" role="alert">{error}</div>;

  return (
    <div id="catalogo" className="scroll-mt-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="titulo-seccion">Catálogo completo</h2>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Buscar productos</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" aria-hidden />
          <input type="search" data-buscar-catalogo value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto…" className="campo pl-9" />
        </label>
      </div>

      <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" role="group" aria-label="Filtrar por categoría">
        <div className="flex w-max gap-2 pb-2 sm:w-auto sm:flex-wrap">
          {[{ id: "", nombre: "Todo" }, ...categorias].map((c) => {
            const activa = categoria === c.id;
            return (
              <button
                key={c.id || "todo"}
                type="button"
                data-categoria={c.id || "todo"}
                aria-pressed={activa}
                onClick={() => elegir(c.id)}
                className={`btn whitespace-nowrap rounded-full border ${activa ? "border-marca-btn bg-marca-btn text-white" : "border-linea bg-white text-tinta hover:bg-fondo"}`}
              >
                {c.nombre}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-6" aria-labelledby="todos">
        <h3 id="todos" className="text-base font-bold sm:text-lg">
          {categoria ? nombreCat.get(categoria) ?? "Productos" : "Todos los productos"} <span className="font-normal text-tenue">({visibles.length})</span>
        </h3>
        {visibles.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5" data-grilla>
            {visibles.map((p) => (
              <TarjetaProducto key={p.id} producto={p} categoria={nombreCat.get(p.categoriaId)} />
            ))}
          </div>
        ) : (
          <p className="tarjeta mt-3 p-6 text-center">No hay productos que coincidan. Prueba con otra búsqueda o escríbenos por WhatsApp.</p>
        )}
      </section>
    </div>
  );
}
