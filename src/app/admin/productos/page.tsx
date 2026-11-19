"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Star, Trash2, TriangleAlert } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos } from "@/lib/datos";
import { ImagenProducto } from "@/components/tienda/ImagenProducto";
import { textoPrecio } from "@/lib/formato";
import { esEjemplo } from "@/lib/semilla";
import type { Categoria, Producto } from "@/lib/tipos";

export default function Productos() {
  const { repo, recargar } = useTienda();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!repo) return;
    const [ps, cs] = await Promise.all([repo.productos({ todos: true }), repo.categorias({ todas: true })]);
    setProductos(ps);
    setCategorias(cs);
  }, [repo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  const visibles = productos.filter((p) => !filtro || p.nombre.toLowerCase().includes(filtro.toLowerCase()));

  async function eliminar(p: Producto) {
    if (!repo || !window.confirm(`¿Eliminar «${p.nombre}»? No se puede deshacer.`)) return;
    try {
      await repo.eliminarProducto(p.id);
      await Promise.all([cargar(), recargar()]);
    } catch (e) {
      setError(e instanceof ErrorDatos ? e.message : "No se pudo eliminar.");
    }
  }

  const hayEjemplos = productos.some((p) => esEjemplo(p.id));

  async function borrarEjemplos() {
    if (!repo?.borrarCatalogoEjemplo || !window.confirm("¿Borrar todos los productos, servicios, banners y marcas de ejemplo? Las categorías se conservan.")) return;
    try {
      await repo.borrarCatalogoEjemplo();
      await Promise.all([cargar(), recargar()]);
    } catch (e) {
      setError(e instanceof ErrorDatos ? e.message : "No se pudo borrar.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Productos y servicios</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/productos/editar" className="btn-primario">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo producto
          </Link>
          <Link href="/admin/productos/editar?tipo=servicio" className="btn-secundario">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo servicio
          </Link>
        </div>
      </div>
      {hayEjemplos && (
        <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950" data-aviso-ejemplo>
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span><strong>Catálogo de ejemplo:</strong> reemplázalo desde el panel. Los ítems marcados «Ejemplo» son ficticios.</span>
          </p>
          {repo?.borrarCatalogoEjemplo && (
            <button type="button" className="btn-peligro" onClick={() => void borrarEjemplos()} data-borrar-ejemplo>
              <Trash2 className="h-4 w-4" aria-hidden /> Borrar catálogo de ejemplo
            </button>
          )}
        </div>
      )}
      <label className="block max-w-sm">
        <span className="sr-only">Buscar</span>
        <input type="search" className="campo" placeholder="Buscar por nombre…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <ul className="space-y-2" data-lista-productos>
        {visibles.map((p) => (
          <li key={p.id} className="tarjeta flex items-center gap-3 p-3" data-admin-producto={p.id}>
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
              <ImagenProducto src={p.imagenes[0]} categoriaId={p.categoriaId} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold text-tinta">
                {p.destacado && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" aria-label="Destacado" />}
                <span className="truncate">{p.nombre}</span>
              </p>
              <p className="text-sm">
                {p.tipo === "servicio" && <span className="mr-2 rounded bg-violet-700 px-1.5 py-0.5 text-xs font-bold text-white">Servicio</span>}
                {esEjemplo(p.id) && <span className="mr-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-semibold text-sky-900">Ejemplo</span>}
                {nombreCat.get(p.categoriaId) ?? "Sin categoría"} · {textoPrecio(p.precio, p.tipo)}
                {!p.activo && <span className="ml-2 rounded bg-linea px-1.5 py-0.5 text-xs font-semibold">Oculto</span>}
              </p>
            </div>
            <Link href={`/admin/productos/editar?id=${encodeURIComponent(p.id)}`} className="btn-secundario px-3" aria-label={`Editar ${p.nombre}`}>
              <Pencil className="h-4 w-4" aria-hidden />
            </Link>
            <button type="button" className="btn-peligro px-3" onClick={() => eliminar(p)} aria-label={`Eliminar ${p.nombre}`}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
        {!visibles.length && <li className="tarjeta p-6 text-center text-sm">No hay productos ni servicios. Crea el primero con «Nuevo producto» o «Nuevo servicio».</li>}
      </ul>
    </>
  );
}
