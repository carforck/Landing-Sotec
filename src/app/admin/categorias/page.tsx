"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import type { Categoria } from "@/lib/tipos";

export default function Categorias() {
  const { repo, recargar } = useTienda();
  const [cats, setCats] = useState<Categoria[]>([]);
  const [nueva, setNueva] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (repo) setCats(await repo.categorias({ todas: true }));
  }, [repo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function hacer(f: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await f();
      await Promise.all([cargar(), recargar()]);
      setMsg(ok);
    } catch (e) {
      setMsg(e instanceof ErrorDatos ? e.message : "No se pudo completar.");
    }
  }

  const editar = (id: string, c: Partial<Categoria>) => setCats((xs) => xs.map((x) => (x.id === id ? { ...x, ...c } : x)));

  return (
    <>
      <h1 className="text-2xl font-bold">Categorías</h1>
      <form
        className="tarjeta flex flex-wrap gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const nombre = nueva.trim();
          if (nombre.length < 3 || !repo) return;
          void hacer(async () => {
            await repo.guardarCategoria({ id: nuevoId("cat"), nombre, imagen: "", orden: cats.reduce((m, c) => Math.max(m, c.orden), 0) + 1, activa: true });
            setNueva("");
          }, `Categoría «${nombre}» creada.`);
        }}
      >
        <label htmlFor="nueva" className="sr-only">Nombre de la nueva categoría</label>
        <input id="nueva" className="campo flex-1" placeholder="Nueva categoría" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button type="submit" className="btn-primario"><Plus className="h-4 w-4" aria-hidden /> Agregar</button>
      </form>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <ul className="space-y-2">
        {cats.map((c) => (
          <li key={c.id} className="tarjeta flex flex-wrap items-center gap-2 p-3">
            <label className="sr-only" htmlFor={`n-${c.id}`}>Nombre</label>
            <input id={`n-${c.id}`} className="campo min-w-[12rem] flex-1" value={c.nombre} onChange={(e) => editar(c.id, { nombre: e.target.value })} />
            <label className="sr-only" htmlFor={`o-${c.id}`}>Orden</label>
            <input id={`o-${c.id}`} type="number" className="campo w-20" value={c.orden} onChange={(e) => editar(c.id, { orden: Number(e.target.value) || 0 })} />
            <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-tinta">
              <input type="checkbox" className="h-5 w-5 accent-marca-btn" checked={c.activa} onChange={(e) => editar(c.id, { activa: e.target.checked })} /> Visible
            </label>
            <button type="button" className="btn-secundario px-3" onClick={() => repo && void hacer(() => repo.guardarCategoria({ ...c, nombre: c.nombre.trim() }), "Guardado.")} aria-label={`Guardar ${c.nombre}`}>
              <Save className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" className="btn-peligro px-3" onClick={() => repo && window.confirm(`¿Eliminar «${c.nombre}»?`) && void hacer(() => repo.eliminarCategoria(c.id), "Eliminada.")} aria-label={`Eliminar ${c.nombre}`}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
