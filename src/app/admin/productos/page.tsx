"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos } from "@/lib/datos";
import { textoPrecio } from "@/lib/formato";
import { urlImagen } from "@/lib/rutas";
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Link href="/admin/productos/editar" className="btn-primario">
          <Plus className="h-4 w-4" aria-hidden /> Nuevo producto
        </Link>
      </div>
      <label className="block max-w-sm">
        <span className="sr-only">Buscar</span>
        <input type="search" className="campo" placeholder="Buscar por nombre…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <ul className="space-y-2" data-lista-productos>
        {visibles.map((p) => (
          <li key={p.id} className="tarjeta flex items-center gap-3 p-3" data-admin-producto={p.id}>
            <img src={urlImagen(p.imagenes[0])} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold text-tinta">
                {p.destacado && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" aria-label="Destacado" />}
                <span className="truncate">{p.nombre}</span>
              </p>
              <p className="text-sm">
                {nombreCat.get(p.categoriaId) ?? "Sin categoría"} · {textoPrecio(p.precio)}
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
        {!visibles.length && <li className="tarjeta p-6 text-center text-sm">No hay productos.</li>}
      </ul>
    </>
  );
}
