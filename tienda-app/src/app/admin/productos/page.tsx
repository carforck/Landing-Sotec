"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, PackageOpen, Pencil, Plus, Search, Star, Trash2, TriangleAlert } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { Interruptor } from "@/components/admin/Interruptor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import { ImagenProducto } from "@/components/tienda/ImagenProducto";
import { descuento, textoPrecio } from "@/lib/formato";
import { esEjemplo } from "@/lib/semilla";
import type { Categoria, Producto } from "@/lib/tipos";

type Filtro = "todos" | "producto" | "servicio" | "ocultos";
const FILTROS: { id: Filtro; texto: string }[] = [
  { id: "todos", texto: "Todos" },
  { id: "producto", texto: "Productos" },
  { id: "servicio", texto: "Servicios" },
  { id: "ocultos", texto: "Ocultos" },
];

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Productos() {
  const { repo, recargar, avisar } = useTienda();
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargado, setCargado] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [categoria, setCategoria] = useState("");
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!repo) return;
    const [ps, cs] = await Promise.all([repo.productos({ todos: true }), repo.categorias({ todas: true })]);
    setProductos(ps);
    setCategorias(cs);
    setCargado(true);
  }, [repo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  const conteo: Record<Filtro, number> = {
    todos: productos.length,
    producto: productos.filter((p) => p.tipo === "producto").length,
    servicio: productos.filter((p) => p.tipo === "servicio").length,
    ocultos: productos.filter((p) => !p.activo).length,
  };
  const q = sinTildes(buscar.trim());
  const visibles = productos.filter(
    (p) =>
      (filtro === "todos" || (filtro === "ocultos" ? !p.activo : p.tipo === filtro)) &&
      (!categoria || p.categoriaId === categoria) &&
      (!q || sinTildes(p.nombre).includes(q)),
  );
  const hayFiltros = filtro !== "todos" || !!categoria || !!q;

  function quitarFiltros() {
    setFiltro("todos");
    setCategoria("");
    setBuscar("");
  }

  const mensaje = (e: unknown, porDefecto: string) => (e instanceof ErrorDatos ? e.message : porDefecto);

  async function alternarVisible(p: Producto, activo: boolean) {
    if (!repo) return;
    setError(null);
    setProductos((xs) => xs.map((x) => (x.id === p.id ? { ...x, activo } : x)));
    try {
      await repo.guardarProducto({ ...p, activo });
      avisar(`«${p.nombre}» ahora está ${activo ? "visible" : "oculto"} en la tienda`);
      void recargar();
    } catch (e) {
      setProductos((xs) => xs.map((x) => (x.id === p.id ? { ...x, activo: p.activo } : x)));
      setError(mensaje(e, "No se pudo cambiar. Intenta de nuevo."));
    }
  }

  async function duplicar(p: Producto) {
    if (!repo) return;
    setError(null);
    setOcupado(p.id);
    const copia: Producto = {
      ...p,
      id: nuevoId(p.tipo === "servicio" ? "srv" : "prd"),
      nombre: `${p.nombre.slice(0, 112)} (copia)`,
      imagenes: [...p.imagenes],
      segmentos: [...p.segmentos],
      activo: false,
      creado: new Date().toISOString(),
    };
    try {
      await repo.guardarProducto(copia);
      await recargar();
      avisar("Copia creada y oculta: revísala y guárdala");
      router.push(`/admin/productos/editar?id=${encodeURIComponent(copia.id)}`);
    } catch (e) {
      setError(mensaje(e, "No se pudo duplicar."));
      setOcupado(null);
    }
  }

  async function eliminar(p: Producto) {
    if (!repo) return;
    setError(null);
    setOcupado(p.id);
    try {
      await repo.eliminarProducto(p.id);
      setPorBorrar(null);
      await Promise.all([cargar(), recargar()]);
      avisar(`«${p.nombre}» eliminado`);
    } catch (e) {
      setError(mensaje(e, "No se pudo eliminar."));
    } finally {
      setOcupado(null);
    }
  }

  const hayEjemplos = productos.some((p) => esEjemplo(p.id));

  async function borrarEjemplos() {
    if (!repo?.borrarCatalogoEjemplo || !window.confirm("¿Borrar todos los productos, servicios, banners y marcas de ejemplo? Las categorías se conservan.")) return;
    try {
      await repo.borrarCatalogoEjemplo();
      await Promise.all([cargar(), recargar()]);
    } catch (e) {
      setError(mensaje(e, "No se pudo borrar."));
    }
  }

  const botonesCrear = (
    <>
      <Link href="/admin/productos/editar" className="btn-primario">
        <Plus className="h-4 w-4" aria-hidden /> Nuevo producto
      </Link>
      <Link href="/admin/productos/editar?tipo=servicio" className="btn-secundario">
        <Plus className="h-4 w-4" aria-hidden /> Nuevo servicio
      </Link>
    </>
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productos y servicios</h1>
          <p className="text-sm text-tenue">Toca uno para editarlo. Con «Visible» lo muestras u ocultas sin borrarlo.</p>
        </div>
        <div className="flex flex-wrap gap-2">{botonesCrear}</div>
      </div>
      {hayEjemplos && (
        <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950" data-aviso-ejemplo>
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong>Catálogo de ejemplo:</strong> reemplázalo desde el panel. Los ítems marcados «Ejemplo» son ficticios.
            </span>
          </p>
          {repo?.borrarCatalogoEjemplo && (
            <button type="button" className="btn-peligro" onClick={() => void borrarEjemplos()} data-borrar-ejemplo>
              <Trash2 className="h-4 w-4" aria-hidden /> Borrar catálogo de ejemplo
            </button>
          )}
        </div>
      )}

      {cargado && productos.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Mostrar">
            {FILTROS.map((f) => {
              const on = filtro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFiltro(f.id)}
                  className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${on ? "border-marca-btn bg-marca-btn text-white" : "border-linea bg-white text-tinta hover:bg-fondo"}`}
                  data-filtro-productos={f.id}
                >
                  {f.texto}
                  <span className={`rounded-full px-2 text-xs ${on ? "bg-white/25" : "bg-fondo text-tenue"}`}>{conteo[f.id]}</span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
            <label className="relative block">
              <span className="sr-only">Buscar por nombre</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" aria-hidden />
              <input type="search" className="campo pl-9" placeholder="Buscar por nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </label>
            <label className="block">
              <span className="sr-only">Categoría</span>
              <select className="campo" value={categoria} onChange={(e) => setCategoria(e.target.value)} data-filtro-categoria>
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hayFiltros && (
            <p className="text-sm text-tenue">
              Mostrando {visibles.length} de {productos.length}.{" "}
              <button type="button" className="font-semibold text-marca-oscuro underline" onClick={quitarFiltros}>
                Quitar filtros
              </button>
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {cargado && !productos.length ? (
        <div className="tarjeta flex flex-col items-center gap-3 p-8 text-center" data-lista-vacia>
          <PackageOpen className="h-12 w-12 text-marca-btn" strokeWidth={1.5} aria-hidden />
          <h2 className="text-lg font-bold">Aún no tienes productos ni servicios</h2>
          <p className="max-w-md text-sm text-tenue">Empieza por el primero: ponle nombre, una foto y el precio. Lo puedes cambiar cuando quieras.</p>
          <div className="flex flex-wrap justify-center gap-2">{botonesCrear}</div>
        </div>
      ) : (
        <ul className="space-y-2" data-lista-productos>
          {visibles.map((p) => {
            const editar = `/admin/productos/editar?id=${encodeURIComponent(p.id)}`;
            const confirmando = porBorrar === p.id;
            const d = descuento(p);
            return (
              <li key={p.id} className={`tarjeta flex flex-col gap-3 p-3 transition-shadow hover:shadow-md sm:flex-row sm:items-center ${p.activo ? "" : "bg-fondo"}`} data-admin-producto={p.id}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ${p.activo ? "" : "opacity-50"}`}>
                    <ImagenProducto src={p.imagenes[0]} categoriaId={p.categoriaId} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-semibold text-tinta">
                      {p.destacado && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" aria-label="Más vendido" />}
                      {/* El enlace cubre toda la fila: tocar cualquier parte abre el editor. */}
                      <Link href={editar} className="truncate after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline">
                        {p.nombre}
                      </Link>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      {p.tipo === "servicio" && <span className="rounded bg-violet-700 px-1.5 py-0.5 text-xs font-bold text-white">Servicio</span>}
                      {esEjemplo(p.id) && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-semibold text-sky-900">Ejemplo</span>}
                      {!p.activo && <span className="rounded bg-linea px-1.5 py-0.5 text-xs font-semibold text-tinta">Oculto</span>}
                      {d != null && <span className="rounded bg-red-700 px-1.5 py-0.5 text-xs font-bold text-white">Oferta -{d} %</span>}
                      <span className="min-w-0">
                        {nombreCat.get(p.categoriaId) ?? "Sin categoría"} · {textoPrecio(p.precio, p.tipo)}
                      </span>
                    </p>
                  </div>
                </div>

                {confirmando ? (
                  <div className="relative z-10 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-2" role="group" aria-label={`Confirmar eliminación de ${p.nombre}`}>
                    <p className="text-sm font-semibold text-red-800">¿Eliminar para siempre? No se puede deshacer.</p>
                    <button type="button" className="btn bg-red-700 text-white hover:bg-red-800" onClick={() => void eliminar(p)} disabled={ocupado === p.id}>
                      <Trash2 className="h-4 w-4" aria-hidden /> {ocupado === p.id ? "Eliminando…" : "Sí, eliminar"}
                    </button>
                    <button type="button" className="btn-secundario" onClick={() => setPorBorrar(null)} autoFocus>
                      No, conservar
                    </button>
                  </div>
                ) : (
                  <div className="relative z-10 flex items-center justify-between gap-2 border-t border-linea pt-2 sm:justify-end sm:border-0 sm:pt-0">
                    <div className="flex items-center gap-1 pr-1">
                      <Interruptor activo={p.activo} alCambiar={(v) => void alternarVisible(p, v)} etiqueta={`Visible en la tienda: ${p.nombre}`} oculto data-visible-producto={p.id} />
                      <span className={`w-14 text-xs font-semibold ${p.activo ? "text-marca-oscuro" : "text-tenue"}`} aria-hidden>
                        {p.activo ? "Visible" : "Oculto"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={editar} className="btn-secundario px-3" aria-label={`Editar ${p.nombre}`} data-editar-producto={p.id}>
                        <Pencil className="h-4 w-4" aria-hidden /> <span className="hidden lg:inline">Editar</span>
                      </Link>
                      <button type="button" className="btn-secundario px-3" onClick={() => void duplicar(p)} disabled={ocupado === p.id} aria-label={`Duplicar ${p.nombre}`} title="Crea una copia oculta para editarla" data-duplicar-producto={p.id}>
                        <Copy className="h-4 w-4" aria-hidden /> <span className="hidden lg:inline">{ocupado === p.id ? "Copiando…" : "Duplicar"}</span>
                      </button>
                      <button type="button" className="btn-peligro px-3" onClick={() => setPorBorrar(p.id)} aria-label={`Eliminar ${p.nombre}`} data-eliminar-producto={p.id}>
                        <Trash2 className="h-4 w-4" aria-hidden /> <span className="hidden lg:inline">Eliminar</span>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {cargado && !visibles.length && (
            <li className="tarjeta flex flex-col items-center gap-2 p-6 text-center text-sm">
              <Search className="h-8 w-8 text-tenue" aria-hidden />
              <p>No hay nada que coincida con estos filtros.</p>
              <button type="button" className="btn-secundario" onClick={quitarFiltros}>
                Quitar filtros
              </button>
            </li>
          )}
        </ul>
      )}
    </>
  );
}
