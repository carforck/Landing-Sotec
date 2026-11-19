"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import { comprimirImagen } from "@/lib/imagen";
import { urlImagen } from "@/lib/rutas";
import type { Banner, Categoria, Producto } from "@/lib/tipos";

const vacio = (orden: number): Banner => ({ id: nuevoId("ban"), titulo: "", texto: "", imagen: "", imagenMovil: "", botonTexto: "Ver más", enlace: "", orden, activo: true });

function CampoImagen({ etiqueta, valor, alCambiar, opcional, dataId }: { etiqueta: string; valor: string; alCambiar: (v: string) => void; opcional?: boolean; dataId: string }) {
  const { repo } = useTienda();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function subir(f: File | undefined) {
    if (!f || !repo) return;
    setCargando(true);
    setError(null);
    try {
      alCambiar(await repo.subirImagen(await comprimirImagen(f), f.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la imagen.");
    } finally {
      setCargando(false);
    }
  }
  return (
    <div>
      <p className="etiqueta">{etiqueta}{opcional && " (opcional)"}</p>
      <div className="flex items-center gap-3">
        <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-linea bg-fondo">
          {valor && <img src={urlImagen(valor)} alt="" className="h-full w-full object-cover" data-vista={dataId} />}
        </div>
        <label className="btn-secundario cursor-pointer focus-within:ring-2 focus-within:ring-marca-btn">
          <ImagePlus className="h-4 w-4" aria-hidden /> {cargando ? "Cargando…" : valor ? "Cambiar" : "Subir"}
          <input type="file" accept="image/*" className="sr-only" disabled={cargando} onChange={(e) => void subir(e.target.files?.[0])} aria-label={etiqueta} data-subir={dataId} />
        </label>
        {opcional && valor && (
          <button type="button" className="btn px-2 text-sm text-tenue hover:text-tinta" onClick={() => alCambiar("")}>Quitar</button>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export default function Banners() {
  const { repo, recargar } = useTienda();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!repo) return;
    const [bs, ps, cs] = await Promise.all([repo.banners({ todos: true }), repo.productos({ todos: true }), repo.categorias({ todas: true })]);
    setBanners(bs);
    setProductos(ps);
    setCategorias(cs);
  }, [repo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!repo || !editando) return;
    if (!editando.imagen) return setMsg("Sube la imagen de escritorio.");
    if (editando.titulo.trim().length < 3) return setMsg("Escribe el título.");
    try {
      await repo.guardarBanner({ ...editando, titulo: editando.titulo.trim(), texto: editando.texto.trim(), botonTexto: editando.botonTexto.trim() });
      await Promise.all([cargar(), recargar()]);
      setEditando(null);
      setMsg("Banner guardado.");
    } catch (err) {
      setMsg(err instanceof ErrorDatos ? err.message : "No se pudo guardar.");
    }
  }

  async function eliminar(b: Banner) {
    if (!repo || !window.confirm(`¿Eliminar el banner «${b.titulo}»?`)) return;
    try {
      await repo.eliminarBanner(b.id);
      await Promise.all([cargar(), recargar()]);
    } catch (err) {
      setMsg(err instanceof ErrorDatos ? err.message : "No se pudo eliminar.");
    }
  }

  const destinos = [
    { valor: "", texto: "Sin botón" },
    { valor: "/carrito", texto: "Carrito" },
    ...categorias.map((c) => ({ valor: `/?categoria=${c.id}`, texto: `Categoría: ${c.nombre}` })),
    ...productos.map((p) => ({ valor: `/producto/${p.id}`, texto: `Producto: ${p.nombre}` })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Banners</h1>
        {!editando && (
          <button type="button" className="btn-primario" onClick={() => setEditando(vacio(banners.reduce((m, b) => Math.max(m, b.orden), 0) + 1))} data-nuevo-banner>
            <Plus className="h-4 w-4" aria-hidden /> Nuevo banner
          </button>
        )}
      </div>
      <p className="text-sm">Se muestran en el carrusel de la portada, en el orden indicado. Imagen de escritorio horizontal (ej. 1600×600); la de celular es opcional.</p>
      {msg && <p role="status" className="text-sm">{msg}</p>}

      {editando && (
        <form onSubmit={guardar} className="tarjeta grid gap-4 p-4 sm:grid-cols-2" data-editor-banner>
          <div className="sm:col-span-2">
            <label htmlFor="b-titulo" className="etiqueta">Título</label>
            <input id="b-titulo" className="campo" maxLength={120} value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="b-texto" className="etiqueta">Texto (opcional)</label>
            <input id="b-texto" className="campo" maxLength={240} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} />
          </div>
          <CampoImagen etiqueta="Imagen de escritorio" valor={editando.imagen} alCambiar={(v) => setEditando((b) => (b ? { ...b, imagen: v } : b))} dataId="escritorio" />
          <CampoImagen etiqueta="Imagen de celular" opcional valor={editando.imagenMovil} alCambiar={(v) => setEditando((b) => (b ? { ...b, imagenMovil: v } : b))} dataId="movil" />
          <div>
            <label htmlFor="b-boton" className="etiqueta">Texto del botón</label>
            <input id="b-boton" className="campo" maxLength={40} value={editando.botonTexto} onChange={(e) => setEditando({ ...editando, botonTexto: e.target.value })} />
          </div>
          <div>
            <label htmlFor="b-enlace" className="etiqueta">El botón lleva a</label>
            <select id="b-enlace" className="campo" value={editando.enlace} onChange={(e) => setEditando({ ...editando, enlace: e.target.value })}>
              {destinos.map((d) => (
                <option key={d.valor || "nada"} value={d.valor}>{d.texto}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="b-orden" className="etiqueta">Orden</label>
            <input id="b-orden" type="number" className="campo" value={editando.orden} onChange={(e) => setEditando({ ...editando, orden: Number(e.target.value) || 0 })} />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 self-end font-semibold text-tinta">
            <input type="checkbox" className="h-5 w-5 accent-marca-btn" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} /> Visible en la tienda
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primario">Guardar banner</button>
            <button type="button" className="btn-secundario" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {banners.map((b) => (
          <li key={b.id} className="tarjeta flex items-center gap-3 p-3" data-admin-banner={b.id}>
            <img src={urlImagen(b.imagen)} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-tinta">{b.titulo}</p>
              <p className="truncate text-sm">
                Orden {b.orden} · {b.enlace || "sin botón"}
                {!b.activo && <span className="ml-2 rounded bg-linea px-1.5 py-0.5 text-xs font-semibold">Oculto</span>}
              </p>
            </div>
            <button type="button" className="btn-secundario px-3" onClick={() => setEditando(b)} aria-label={`Editar ${b.titulo}`}>
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" className="btn-peligro px-3" onClick={() => void eliminar(b)} aria-label={`Eliminar ${b.titulo}`}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
        {!banners.length && <li className="tarjeta p-6 text-center text-sm">No hay banners. El carrusel no se muestra.</li>}
      </ul>
    </>
  );
}
