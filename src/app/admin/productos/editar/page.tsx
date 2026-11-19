"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ImagePlus, X } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import { FOTOS_MAXIMAS, comprimirImagen } from "@/lib/imagen";
import { urlImagen } from "@/lib/rutas";
import type { Categoria, Producto } from "@/lib/tipos";

const vacio = (categoriaId: string, orden: number): Producto => ({
  id: nuevoId("prd"),
  nombre: "",
  categoriaId,
  descripcion: "",
  fichaTecnica: "",
  precio: null,
  imagenes: [],
  destacado: false,
  nuevo: false,
  activo: true,
  orden,
  creado: new Date().toISOString(),
});

function Editor() {
  const { repo, recargar } = useTienda();
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const [p, setP] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [precioTexto, setPrecioTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!repo) return;
    void (async () => {
      const [cs, ps] = await Promise.all([repo.categorias({ todas: true }), repo.productos({ todos: true })]);
      setCategorias(cs);
      const existente = id ? ps.find((x) => x.id === id) : undefined;
      const base = existente ?? vacio(cs[0]?.id ?? "", ps.reduce((m, x) => Math.max(m, x.orden), 0) + 1);
      setP(base);
      setPrecioTexto(base.precio == null ? "" : String(base.precio));
    })();
  }, [repo, id]);

  if (!p) return <p aria-busy="true">Cargando…</p>;
  const cambiar = (c: Partial<Producto>) => setP({ ...p, ...c });

  async function agregarFotos(archivos: FileList | null) {
    if (!repo || !archivos || !p) return;
    setError(null);
    setSubiendo(true);
    const nuevas: string[] = [];
    try {
      for (const a of Array.from(archivos).slice(0, FOTOS_MAXIMAS - p.imagenes.length)) {
        const blob = await comprimirImagen(a);
        nuevas.push(await repo.subirImagen(blob, a.name));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la foto.");
    } finally {
      setP((x) => (x ? { ...x, imagenes: [...x.imagenes, ...nuevas].slice(0, FOTOS_MAXIMAS) } : x));
      setSubiendo(false);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!repo || !p) return;
    const limpio = precioTexto.replace(/[^\d]/g, "");
    const precio = limpio ? Number(limpio) : null;
    if (p.nombre.trim().length < 3) return setError("Escribe el nombre del producto.");
    if (!p.categoriaId) return setError("Elige una categoría.");
    setGuardando(true);
    setError(null);
    try {
      await repo.guardarProducto({ ...p, nombre: p.nombre.trim(), descripcion: p.descripcion.trim(), fichaTecnica: p.fichaTecnica.trim(), precio });
      await recargar();
      router.push("/admin/productos");
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-4" data-editor-producto>
      <Link href="/admin/productos" className="btn -ml-2 px-2 text-tenue hover:text-tinta">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Productos
      </Link>
      <h1 className="text-2xl font-bold">{id ? "Editar producto" : "Nuevo producto"}</h1>

      <div className="tarjeta grid gap-4 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nombre" className="etiqueta">Nombre</label>
          <input id="nombre" className="campo" value={p.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} maxLength={120} required />
        </div>
        <div>
          <label htmlFor="categoria" className="etiqueta">Categoría</label>
          <select id="categoria" className="campo" value={p.categoriaId} onChange={(e) => cambiar({ categoriaId: e.target.value })}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}{c.activa ? "" : " (oculta)"}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="precio" className="etiqueta">Precio en COP (vacío = «Precio a cotizar»)</label>
          <input id="precio" className="campo" inputMode="numeric" placeholder="Ej.: 690000" value={precioTexto} onChange={(e) => setPrecioTexto(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="descripcion" className="etiqueta">Descripción corta</label>
          <textarea id="descripcion" rows={2} className="campo" value={p.descripcion} onChange={(e) => cambiar({ descripcion: e.target.value })} maxLength={400} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ficha" className="etiqueta">Ficha técnica (una característica por línea, «Nombre: valor»)</label>
          <textarea id="ficha" rows={5} className="campo font-mono text-sm" value={p.fichaTecnica} onChange={(e) => cambiar({ fichaTecnica: e.target.value })} placeholder={"Potencia: 550 W\nGarantía: 12 años"} />
        </div>
        <div>
          <label htmlFor="orden" className="etiqueta">Orden en el catálogo</label>
          <input id="orden" type="number" className="campo" value={p.orden} onChange={(e) => cambiar({ orden: Number(e.target.value) || 0 })} />
        </div>
        <fieldset className="flex flex-wrap items-end gap-4">
          <legend className="sr-only">Opciones</legend>
          <label className="flex min-h-[44px] items-center gap-2 font-semibold text-tinta">
            <input type="checkbox" className="h-5 w-5 accent-marca-btn" checked={p.activo} onChange={(e) => cambiar({ activo: e.target.checked })} /> Visible en la tienda
          </label>
          <label className="flex min-h-[44px] items-center gap-2 font-semibold text-tinta">
            <input type="checkbox" className="h-5 w-5 accent-marca-btn" checked={p.destacado} onChange={(e) => cambiar({ destacado: e.target.checked })} /> «Más vendido»
          </label>
          <label className="flex min-h-[44px] items-center gap-2 font-semibold text-tinta">
            <input type="checkbox" className="h-5 w-5 accent-marca-btn" checked={p.nuevo} onChange={(e) => cambiar({ nuevo: e.target.checked })} /> «Nuevo»
          </label>
        </fieldset>
      </div>

      <section className="tarjeta p-4" aria-labelledby="fotos">
        <h2 id="fotos" className="font-bold">Fotos ({p.imagenes.length}/{FOTOS_MAXIMAS})</h2>
        <p className="text-sm">La primera es la principal. Se comprimen automáticamente.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {p.imagenes.map((src, i) => (
            <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border border-linea" data-foto>
              <img src={urlImagen(src)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-tinta shadow" onClick={() => cambiar({ imagenes: p.imagenes.filter((_, k) => k !== i) })} aria-label={`Quitar foto ${i + 1}`}>
                <X className="h-4 w-4" aria-hidden />
              </button>
              {i > 0 && (
                <button type="button" className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-xs font-semibold text-tinta" onClick={() => cambiar({ imagenes: [src, ...p.imagenes.filter((_, k) => k !== i)] })}>
                  Principal
                </button>
              )}
            </div>
          ))}
          {p.imagenes.length < FOTOS_MAXIMAS && (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-linea text-xs font-semibold text-tenue hover:border-marca-btn focus-within:border-marca-btn">
              <ImagePlus className="h-6 w-6" aria-hidden />
              {subiendo ? "Cargando…" : "Agregar"}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void agregarFotos(e.target.files)} disabled={subiendo} aria-label="Agregar fotos" data-subir-fotos />
            </label>
          )}
        </div>
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primario" disabled={guardando || subiendo}>{guardando ? "Guardando…" : "Guardar producto"}</button>
        <Link href="/admin/productos" className="btn-secundario">Cancelar</Link>
      </div>
    </form>
  );
}

export default function EditarProducto() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <Editor />
    </Suspense>
  );
}
