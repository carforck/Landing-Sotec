"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { CampoImagen } from "@/components/admin/CampoImagen";
import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import type { Marca } from "@/lib/tipos";

export default function Marcas() {
  const { repo, recargar } = useTienda();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [nueva, setNueva] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (repo) setMarcas(await repo.marcas({ todas: true }));
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
  const editar = (id: string, c: Partial<Marca>) => setMarcas((xs) => xs.map((x) => (x.id === id ? { ...x, ...c } : x)));

  return (
    <>
      <h1 className="text-2xl font-bold">Marcas</h1>
      <p className="text-sm">Aparecen en la franja de marcas de la portada y filtran el catálogo. El logo es opcional: sin logo se muestra el nombre.</p>
      <form
        className="tarjeta flex flex-wrap gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const nombre = nueva.trim();
          if (!nombre || !repo) return;
          void hacer(async () => {
            await repo.guardarMarca({ id: nuevoId("mar"), nombre, logo: "", orden: marcas.reduce((m, x) => Math.max(m, x.orden), 0) + 1, activa: true });
            setNueva("");
          }, `Marca «${nombre}» creada.`);
        }}
      >
        <label htmlFor="nueva-marca" className="sr-only">Nombre de la nueva marca</label>
        <input id="nueva-marca" className="campo flex-1" placeholder="Nueva marca" maxLength={60} value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button type="submit" className="btn-primario"><Plus className="h-4 w-4" aria-hidden /> Agregar</button>
      </form>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <ul className="space-y-2">
        {marcas.map((m) => (
          <li key={m.id} className="tarjeta flex flex-wrap items-end gap-3 p-3" data-admin-marca={m.id}>
            <div className="min-w-[12rem] flex-1">
              <label className="etiqueta" htmlFor={`m-${m.id}`}>Nombre</label>
              <input id={`m-${m.id}`} className="campo" value={m.nombre} maxLength={60} onChange={(e) => editar(m.id, { nombre: e.target.value })} />
            </div>
            <CampoImagen etiqueta="Logo" opcional valor={m.logo} alCambiar={(v) => editar(m.id, { logo: v })} dataId={`marca-${m.id}`} ancho="w-24" />
            <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-tinta">
              <input type="checkbox" className="h-5 w-5 accent-marca-btn" checked={m.activa} onChange={(e) => editar(m.id, { activa: e.target.checked })} /> Visible
            </label>
            <button type="button" className="btn-secundario px-3" onClick={() => repo && void hacer(() => repo.guardarMarca({ ...m, nombre: m.nombre.trim() }), "Guardado.")} aria-label={`Guardar ${m.nombre}`}>
              <Save className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" className="btn-peligro px-3" onClick={() => repo && window.confirm(`¿Eliminar «${m.nombre}»? Los productos quedan sin marca.`) && void hacer(() => repo.eliminarMarca(m.id), "Eliminada.")} aria-label={`Eliminar ${m.nombre}`}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
        {!marcas.length && <li className="tarjeta p-6 text-center text-sm">No hay marcas. La franja de marcas no se muestra.</li>}
      </ul>
    </>
  );
}
