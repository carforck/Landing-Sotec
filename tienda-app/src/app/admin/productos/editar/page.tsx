"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, ChevronDown, Eye, Settings2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { FotosProducto } from "@/components/admin/FotosProducto";
import { Interruptor } from "@/components/admin/Interruptor";
import { ProductoCampoPrecio, formatoMiles, numeroDe } from "@/components/admin/ProductoCampoPrecio";
import { ProductoVistaPrevia } from "@/components/admin/ProductoVistaPrevia";
import { ErrorDatos, nuevoId } from "@/lib/datos";
import { descuento } from "@/lib/formato";
import { FOTOS_MAXIMAS } from "@/lib/imagen";
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

type Campo = "nombre" | "categoria" | "precio" | "anterior" | "segmentos";
/** Orden en que se revisan los errores (el primero recibe el foco). */
const ORDEN_CAMPOS: Campo[] = ["nombre", "categoria", "precio", "anterior", "segmentos"];
/** Elemento que recibe el foco por cada campo con error. */
const FOCO: Record<Campo, string> = { nombre: "nombre", categoria: "categoria", precio: "precio", anterior: "anterior", segmentos: "segmento-hogar" };

const SALIR_SIN_GUARDAR = "Tienes cambios sin guardar. ¿Salir de todos modos? Se perderán.";

/** Resumen comparable del formulario (precios ya como número). */
function firma(p: Producto, precio: string, anterior: string): string {
  return JSON.stringify({ ...p, precio: numeroDe(precio), precioAnterior: numeroDe(anterior) });
}

/** Bloque numerado del formulario. */
function Seccion({ n, titulo, ayuda, children }: { n: number; titulo: string; ayuda?: string; children: ReactNode }) {
  const id = `seccion-${n}`;
  return (
    <section className="tarjeta p-4 sm:p-5" aria-labelledby={id}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca-btn text-sm font-bold text-white" aria-hidden>
          {n}
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-bold leading-8">
            <span className="sr-only">Paso {n}: </span>
            {titulo}
          </h2>
          {ayuda && <p className="text-sm text-tenue">{ayuda}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function ErrorCampo({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-sm font-semibold text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {texto}
    </p>
  );
}

function Editor() {
  const { repo, recargar, avisar } = useTienda();
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const [p, setP] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [precioTexto, setPrecioTexto] = useState("");
  const [anteriorTexto, setAnteriorTexto] = useState("");
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [noExiste, setNoExiste] = useState(false);
  /** Estado del formulario recién cargado, para saber si hay cambios sin guardar. */
  const [inicial, setInicial] = useState<string | null>(null);
  const sucioRef = useRef(false);

  useEffect(() => {
    if (!repo) return;
    void (async () => {
      const [cs, ps, ms] = await Promise.all([repo.categorias({ todas: true }), repo.productos({ todos: true }), repo.marcas({ todas: true })]);
      setCategorias(cs);
      setMarcas(ms);
      const existente = id ? ps.find((x) => x.id === id) : undefined;
      setNoExiste(!!id && !existente);
      const tipo: TipoItem = params.get("tipo") === "servicio" ? "servicio" : "producto";
      const base = existente ?? vacio(cs[0]?.id ?? "", ps.reduce((m, x) => Math.max(m, x.orden), 0) + 1, tipo);
      const pt = base.precio == null ? "" : formatoMiles(String(base.precio));
      const at = base.precioAnterior == null ? "" : formatoMiles(String(base.precioAnterior));
      setP(base);
      setPrecioTexto(pt);
      setAnteriorTexto(at);
      setInicial(firma(base, pt, at));
    })();
  }, [repo, id, params]);

  const sucio = !!p && inicial != null && firma(p, precioTexto, anteriorTexto) !== inicial;
  sucioRef.current = sucio && !guardando;

  // Aviso al salir con cambios: cerrar o recargar la pestaña y cualquier enlace (Cancelar, Volver, menú del panel).
  useEffect(() => {
    const alSalir = (e: BeforeUnloadEvent) => {
      if (!sucioRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const alClic = (e: MouseEvent) => {
      if (!sucioRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (window.confirm(SALIR_SIN_GUARDAR)) {
        sucioRef.current = false;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("beforeunload", alSalir);
    document.addEventListener("click", alClic, true);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      document.removeEventListener("click", alClic, true);
    };
  }, []);

  if (!p) return <p aria-busy="true">Cargando…</p>;

  const cambiar = (c: Partial<Producto>) => setP((x) => (x ? { ...x, ...c } : x));
  const limpiar = (...cs: Campo[]) => setErrores((e) => (cs.some((c) => e[c]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !cs.includes(k as Campo))) : e));
  const servicio = p.tipo === "servicio";
  const precio = numeroDe(precioTexto);
  const anterior = numeroDe(anteriorTexto);
  const pct = descuento({ precio, precioAnterior: anterior });
  const vista: Producto = { ...p, precio, precioAnterior: anterior };
  const nombreCategoria = categorias.find((c) => c.id === p.categoriaId)?.nombre;
  const nombreMarca = p.marcaId ? marcas.find((m) => m.id === p.marcaId)?.nombre : undefined;
  const cuantosErrores = Object.keys(errores).length;
  const describe = (campo: Campo, ayuda?: string) => [ayuda, errores[campo] ? `${campo}-error` : null].filter(Boolean).join(" ") || undefined;
  const claseCampo = (campo: Campo) => `campo ${errores[campo] ? "border-red-500 focus:border-red-600" : ""}`;

  function alternarSegmento(s: Segmento, on: boolean) {
    setP((x) => (x ? { ...x, segmentos: on ? [...new Set([...x.segmentos, s])] : x.segmentos.filter((y) => y !== s) } : x));
    limpiar("segmentos");
  }

  function validar(): Partial<Record<Campo, string>> {
    const e: Partial<Record<Campo, string>> = {};
    if (!p) return e;
    if (p.nombre.trim().length < 3) e.nombre = "Escribe el nombre (mínimo 3 letras).";
    if (!p.categoriaId) e.categoria = "Elige una categoría.";
    const ep = errorPrecios(precio, anterior);
    if (ep) {
      if (anterior != null && precio != null) e.anterior = ep;
      else e.precio = ep;
    }
    if (!p.segmentos.length) e.segmentos = "Marca al menos uno: Hogar o Empresas.";
    return e;
  }

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!repo || !p) return;
    const e = validar();
    setErrores(e);
    setErrorGuardar(null);
    const primero = ORDEN_CAMPOS.find((c) => e[c]);
    if (primero) {
      requestAnimationFrame(() => {
        const el = document.getElementById(FOCO[primero]);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      });
      return;
    }
    setGuardando(true);
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
      sucioRef.current = false;
      await recargar();
      avisar("Producto guardado");
      router.push("/admin/productos");
    } catch (err) {
      setErrorGuardar(err instanceof ErrorDatos ? err.message : "No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
      setGuardando(false);
    }
  }

  const tituloAccion = id && !noExiste ? "Editar" : "Nuevo";

  return (
    <form onSubmit={guardar} noValidate className="space-y-4" data-editor-producto>
      <div>
        <Link href="/admin/productos" className="btn -ml-2 px-2 text-tenue hover:text-tinta">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a productos y servicios
        </Link>
        <h1 className="text-2xl font-bold">
          {tituloAccion} {servicio ? "servicio" : "producto"}
        </h1>
        <p className="text-sm text-tenue">Completa los pasos y pulsa «Guardar» abajo. En la vista previa ves cómo quedará en la tienda.</p>
        {noExiste && <p role="alert" className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No encontramos ese producto (quizá se eliminó). Puedes crear uno nuevo aquí.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4">
          {/* 1 · Lo básico */}
          <Seccion n={1} titulo="Lo básico" ayuda="Qué es, cómo se llama y dónde va en el catálogo.">
            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="etiqueta">¿Qué vas a publicar?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["producto", "servicio"] as const).map((t) => (
                    <label key={t} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border-2 p-3 focus-within:ring-2 focus-within:ring-marca-btn ${p.tipo === t ? "border-marca-btn bg-marca-suave" : "border-linea bg-white hover:bg-fondo"}`}>
                      <input type="radio" name="tipo" className="mt-1 h-4 w-4 shrink-0 accent-marca-btn" checked={p.tipo === t} onChange={() => cambiar({ tipo: t })} data-tipo-editor={t} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-tinta">{t === "producto" ? "Producto" : "Servicio"}</span>
                        <span className="block text-xs text-tenue">{t === "producto" ? "Algo que se vende: cámara, router, portátil…" : "Un trabajo que hacemos: instalación, mantenimiento…"}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-2">
                <label htmlFor="nombre" className="etiqueta">
                  Nombre <span className="text-red-700" aria-hidden>*</span>
                </label>
                <input
                  id="nombre"
                  className={claseCampo("nombre")}
                  value={p.nombre}
                  onChange={(e) => {
                    cambiar({ nombre: e.target.value });
                    limpiar("nombre");
                  }}
                  maxLength={120}
                  placeholder={servicio ? "Ej.: Instalación de 4 cámaras de seguridad" : "Ej.: Cámara IP Wi-Fi 4 MP para exteriores"}
                  aria-required
                  aria-invalid={errores.nombre ? true : undefined}
                  aria-describedby={describe("nombre", "nombre-ayuda")}
                />
                <p id="nombre-ayuda" className="mt-1 text-xs text-tenue">
                  Como lo buscaría un cliente. {p.nombre.length}/120
                </p>
                <ErrorCampo id="nombre" texto={errores.nombre} />
              </div>
              <div>
                <label htmlFor="categoria" className="etiqueta">
                  Categoría <span className="text-red-700" aria-hidden>*</span>
                </label>
                <select
                  id="categoria"
                  className={claseCampo("categoria")}
                  value={p.categoriaId}
                  onChange={(e) => {
                    cambiar({ categoriaId: e.target.value });
                    limpiar("categoria");
                  }}
                  aria-invalid={errores.categoria ? true : undefined}
                  aria-describedby={describe("categoria")}
                >
                  {!categorias.length && <option value="">Primero crea una categoría</option>}
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.activa ? "" : " (oculta)"}
                    </option>
                  ))}
                </select>
                <ErrorCampo id="categoria" texto={errores.categoria} />
              </div>
              <div>
                <label htmlFor="marca" className="etiqueta">
                  Marca <span className="font-normal text-tenue">(opcional)</span>
                </label>
                <select id="marca" className="campo" value={p.marcaId ?? ""} onChange={(e) => cambiar({ marcaId: e.target.value || null })}>
                  <option value="">Sin marca</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Seccion>

          {/* 2 · Fotos */}
          <Seccion n={2} titulo={`Fotos (${p.imagenes.length} de ${FOTOS_MAXIMAS})`} ayuda="La foto «Principal» es la que se ve en la tienda. Sin fotos se muestra el ícono de la categoría.">
            <FotosProducto imagenes={p.imagenes} alCambiar={(f) => setP((x) => (x ? { ...x, imagenes: f(x.imagenes) } : x))} alSubiendo={setSubiendo} />
          </Seccion>

          {/* 3 · Precio */}
          <Seccion n={3} titulo="Precio" ayuda={servicio ? "En servicios es un precio de referencia: la tienda muestra «Desde $ …»." : "En pesos colombianos, sin decimales."}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="precio" className="etiqueta">
                  {servicio ? "Precio «Desde»" : "Precio de venta"}
                </label>
                <ProductoCampoPrecio
                  id="precio"
                  valor={precioTexto}
                  alCambiar={(t) => {
                    setPrecioTexto(t);
                    limpiar("precio", "anterior");
                  }}
                  placeholder="Ej.: 690.000"
                  error={errores.precio}
                  ayudaId="precio-ayuda"
                />
                <p id="precio-ayuda" className="mt-1 text-xs text-tenue">
                  Déjalo vacío para mostrar «{servicio ? "A cotizar" : "Precio a cotizar"}».
                </p>
              </div>
              <div>
                <label htmlFor="anterior" className="etiqueta">
                  Precio antes de la oferta <span className="font-normal text-tenue">(opcional)</span>
                </label>
                <ProductoCampoPrecio
                  id="anterior"
                  valor={anteriorTexto}
                  alCambiar={(t) => {
                    setAnteriorTexto(t);
                    limpiar("precio", "anterior");
                  }}
                  placeholder="Mayor que el precio de venta"
                  error={errores.anterior}
                  ayudaId="anterior-ayuda"
                />
                <p id="anterior-ayuda" className={`mt-1 text-xs ${pct != null ? "font-semibold text-green-800" : "text-tenue"}`} data-pct>
                  {pct != null ? `Se mostrará «Oferta -${pct} %» con el precio anterior tachado.` : "Solo si está en oferta: escribe cuánto costaba antes y la tienda mostrará el descuento."}
                </p>
              </div>
            </div>
          </Seccion>

          {/* 4 · Descripción y detalles */}
          <Seccion n={4} titulo="Descripción y detalles" ayuda="Lo que el cliente lee al abrir la ficha.">
            <div className="space-y-4">
              <div>
                <label htmlFor="descripcion" className="etiqueta">
                  Descripción corta
                </label>
                <textarea id="descripcion" rows={3} className="campo" value={p.descripcion} onChange={(e) => cambiar({ descripcion: e.target.value })} maxLength={400} placeholder="Una o dos frases: para qué sirve y por qué conviene." aria-describedby="descripcion-ayuda" />
                <p id="descripcion-ayuda" className="mt-1 text-xs text-tenue">
                  {p.descripcion.length}/400
                </p>
              </div>
              {servicio && (
                <div>
                  <label htmlFor="modalidad" className="etiqueta">
                    Duración o modalidad <span className="font-normal text-tenue">(opcional)</span>
                  </label>
                  <input id="modalidad" className="campo" maxLength={80} placeholder="Ej.: Visita técnica · Mantenimiento anual · Por equipo" value={p.modalidad} onChange={(e) => cambiar({ modalidad: e.target.value })} />
                </div>
              )}
              {servicio ? (
                <div>
                  <label htmlFor="incluye" className="etiqueta">
                    Qué incluye
                  </label>
                  <textarea id="incluye" rows={4} className="campo" value={p.incluye} onChange={(e) => cambiar({ incluye: e.target.value })} placeholder={"Visita del técnico\nDiagnóstico\nInforme"} aria-describedby="incluye-ayuda" />
                  <p id="incluye-ayuda" className="mt-1 text-xs text-tenue">
                    Un punto por línea (pulsa Enter para escribir el siguiente).
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="ficha" className="etiqueta">
                    Ficha técnica
                  </label>
                  <textarea id="ficha" rows={5} className="campo text-sm" value={p.fichaTecnica} onChange={(e) => cambiar({ fichaTecnica: e.target.value })} placeholder={"Potencia: 550 W\nGarantía: 12 años"} aria-describedby="ficha-ayuda" />
                  <p id="ficha-ayuda" className="mt-1 text-xs text-tenue">
                    Una característica por línea, así: «Nombre: valor». Ej.: «Garantía: 12 meses».
                  </p>
                </div>
              )}
            </div>
          </Seccion>

          {/* 5 · Dónde se muestra */}
          <Seccion n={5} titulo="Dónde se muestra" ayuda="Para quién es y cómo se destaca en la tienda.">
            <fieldset aria-describedby={describe("segmentos")}>
              <legend className="etiqueta">
                ¿Para quién es? <span className="text-red-700" aria-hidden>*</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {SEGMENTOS.map((s) => {
                  const on = p.segmentos.includes(s);
                  return (
                    <label key={s} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-4 font-semibold text-tinta focus-within:ring-2 focus-within:ring-marca-btn ${on ? "border-marca-btn bg-marca-suave" : "border-linea bg-white hover:bg-fondo"}`}>
                      <input id={`segmento-${s}`} type="checkbox" className="h-5 w-5 accent-marca-btn" checked={on} onChange={(e) => alternarSegmento(s, e.target.checked)} data-segmento-editor={s} />
                      Para {ETIQUETA_SEGMENTO[s].toLowerCase()}
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-tenue">Puedes marcar los dos.</p>
              <ErrorCampo id="segmentos" texto={errores.segmentos} />
            </fieldset>
            <div className="mt-4 grid gap-2 border-t border-linea pt-4 sm:grid-cols-3">
              <Interruptor activo={p.activo} alCambiar={(v) => cambiar({ activo: v })} etiqueta="Visible en la tienda" ayuda={p.activo ? "Los clientes lo ven." : "Oculto: solo lo ves tú aquí."} data-visible-editor="" />
              <Interruptor activo={p.destacado} alCambiar={(v) => cambiar({ destacado: v })} etiqueta="«Más vendido»" ayuda="Pone esa etiqueta verde en la foto." />
              <Interruptor activo={p.nuevo} alCambiar={(v) => cambiar({ nuevo: v })} etiqueta="«Nuevo»" ayuda="Pone esa etiqueta azul en la foto." />
            </div>
          </Seccion>

          <details className="tarjeta group p-4 sm:p-5">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 font-semibold text-tinta [&::-webkit-details-marker]:hidden">
              <Settings2 className="h-4 w-4 text-tenue" aria-hidden /> Opciones avanzadas
              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-3 max-w-xs">
              <label htmlFor="orden" className="etiqueta">
                Orden en el catálogo
              </label>
              <input id="orden" type="number" inputMode="numeric" className="campo" value={p.orden} onChange={(e) => cambiar({ orden: Number(e.target.value) || 0 })} aria-describedby="orden-ayuda" />
              <p id="orden-ayuda" className="mt-1 text-xs text-tenue">
                Un número más bajo aparece antes. Si no sabes, déjalo así.
              </p>
            </div>
          </details>
        </div>

        <aside className="lg:sticky lg:top-4" aria-labelledby="titulo-vista">
          <div className="tarjeta p-4">
            <h2 id="titulo-vista" className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Eye className="h-4 w-4 text-marca-btn" aria-hidden /> Así se verá en la tienda
            </h2>
            <ProductoVistaPrevia producto={vista} marca={nombreMarca} categoria={nombreCategoria} />
            <p className="mt-3 text-center text-xs text-tenue">Se actualiza mientras escribes.</p>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 border-t border-linea bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(22,28,24,0.06)] backdrop-blur sm:-mx-6 sm:px-6" data-barra-guardar>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 text-sm" aria-live="polite">
            {errorGuardar ? (
              <span role="alert" className="font-semibold text-red-700">
                {errorGuardar}
              </span>
            ) : cuantosErrores ? (
              <span role="alert" className="font-semibold text-red-700">
                Revisa {cuantosErrores === 1 ? "el campo marcado" : `los ${cuantosErrores} campos marcados`} en rojo.
              </span>
            ) : subiendo ? (
              <span className="text-tenue">Espera a que terminen de cargar las fotos…</span>
            ) : sucio ? (
              <span className="font-semibold text-amber-800">Tienes cambios sin guardar</span>
            ) : (
              <span className="flex items-center gap-1 text-tenue">
                <Check className="h-4 w-4" aria-hidden /> Sin cambios
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Link href="/admin/productos" className="btn-secundario">
              Cancelar
            </Link>
            <button type="submit" className="btn-primario min-w-[120px]" disabled={guardando || subiendo}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
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
