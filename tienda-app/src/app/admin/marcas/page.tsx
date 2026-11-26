"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { CampoImagen } from "@/components/admin/CampoImagen";
import { Interruptor } from "@/components/admin/Interruptor";
import { BarraCambios, BotonesOrden, useFilasOrdenables } from "@/components/admin/OrdenFilas";
import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import type { Marca } from "@/lib/tipos";

export default function Marcas() {
  const { repo, recargar, avisar } = useTienda();
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);

  const leer = useCallback(() => repo!.marcas({ todas: true }), [repo]);
  const escribir = useCallback((m: Marca) => repo!.guardarMarca(m), [repo]);
  const { filas: marcas, cargar, editar, cambiada, deshacer, guardar, mover, ocupada } = useFilasOrdenables<Marca>(repo ? leer : null, repo ? escribir : null);

  async function intentar(f: () => Promise<unknown>, ok: string) {
    setError(null);
    try {
      await f();
      await recargar();
      avisar(ok);
    } catch (e) {
      setError(e instanceof ErrorDatos ? e.message : "No se pudo completar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  function guardarFila(m: Marca, ok = "Guardado.") {
    const nombre = m.nombre.trim();
    if (!nombre) return setError("Escribe el nombre de la marca.");
    void intentar(() => guardar({ ...m, nombre }), ok);
  }

  function eliminar(m: Marca) {
    if (!repo) return;
    if (!window.confirm(`¿Eliminar la marca «${m.nombre}»?\n\nSus productos no se borran: quedan «sin marca». Esta acción no se puede deshacer.`)) return;
    void intentar(async () => {
      await repo.eliminarMarca(m.id);
      await cargar();
    }, `Marca «${m.nombre}» eliminada.`);
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Marcas</h1>
      <p className="text-sm">
        Aparecen en la franja de marcas de la portada y sirven para filtrar el catálogo. El logo es opcional: sin logo se muestra el nombre. Las flechas y el interruptor «Visible» se guardan solos; si cambias el nombre o el logo, pulsa «Guardar cambios».
      </p>
      <form
        className="tarjeta flex flex-wrap gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const nombre = nueva.trim();
          if (!repo) return;
          if (!nombre) return setError("Escribe el nombre de la nueva marca.");
          void intentar(async () => {
            await repo.guardarMarca({ id: nuevoId("mar"), nombre, logo: "", orden: marcas.reduce((m, x) => Math.max(m, x.orden), 0) + 1, activa: true });
            setNueva("");
            await cargar();
          }, `Marca «${nombre}» creada.`);
        }}
      >
        <label htmlFor="nueva-marca" className="sr-only">Nombre de la nueva marca</label>
        <input id="nueva-marca" className="campo min-w-0 flex-1" placeholder="Nombre de la nueva marca" maxLength={60} value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button type="submit" className="btn-primario"><Plus className="h-4 w-4" aria-hidden /> Agregar</button>
      </form>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <ul className="space-y-3">
        {marcas.map((m, i) => {
          const sucia = cambiada(m.id);
          return (
            <li key={m.id} className={`tarjeta p-3 ${sucia ? "border-amber-300" : ""} ${m.activa ? "" : "bg-fondo"}`} data-admin-marca={m.id}>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  guardarFila(m);
                }}
              >
                <div className="min-w-[10rem] flex-1">
                  <label className="etiqueta" htmlFor={`m-${m.id}`}>Nombre</label>
                  <input id={`m-${m.id}`} className="campo" value={m.nombre} maxLength={60} onChange={(e) => editar(m.id, { nombre: e.target.value })} />
                </div>
                <CampoImagen etiqueta="Logo" opcional valor={m.logo} alCambiar={(v) => editar(m.id, { logo: v })} dataId={`marca-${m.id}`} ancho="w-24" ayuda="Ideal: PNG con fondo transparente." />
                <div className="flex flex-wrap items-center gap-3">
                  <Interruptor activo={m.activa} etiqueta="Visible" ayuda={m.activa ? "Se ve en la tienda" : "Oculta"} disabled={ocupada === m.id} alCambiar={(activa) => guardarFila({ ...m, activa }, activa ? `«${m.nombre}» ya se ve en la tienda.` : `«${m.nombre}» quedó oculta.`)} />
                  <BotonesOrden nombre={m.nombre} primero={i === 0} ultimo={i === marcas.length - 1} disabled={!!ocupada} alMover={(dir) => void intentar(() => mover(m.id, dir), "Orden guardado.")} />
                  <button type="button" className="btn-peligro px-3" onClick={() => eliminar(m)} aria-label={`Eliminar ${m.nombre}`} title="Eliminar">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                {sucia && <BarraCambios nombre={m.nombre} guardando={ocupada === m.id} alDeshacer={() => deshacer(m.id)} />}
              </form>
            </li>
          );
        })}
        {!marcas.length && <li className="tarjeta p-6 text-center text-sm">No hay marcas. La franja de marcas no se muestra en la portada.</li>}
      </ul>
    </>
  );
}
