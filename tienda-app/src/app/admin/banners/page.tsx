"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { BannerUbicacion, BannerVistaPrevia, TAMANO_BANNER } from "@/components/admin/BannerVistaPrevia";
import { CampoImagen } from "@/components/admin/CampoImagen";
import { Interruptor } from "@/components/admin/Interruptor";
import { BotonesOrden, useFilasOrdenables } from "@/components/admin/OrdenFilas";
import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import { urlImagen } from "@/lib/rutas";
import type { Banner, Categoria, Producto, UbicacionBanner } from "@/lib/tipos";

const vacio = (orden: number, ubicacion: UbicacionBanner = "carrusel"): Banner => ({ id: nuevoId("ban"), ubicacion, titulo: "", texto: "", imagen: "", imagenMovil: "", botonTexto: "Ver más", enlace: "", orden, activo: true });

const GRUPOS: { ubicacion: UbicacionBanner; titulo: string; ayuda: string; vacio: string }[] = [
  { ubicacion: "carrusel", titulo: "Carrusel principal", ayuda: "Banners grandes de la portada. Pasan uno tras otro en este orden.", vacio: "No hay banners en el carrusel: no se muestra." },
  { ubicacion: "promo", titulo: "Promociones bajo el carrusel", ayuda: "Tarjetas debajo del carrusel. Solo se ven las 3 primeras que estén visibles.", vacio: "No hay promociones." },
];

export default function Banners() {
  const { repo, recargar, avisar } = useTienda();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const editor = useRef<HTMLElement>(null);

  const leer = useCallback(() => repo!.banners({ todos: true }), [repo]);
  const escribir = useCallback((b: Banner) => repo!.guardarBanner(b), [repo]);
  const { filas: banners, cargar, guardar, mover, ocupada } = useFilasOrdenables<Banner>(repo ? leer : null, repo ? escribir : null);

  useEffect(() => {
    if (!repo) return;
    void Promise.all([repo.productos({ todos: true }), repo.categorias({ todas: true })]).then(([ps, cs]) => {
      setProductos(ps);
      setCategorias(cs);
    });
  }, [repo]);

  // Al abrir el formulario, llevarlo a la vista
  const idEditando = editando?.id;
  useEffect(() => {
    if (idEditando) editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [idEditando]);

  const esNuevo = !!editando && !banners.some((b) => b.id === editando.id);
  const original = editando && banners.find((b) => b.id === editando.id);

  function abrirNuevo(ubicacion: UbicacionBanner) {
    setError(null);
    setEditando(vacio(banners.filter((b) => b.ubicacion === ubicacion).reduce((m, b) => Math.max(m, b.orden), 0) + 1, ubicacion));
  }

  function cerrar() {
    if (editando && original && JSON.stringify(original) !== JSON.stringify(editando) && !window.confirm("Tienes cambios sin guardar en este banner. ¿Salir sin guardar?")) return;
    if (editando && esNuevo && (editando.titulo || editando.imagen) && !window.confirm("¿Descartar este banner nuevo?")) return;
    setEditando(null);
    setError(null);
  }

  async function guardarEditor(e: FormEvent) {
    e.preventDefault();
    if (!repo || !editando) return;
    if (editando.titulo.trim().length < 3) return setError("Escribe el título (mínimo 3 letras).");
    if (!editando.imagen) return setError(editando.ubicacion === "promo" ? "Sube la imagen de la promoción." : "Sube la imagen para computador.");
    setError(null);
    setGuardando(true);
    try {
      await repo.guardarBanner({ ...editando, titulo: editando.titulo.trim(), texto: editando.texto.trim(), botonTexto: editando.botonTexto.trim(), imagenMovil: editando.ubicacion === "promo" ? "" : editando.imagenMovil });
      await Promise.all([cargar(), recargar()]);
      setEditando(null);
      avisar(esNuevo ? "Banner creado." : "Banner guardado.");
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function intentar(f: () => Promise<unknown>, ok: string) {
    setError(null);
    try {
      await f();
      await recargar();
      avisar(ok);
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo completar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  function eliminar(b: Banner) {
    if (!repo || !window.confirm(`¿Eliminar el banner «${b.titulo}»?\n\nDeja de verse en la tienda. Esta acción no se puede deshacer.\nSi solo quieres esconderlo un tiempo, apaga «Visible».`)) return;
    void intentar(async () => {
      await repo.eliminarBanner(b.id);
      if (editando?.id === b.id) setEditando(null);
      await cargar();
    }, "Banner eliminado.");
  }

  const destinos = [
    { valor: "", texto: "Sin botón" },
    { valor: "/carrito", texto: "Carrito" },
    { valor: "/?tipo=servicio", texto: "Todos los servicios" },
    { valor: "/?segmento=hogar", texto: "Para el hogar" },
    { valor: "/?segmento=empresa", texto: "Para empresas" },
    ...categorias.map((c) => ({ valor: `/?categoria=${c.id}`, texto: `Categoría: ${c.nombre}` })),
    ...productos.map((p) => ({ valor: `/producto/${p.id}`, texto: `Producto: ${p.nombre}` })),
  ];
  const destino = (v: string) => destinos.find((d) => d.valor === v)?.texto ?? v;
  const set = (c: Partial<Banner>) => setEditando((b) => (b ? { ...b, ...c } : b));

  const tituloEditor = !editando ? "" : esNuevo ? (editando.ubicacion === "promo" ? "Nueva promoción" : "Nuevo banner") : `Editando «${original?.titulo || editando.titulo}»`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Banners</h1>
        {!editando && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primario" onClick={() => abrirNuevo("carrusel")} data-nuevo-banner>
              <Plus className="h-4 w-4" aria-hidden /> Nuevo banner
            </button>
            <button type="button" className="btn-secundario" onClick={() => abrirNuevo("promo")} data-nueva-promo>
              <Plus className="h-4 w-4" aria-hidden /> Nueva promoción
            </button>
          </div>
        )}
      </div>
      <p className="text-sm">El título, el texto y el botón se escriben encima de la imagen: usa fotos sin letras. Las flechas y el interruptor «Visible» de la lista se guardan solos.</p>
      {error && !editando && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {editando && (
        <section ref={editor} aria-labelledby="titulo-editor" className="tarjeta scroll-mt-4 border-2 border-marca-btn p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="titulo-editor" className="break-words text-xl font-bold">{tituloEditor}</h2>
              <p className="text-sm">Completa los datos; a la derecha ves cómo va quedando.</p>
            </div>
            <button type="button" className="btn-secundario h-11 w-11 shrink-0 px-0" onClick={cerrar} aria-label="Cerrar sin guardar">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <form onSubmit={guardarEditor} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" data-editor-banner>
            <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <BannerUbicacion valor={editando.ubicacion} alCambiar={(ubicacion) => set({ ubicacion })} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-titulo" className="etiqueta">Título</label>
                <input id="b-titulo" className="campo" maxLength={120} placeholder="Ej.: Kits de cámaras con instalación" value={editando.titulo} onChange={(e) => set({ titulo: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-texto" className="etiqueta">Texto debajo del título (opcional)</label>
                <input id="b-texto" className="campo" maxLength={240} value={editando.texto} onChange={(e) => set({ texto: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <CampoImagen etiqueta={editando.ubicacion === "promo" ? "Imagen" : "Imagen para computador"} valor={editando.imagen} alCambiar={(v) => set({ imagen: v })} dataId="escritorio" ancho="w-40" ayuda={editando.ubicacion === "promo" ? TAMANO_BANNER.promo : TAMANO_BANNER.carrusel} />
              </div>
              {editando.ubicacion === "carrusel" && (
                <div className="sm:col-span-2">
                  <CampoImagen etiqueta="Imagen para celular" opcional valor={editando.imagenMovil} alCambiar={(v) => set({ imagenMovil: v })} dataId="movil" ayuda={TAMANO_BANNER.movil} />
                </div>
              )}
              <div>
                <label htmlFor="b-boton" className="etiqueta">Texto del botón</label>
                <input id="b-boton" className="campo" maxLength={40} value={editando.botonTexto} onChange={(e) => set({ botonTexto: e.target.value })} />
              </div>
              <div>
                <label htmlFor="b-enlace" className="etiqueta">El botón lleva a</label>
                <select id="b-enlace" className="campo" value={editando.enlace} onChange={(e) => set({ enlace: e.target.value })}>
                  {destinos.map((d) => (
                    <option key={d.valor || "nada"} value={d.valor}>{d.texto}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="b-orden" className="etiqueta">Posición</label>
                <input id="b-orden" type="number" inputMode="numeric" className="campo" value={editando.orden} onChange={(e) => set({ orden: Number(e.target.value) || 0 })} aria-describedby="b-orden-ayuda" />
                <p id="b-orden-ayuda" className="mt-1 text-xs text-tenue">El número más bajo sale primero. También puedes moverlo después con las flechas de la lista.</p>
              </div>
              <div className="self-start sm:pt-6">
                <Interruptor activo={editando.activo} alCambiar={(activo) => set({ activo })} etiqueta="Visible en la tienda" ayuda={editando.activo ? "Se muestra al guardar" : "Queda guardado pero oculto"} />
              </div>
            </div>

            <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
              <p className="etiqueta">Vista previa</p>
              <BannerVistaPrevia banner={editando} />
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 lg:col-span-2">{error}</p>}
            <div className="flex flex-wrap gap-2 border-t border-linea pt-4 lg:col-span-2">
              <button type="submit" className="btn-primario" disabled={guardando}>{guardando ? "Guardando…" : "Guardar banner"}</button>
              <button type="button" className="btn-secundario" onClick={cerrar}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {GRUPOS.map((g) => {
        const lista = banners.filter((b) => b.ubicacion === g.ubicacion);
        let visibles = 0;
        return (
          <section key={g.ubicacion} aria-labelledby={`grupo-${g.ubicacion}`} className="space-y-2">
            <div>
              <h2 id={`grupo-${g.ubicacion}`} className="text-lg font-bold">{g.titulo} <span className="text-sm font-normal text-tenue">({lista.length})</span></h2>
              <p className="text-sm">{g.ayuda}</p>
            </div>
            <ul className="space-y-2">
              {lista.map((b, i) => {
                if (b.activo) visibles++;
                const sobra = g.ubicacion === "promo" && b.activo && visibles > 3;
                return (
                  <li key={b.id} className={`tarjeta flex flex-wrap items-center gap-3 p-3 ${editando?.id === b.id ? "ring-2 ring-marca-btn" : ""} ${b.activo ? "" : "bg-fondo"}`} data-admin-banner={b.id}>
                    <img src={urlImagen(b.imagen)} alt="" className={`h-14 w-24 shrink-0 rounded-lg object-cover ${b.activo ? "" : "opacity-50"}`} />
                    <div className="min-w-[8rem] flex-1">
                      <p className="break-words font-semibold text-tinta">{b.titulo}</p>
                      <p className="text-sm">
                        {b.enlace ? `Lleva a: ${destino(b.enlace)}` : "Sin botón"}
                        {sobra && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">No se ve: solo caben 3</span>}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Interruptor activo={b.activo} etiqueta="Visible" ayuda={b.activo ? "En la tienda" : "Oculto"} disabled={ocupada === b.id} alCambiar={(activo) => void intentar(() => guardar({ ...b, activo }), activo ? "El banner ya se ve en la tienda." : "Banner oculto.")} />
                      <BotonesOrden nombre={b.titulo} primero={i === 0} ultimo={i === lista.length - 1} disabled={!!ocupada} alMover={(dir) => void intentar(() => mover(b.id, dir, (x) => x.ubicacion === g.ubicacion), "Orden guardado.")} />
                      <button type="button" className="btn-secundario px-3" onClick={() => { setError(null); setEditando(b); }} aria-label={`Editar ${b.titulo}`}>
                        <Pencil className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button type="button" className="btn-peligro px-3" onClick={() => eliminar(b)} aria-label={`Eliminar ${b.titulo}`} title="Eliminar">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
              {!lista.length && <li className="tarjeta p-6 text-center text-sm">{g.vacio}</li>}
            </ul>
          </section>
        );
      })}
    </>
  );
}
