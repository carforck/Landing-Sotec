"use client";

import { useMemo, useState } from "react";
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
  const [busqueda, setBusqueda] = useState("");

  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  const visibles = useMemo(() => {
    const q = normal(busqueda.trim());
    return productos.filter(
      (p) => (!categoria || p.categoriaId === categoria) && (!q || normal(`${p.nombre} ${p.descripcion} ${nombreCat.get(p.categoriaId) ?? ""}`).includes(q)),
    );
  }, [productos, categoria, busqueda, nombreCat]);
  const destacados = productos.filter((p) => p.destacado);

  const elegir = (id: string) => {
    const q = new URLSearchParams(params.toString());
    if (id) q.set("categoria", id);
    else q.delete("categoria");
    router.replace(`${ruta}${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  if (!listo) return <div className="contenedor py-10" aria-busy="true">Cargando catálogo…</div>;
  if (error) return <div className="contenedor py-10 text-red-700" role="alert">{error}</div>;

  return (
    <div className="contenedor py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Catálogo</h2>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Buscar productos</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" aria-hidden />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto…" className="campo pl-9" />
        </label>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por categoría">
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

      {!categoria && !busqueda && destacados.length > 0 && (
        <section className="mt-6" aria-labelledby="destacados">
          <h3 id="destacados" className="text-lg font-bold">Destacados</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destacados.slice(0, 4).map((p) => (
              <TarjetaProducto key={p.id} producto={p} categoria={nombreCat.get(p.categoriaId)} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="todos">
        <h3 id="todos" className="text-lg font-bold">
          {categoria ? nombreCat.get(categoria) ?? "Productos" : "Todos los productos"} <span className="font-normal text-tenue">({visibles.length})</span>
        </h3>
        {visibles.length ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-grilla>
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
