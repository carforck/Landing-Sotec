"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ImagePlus, X } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import { descuento } from "@/lib/formato";
import { FOTOS_MAXIMAS, comprimirImagen } from "@/lib/imagen";
import { urlImagen } from "@/lib/rutas";
import { ETIQUETA_SEGMENTO, SEGMENTOS, type Categoria, type Marca, type Producto, type Segmento, type TipoItem } from "@/lib/tipos";
import { errorPrecios } from "@/lib/validacion";

const vacio = (categoriaId: string, orden: number, tipo: TipoItem): Producto => ({
  id: nuevoId(tipo === "servicio" ? "srv" : "prd"),
  tipo,
  nombre: "",
  categoriaId,
  marcaId: null,
  descripcion: "",
  fichaTecnica: "",
  incluye: "",
  modalidad: "",
  precio: null,
  precioAnterior: null,
  segmentos: ["hogar", "empresa"],
  imagenes: [],
  destacado: false,
  nuevo: false,
  activo: true,
  orden,
  creado: new Date().toISOString(),
});

const aNumero = (t: string) => {
  const d = t.replace(/[^\d]/g, "");
  return d ? Number(d) : null;
};

function Editor() {
  const { repo, recargar } = useTienda();
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const [p, setP] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [precioTexto, setPrecioTexto] = useState("");
  const [anteriorTexto, setAnteriorTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!repo) return;
    void (async () => {
      const [cs, ps, ms] = await Promise.all([repo.categorias({ todas: true }), repo.productos({ todos: true }), repo.marcas({ todas: true })]);
      setCategorias(cs);
      setMarcas(ms);
      const existente = id ? ps.find((x) => x.id === id) : undefined;
      const tipo: TipoItem = params.get("tipo") === "servicio" ? "servicio" : "producto";
      const base = existente ?? vacio(cs[0]?.id ?? "", ps.reduce((m, x) => Math.max(m, x.orden), 0) + 1, tipo);
      setP(base);
      setPrecioTexto(base.precio == null ? "" : String(base.precio));
      setAnteriorTexto(base.precioAnterior == null ? "" : String(base.precioAnterior));
    })();
  }, [repo, id, params]);

  if (!p) return <p aria-busy="true">Cargando…</p>;
  const cambiar = (c: Partial<Producto>) => setP({ ...p, ...c });
  const servicio = p.tipo === "servicio";
  const precio = aNumero(precioTexto);
  const anterior = aNumero(anteriorTexto);
  const pct = descuento({ precio, precioAnterior: anterior });

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

  function alternarSegmento(s: Segmento, on: boolean) {
    if (!p) return;
    const xs = on ? [...new Set([...p.segmentos, s])] : p.segmentos.filter((x) => x !== s);
    cambiar({ segmentos: xs });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!repo || !p) return;
    if (p.nombre.trim().length < 3) return setError("Escribe el nombre.");
    if (!p.categoriaId) return setError("Elige una categoría.");
    if (!p.segmentos.length) return setError("Marca al menos un segmento: hogar o empresas.");
    const ep = errorPrecios(precio, anterior);
    if (ep) return setError(ep);
    setGuardando(true);
    setError(null);
    try {
      await repo.guardarProducto({
        ...p,
        nombre: p.nombre.trim(),
        descripcion: p.descripcion.trim(),
        fichaTecnica: p.fichaTecnica.trim(),
        incluye: servicio ? p.incluye.trim() : "",
        modalidad: servicio ? p.modalidad.trim() : "",
        precio,
        precioAnterior: anterior,
      });
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
        <ArrowLeft className="h-4 w-4" aria-hidden /> Productos y servicios
      </Link>
      <h1 className="text-2xl font-bold">{id ? `Editar ${servicio ? "servicio" : "producto"}` : `Nuevo ${servicio ? "servicio" : "producto"}`}</h1>

      <div className="tarjeta grid gap-4 p-4 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="etiqueta">Tipo</legend>
          <div className="flex flex-wrap gap-2">
            {(["producto", "servicio"] as const).map((t) => (
              <label key={t} className={`btn cursor-pointer border ${p.tipo === t ? "border-marca-btn bg-marca-suave text-marca-oscuro" : "border-linea bg-white text-tinta"} focus-within:ring-2 focus-within:ring-marca-btn`}>
                <input type="radio" name="tipo" className="sr-only" checked={p.tipo === t} onChange={() => cambiar({ tipo: t })} data-tipo-editor={t} />
                {t === "producto" ? "Producto" : "Servicio"}
              </label>
            ))}
          </div>
        </fieldset>
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
          <label htmlFor="marca" className="etiqueta">Marca (opcional)</label>
          <select id="marca" className="campo" value={p.marcaId ?? ""} onChange={(e) => cambiar({ marcaId: e.target.value || null })}>
            <option value="">Sin marca</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="precio" className="etiqueta">{servicio ? "Precio de referencia «Desde» (vacío = a cotizar)" : "Precio en COP (vacío = «Precio a cotizar»)"}</label>
          <input id="precio" className="campo" inputMode="numeric" placeholder="Ej.: 690000" value={precioTexto} onChange={(e) => setPrecioTexto(e.target.value)} />
        </div>
        <div>
          <label htmlFor="anterior" className="etiqueta">Precio anterior para oferta (opcional)</label>
          <input id="anterior" className="campo" inputMode="numeric" placeholder="Mayor que el precio" value={anteriorTexto} onChange={(e) => setAnteriorTexto(e.target.value)} aria-describedby="anterior-ayuda" />
          <p id="anterior-ayuda" className="mt-1 text-xs" data-pct>{pct != null ? `Se mostrará «Oferta -${pct} %» con el precio anterior tachado.` : "Si es mayor que el precio, se muestra como oferta."}</p>
        </div>
        {servicio && (
          <div className="sm:col-span-2">
            <label htmlFor="modalidad" className="etiqueta">Duración o modalidad (opcional)</label>
            <input id="modalidad" className="campo" maxLength={80} placeholder="Ej.: Visita técnica · Mantenimiento anual · Por equipo" value={p.modalidad} onChange={(e) => cambiar({ modalidad: e.target.value })} />
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="descripcion" className="etiqueta">Descripción corta</label>
          <textarea id="descripcion" rows={2} className="campo" value={p.descripcion} onChange={(e) => cambiar({ descripcion: e.target.value })} maxLength={400} />
        </div>
        {servicio ? (
          <div className="sm:col-span-2">
            <label htmlFor="incluye" className="etiqueta">Qué incluye (un punto por línea)</label>
            <textarea id="incluye" rows={4} className="campo" value={p.incluye} onChange={(e) => cambiar({ incluye: e.target.value })} placeholder={"Visita del técnico\nDiagnóstico\nInforme"} />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label htmlFor="ficha" className="etiqueta">Ficha técnica (una característica por línea, «Nombre: valor»)</label>
            <textarea id="ficha" rows={5} className="campo font-mono text-sm" value={p.fichaTecnica} onChange={(e) => cambiar({ fichaTecnica: e.target.value })} placeholder={"Potencia: 550 W\nGarantía: 12 años"} />
          </div>
        )}
        <fieldset>
          <legend className="etiqueta">Para</legend>
          <div className="flex flex-wrap gap-4">
            {SEGMENTOS.map((s) => (
              <label key={s} className="flex min-h-[44px] items-center gap-2 font-semibold text-tinta">
                <input type="checkbox" className="h-5 w-5 accent-marca-btn" checked={p.segmentos.includes(s)} onChange={(e) => alternarSegmento(s, e.target.checked)} data-segmento-editor={s} /> {ETIQUETA_SEGMENTO[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="orden" className="etiqueta">Orden en el catálogo</label>
          <input id="orden" type="number" className="campo" value={p.orden} onChange={(e) => cambiar({ orden: Number(e.target.value) || 0 })} />
        </div>
        <fieldset className="flex flex-wrap items-end gap-4 sm:col-span-2">
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
        <p className="text-sm">La primera es la principal. Se comprimen automáticamente. Sin fotos, se muestra el ícono de la categoría.</p>
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
        <button type="submit" className="btn-primario" disabled={guardando || subiendo}>{guardando ? "Guardando…" : "Guardar"}</button>
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
