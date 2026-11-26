"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { CampoImagen } from "@/components/admin/CampoImagen";
import { Interruptor } from "@/components/admin/Interruptor";
import { BarraCambios, BotonesOrden, useFilasOrdenables } from "@/components/admin/OrdenFilas";
import { SelectorIcono } from "@/components/admin/SelectorIcono";
import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import type { Categoria } from "@/lib/tipos";

export default function Categorias() {
  const { repo, recargar, avisar } = useTienda();
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usos, setUsos] = useState<Record<string, number>>({});

  const leer = useCallback(() => repo!.categorias({ todas: true }), [repo]);
  const escribir = useCallback((c: Categoria) => repo!.guardarCategoria(c), [repo]);
  const { filas: cats, cargar, editar, cambiada, deshacer, guardar, mover, ocupada } = useFilasOrdenables<Categoria>(repo ? leer : null, repo ? escribir : null);

  // Cuántos productos tiene cada categoría (para avisar antes de eliminar)
  useEffect(() => {
    if (!repo) return;
    void repo.productos({ todos: true }).then((ps) => {
      const n: Record<string, number> = {};
      for (const p of ps) n[p.categoriaId] = (n[p.categoriaId] ?? 0) + 1;
      setUsos(n);
    });
  }, [repo]);

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

  function guardarFila(c: Categoria, ok = "Guardado.") {
    const nombre = c.nombre.trim();
    if (nombre.length < 3) return setError("El nombre de la categoría debe tener al menos 3 letras.");
    void intentar(() => guardar({ ...c, nombre }), ok);
  }

  function eliminar(c: Categoria) {
    if (!repo) return;
    const n = usos[c.id] ?? 0;
    if (n > 0) {
      window.alert(`«${c.nombre}» tiene ${n} producto${n === 1 ? "" : "s"}, así que no se puede eliminar.\n\nPrimero cámbialos a otra categoría desde «Productos». Si solo quieres que no se vea en la tienda, apaga «Visible».`);
      return;
    }
    if (!window.confirm(`¿Eliminar la categoría «${c.nombre}»?\n\nNo tiene productos. Esta acción no se puede deshacer.`)) return;
    void intentar(async () => {
      await repo.eliminarCategoria(c.id);
      await cargar();
    }, `Categoría «${c.nombre}» eliminada.`);
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Categorías</h1>
      <p className="text-sm">
        Son las tarjetas de la cinta de la portada y los filtros del catálogo. Usa las flechas para cambiar el orden y el interruptor «Visible» para mostrarla u ocultarla: eso se guarda solo. Si cambias el nombre o la foto, pulsa «Guardar cambios».
      </p>
      <form
        className="tarjeta flex flex-wrap gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const nombre = nueva.trim();
          if (!repo) return;
          if (nombre.length < 3) return setError("Escribe el nombre de la nueva categoría (mínimo 3 letras).");
          void intentar(async () => {
            await repo.guardarCategoria({ id: nuevoId("cat"), nombre, imagen: "", icono: "paquete", orden: cats.reduce((m, c) => Math.max(m, c.orden), 0) + 1, activa: true });
            setNueva("");
            await cargar();
          }, `Categoría «${nombre}» creada.`);
        }}
      >
        <label htmlFor="nueva" className="sr-only">Nombre de la nueva categoría</label>
        <input id="nueva" className="campo min-w-0 flex-1" placeholder="Nombre de la nueva categoría" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button type="submit" className="btn-primario"><Plus className="h-4 w-4" aria-hidden /> Agregar</button>
      </form>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <ul className="space-y-3">
        {cats.map((c, i) => {
          const n = usos[c.id] ?? 0;
          const sucia = cambiada(c.id);
          return (
            <li key={c.id} className={`tarjeta p-3 ${sucia ? "border-amber-300" : ""} ${c.activa ? "" : "bg-fondo"}`} data-admin-categoria={c.id}>
              <form
                className="flex flex-wrap items-center gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  guardarFila(c);
                }}
              >
                <SelectorIcono valor={c.icono} nombre={c.nombre} alCambiar={(icono) => guardarFila({ ...c, icono }, "Ícono guardado.")} />
                <div className="min-w-[10rem] flex-1">
                  <label className="sr-only" htmlFor={`n-${c.id}`}>Nombre de la categoría</label>
                  <input id={`n-${c.id}`} className="campo" value={c.nombre} onChange={(e) => editar(c.id, { nombre: e.target.value })} />
                  <p className="mt-1 text-xs text-tenue">{n ? `${n} producto${n === 1 ? "" : "s"}` : "Sin productos"}</p>
                </div>
                <Interruptor activo={c.activa} etiqueta="Visible" ayuda={c.activa ? "Se ve en la tienda" : "Oculta"} disabled={ocupada === c.id} alCambiar={(activa) => guardarFila({ ...c, activa }, activa ? `«${c.nombre}» ya se ve en la tienda.` : `«${c.nombre}» quedó oculta.`)} />
                <BotonesOrden nombre={c.nombre} primero={i === 0} ultimo={i === cats.length - 1} disabled={!!ocupada} alMover={(dir) => void intentar(() => mover(c.id, dir), "Orden guardado.")} />
                <button type="button" className="btn-peligro px-3" onClick={() => eliminar(c)} aria-label={`Eliminar ${c.nombre}`} title="Eliminar">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
                <div className="w-full">
                  <CampoImagen etiqueta="Foto de la tarjeta" opcional valor={c.imagen} alCambiar={(v) => editar(c.id, { imagen: v })} dataId={`cat-${c.id}`} ancho="w-24" ayuda="Sin foto, la tarjeta muestra el ícono. Ideal: foto horizontal de 800×600." />
                </div>
                {sucia && <BarraCambios nombre={c.nombre} guardando={ocupada === c.id} alDeshacer={() => deshacer(c.id)} />}
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}
