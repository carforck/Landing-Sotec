/**
 * Adaptador Supabase (producción). Se activa solo si existen NEXT_PUBLIC_SUPABASE_URL y
 * NEXT_PUBLIC_SUPABASE_ANON_KEY. Toda la seguridad está en la base (RLS de
 * supabase/migrations/0001_tienda.sql): el visitante anónimo solo lee el catálogo activo y crea
 * pedidos con la función `crear_pedido` (que recalcula precios y limita envíos).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizarBanner, normalizarCategoria, normalizarConfig, normalizarMarca, normalizarProducto } from "../normalizar";
import type { Banner, Categoria, EstadoPedido, ItemCarrito, Marca, Pedido, Producto } from "../tipos";
import { ErrorDatos, nuevoId, type Repositorio, type Sesion } from "./repositorio";

export const BUCKET_IMAGENES = "productos";

type Fila = Record<string, unknown>;

// snake_case de la base ⇄ camelCase de la app
const aCategoria = (f: Fila): Categoria => normalizarCategoria(f);
const deCategoria = (c: Categoria) => ({ id: c.id, nombre: c.nombre, imagen: c.imagen, icono: c.icono, orden: c.orden, activa: c.activa });

const aMarca = (f: Fila): Marca => normalizarMarca(f);
const deMarca = (m: Marca) => ({ id: m.id, nombre: m.nombre, logo: m.logo, orden: m.orden, activa: m.activa });

const aBanner = (f: Fila): Banner => normalizarBanner({ ...f, imagenMovil: f.imagen_movil, botonTexto: f.boton_texto } as Fila);
const deBanner = (b: Banner) => ({
  id: b.id,
  ubicacion: b.ubicacion,
  titulo: b.titulo,
  texto: b.texto,
  imagen: b.imagen,
  imagen_movil: b.imagenMovil,
  boton_texto: b.botonTexto,
  enlace: b.enlace,
  orden: b.orden,
  activo: b.activo,
});

const aProducto = (f: Fila): Producto =>
  normalizarProducto({
    ...f,
    categoriaId: f.categoria_id,
    marcaId: f.marca_id,
    fichaTecnica: f.ficha_tecnica,
    precio: f.precio == null ? null : Number(f.precio),
    precioAnterior: f.precio_anterior == null ? null : Number(f.precio_anterior),
  } as Fila);
const deProducto = (p: Producto) => ({
  id: p.id,
  tipo: p.tipo,
  nombre: p.nombre,
  categoria_id: p.categoriaId,
  marca_id: p.marcaId,
  descripcion: p.descripcion,
  ficha_tecnica: p.fichaTecnica,
  incluye: p.incluye,
  modalidad: p.modalidad,
  precio: p.precio,
  precio_anterior: p.precioAnterior,
  segmentos: p.segmentos,
  imagenes: p.imagenes,
  destacado: p.destacado,
  nuevo: p.nuevo,
  activo: p.activo,
  orden: p.orden,
});

const aPedido = (f: Fila): Pedido => ({
  id: String(f.id),
  codigo: String(f.codigo),
  cliente: (f.cliente as Pedido["cliente"]) ?? { nombre: "", celular: "", ciudad: "", segmento: "hogar" },
  items: (f.items as ItemCarrito[]) ?? [],
  total: Number(f.total ?? 0),
  conItemsACotizar: Boolean(f.con_items_a_cotizar),
  estado: f.estado as EstadoPedido,
  creado: String(f.creado),
});

type ErrorSupabase = { message: string; code?: string } | null;

/** Mensaje entendible para el panel y la tienda (los de PostgreSQL vienen en inglés). */
export function explicarError(error: NonNullable<ErrorSupabase>, texto: string): string {
  const m = error.message ?? "";
  // Errores propios de crear_pedido() (raise exception en español)
  if (error.code === "P0001") return m;
  if (error.code === "23503") return `${texto}: está en uso por otros registros (por ejemplo, una categoría con productos). Muévelos o desactívala.`;
  if (error.code === "23505") return `${texto}: ya existe un registro con ese identificador.`;
  if (error.code === "23514" || error.code === "22P02") return `${texto}: algún dato no es válido.`;
  if (error.code === "42501" || /row-level security|permission denied|Unauthorized/i.test(m)) return `${texto}: tu sesión no tiene permiso. Sal y vuelve a entrar con un usuario administrador.`;
  if (/JWT|expired/i.test(m)) return `${texto}: la sesión expiró. Vuelve a entrar.`;
  if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(m)) return `${texto}: no hay conexión con la base de datos. Revisa tu internet e intenta de nuevo.`;
  if (/maximum allowed size|exceeded/i.test(m)) return `${texto}: la imagen es demasiado pesada.`;
  if (/mime type/i.test(m)) return `${texto}: formato de imagen no permitido (usa JPG, PNG o WebP).`;
  return `${texto}: ${m}`;
}

function falla(error: ErrorSupabase, texto: string): void {
  if (error) throw new ErrorDatos(explicarError(error, texto));
}

/** Ruta dentro del bucket si la URL es una imagen subida a nuestro Storage; si no, null. */
export function rutaEnBucket(url: string, base: string): string | null {
  const prefijo = `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET_IMAGENES}/`;
  return url.startsWith(prefijo) ? decodeURIComponent(url.slice(prefijo.length).split("?")[0]) : null;
}

export function crearRepoSupabase(url: string, anonKey: string): Repositorio {
  const sb: SupabaseClient = createBrowserClient(url, anonKey);

  const sesion = async (): Promise<Sesion | null> => {
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const { data: perfil } = await sb.from("perfiles").select("rol").eq("id", data.user.id).maybeSingle();
    return { correo: data.user.email ?? "", esAdmin: perfil?.rol === "admin" };
  };

  async function listar<T>(tabla: string, campoActivo: string, todos: boolean | undefined, f: (x: Fila) => T, texto: string): Promise<T[]> {
    let q = sb.from(tabla).select("*").order("orden");
    if (!todos) q = q.eq(campoActivo, true);
    const { data, error } = await q;
    falla(error, texto);
    return (data ?? []).map(f);
  }
  // Columnas con imágenes por tabla: al reemplazar o borrar se quitan de Storage (no quedan huérfanas)
  const IMAGENES: Record<string, string[]> = { productos: ["imagenes"], categorias: ["imagen"], marcas: ["logo"], banners: ["imagen", "imagen_movil"] };
  const urlsDe = (fila: Fila | null | undefined, tabla: string): string[] =>
    (IMAGENES[tabla] ?? []).flatMap((c) => {
      const v = fila?.[c];
      return Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : [];
    });
  async function anterior(tabla: string, id: unknown): Promise<Fila | null> {
    if (!IMAGENES[tabla]) return null;
    const { data } = await sb.from(tabla).select(IMAGENES[tabla].join(",")).eq("id", String(id)).maybeSingle();
    return (data as Fila | null) ?? null;
  }
  async function limpiarImagenes(antes: string[], despues: string[]) {
    const quedan = new Set(despues);
    const rutas = antes.filter((u) => !quedan.has(u)).map((u) => rutaEnBucket(u, url)).filter((r): r is string => !!r);
    // Si falla no se interrumpe al usuario: el cambio en la base ya quedó hecho
    if (rutas.length) await sb.storage.from(BUCKET_IMAGENES).remove(rutas).catch(() => null);
  }
  async function guardar(tabla: string, fila: Fila, texto: string) {
    const previa = await anterior(tabla, fila.id);
    const { error } = await sb.from(tabla).upsert(fila);
    falla(error, texto);
    await limpiarImagenes(urlsDe(previa, tabla), urlsDe(fila, tabla));
  }
  async function borrar(tabla: string, id: string, texto: string) {
    const previa = await anterior(tabla, id);
    const { error } = await sb.from(tabla).delete().eq("id", id);
    falla(error, texto);
    await limpiarImagenes(urlsDe(previa, tabla), []);
  }

  return {
    modo: "supabase",

    categorias: (opts) => listar("categorias", "activa", opts?.todas, aCategoria, "No se pudieron cargar las categorías"),
    async productos(opts) {
      const ps = await listar("productos", "activo", opts?.todos, aProducto, "No se pudieron cargar los productos");
      if (opts?.todos) return ps;
      // Con sesión de admin la RLS deja ver categorías ocultas: la tienda pública no las muestra
      const { data: cs } = await sb.from("categorias").select("id").eq("activa", true);
      const activas = new Set((cs ?? []).map((c) => String(c.id)));
      return ps.filter((p) => activas.has(p.categoriaId));
    },
    async producto(id) {
      const { data, error } = await sb.from("productos").select("*").eq("id", id).maybeSingle();
      falla(error, "No se pudo cargar el producto");
      return data ? aProducto(data) : null;
    },
    async configuracion() {
      const { data } = await sb.from("configuracion").select("whatsapp_hogar, whatsapp_empresa, mensaje_inicial").eq("id", 1).maybeSingle();
      return normalizarConfig({ whatsappHogar: String(data?.whatsapp_hogar ?? ""), whatsappEmpresa: String(data?.whatsapp_empresa ?? ""), mensajeInicial: String(data?.mensaje_inicial ?? "") });
    },
    banners: (opts) => listar("banners", "activo", opts?.todos, aBanner, "No se pudieron cargar los banners"),
    marcas: (opts) => listar("marcas", "activa", opts?.todas, aMarca, "No se pudieron cargar las marcas"),

    async crearPedido({ cliente, items }) {
      const { data, error } = await sb.rpc("crear_pedido", {
        p_cliente: cliente,
        p_items: items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
      });
      falla(error, "No se pudo registrar el pedido");
      return aPedido(data as Fila);
    },

    sesion,
    async entrar(correo, clave) {
      const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
      if (error) throw new ErrorDatos("Correo o contraseña incorrectos.");
      const s = await sesion();
      if (!s?.esAdmin) {
        await sb.auth.signOut();
        throw new ErrorDatos("Tu usuario no tiene permiso de administrador.");
      }
      return s;
    },
    async salir() {
      await sb.auth.signOut();
    },
    async recuperarClave(correo, volverA) {
      const { error } = await sb.auth.resetPasswordForEmail(correo, { redirectTo: volverA });
      // No se revela si el correo existe; solo se informa el límite de envíos
      if (error && /rate limit|security purposes/i.test(error.message)) throw new ErrorDatos("Ya se envió un correo hace poco. Espera un minuto e intenta de nuevo.");
    },
    async cambiarClave(nueva) {
      const { error } = await sb.auth.updateUser({ password: nueva });
      if (error) {
        if (/should be different/i.test(error.message)) throw new ErrorDatos("La nueva contraseña debe ser distinta de la anterior.");
        if (/at least|weak|characters/i.test(error.message)) throw new ErrorDatos("La contraseña es muy débil: usa al menos 10 caracteres.");
        falla(error, "No se pudo cambiar la contraseña");
      }
    },

    async guardarProducto(p) {
      await guardar("productos", deProducto(p), "No se pudo guardar el producto");
      return p;
    },
    eliminarProducto: (id) => borrar("productos", id, "No se pudo eliminar el producto"),
    async guardarCategoria(c) {
      await guardar("categorias", deCategoria(c), "No se pudo guardar la categoría");
      return c;
    },
    eliminarCategoria: (id) => borrar("categorias", id, "No se pudo eliminar la categoría"),
    async guardarBanner(b) {
      await guardar("banners", deBanner(b), "No se pudo guardar el banner");
      return b;
    },
    eliminarBanner: (id) => borrar("banners", id, "No se pudo eliminar el banner"),
    async guardarMarca(m) {
      await guardar("marcas", deMarca(m), "No se pudo guardar la marca");
      return m;
    },
    eliminarMarca: (id) => borrar("marcas", id, "No se pudo eliminar la marca"),

    async pedidos() {
      const { data, error } = await sb.from("pedidos").select("*").order("creado", { ascending: false }).limit(500);
      falla(error, "No se pudieron cargar los pedidos");
      return (data ?? []).map(aPedido);
    },
    async cambiarEstadoPedido(id, estado) {
      const { error } = await sb.from("pedidos").update({ estado }).eq("id", id);
      falla(error, "No se pudo cambiar el estado");
    },
    async guardarConfiguracion(c) {
      await guardar("configuracion", { id: 1, whatsapp_hogar: c.whatsappHogar, whatsapp_empresa: c.whatsappEmpresa, mensaje_inicial: c.mensajeInicial }, "No se pudo guardar la configuración");
    },
    async subirImagen(archivo, nombre) {
      const ext = archivo.type === "image/webp" ? "webp" : "jpg";
      const ruta = `${nuevoId("img")}-${nombre.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.${ext}`;
      const { error } = await sb.storage.from(BUCKET_IMAGENES).upload(ruta, archivo, { contentType: archivo.type, upsert: false });
      falla(error, "No se pudo subir la imagen");
      return sb.storage.from(BUCKET_IMAGENES).getPublicUrl(ruta).data.publicUrl;
    },
  };
}
