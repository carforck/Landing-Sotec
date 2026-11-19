/**
 * Adaptador Supabase (producción). Se activa solo si existen NEXT_PUBLIC_SUPABASE_URL y
 * NEXT_PUBLIC_SUPABASE_ANON_KEY. Toda la seguridad está en la base (RLS de
 * supabase/migrations/0001_tienda.sql): el visitante anónimo solo lee el catálogo activo y crea
 * pedidos con la función `crear_pedido` (que recalcula precios y limita envíos).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CONFIG_INICIAL, type Banner, type Categoria, type Configuracion, type EstadoPedido, type ItemCarrito, type Pedido, type Producto } from "../tipos";
import { ErrorDatos, nuevoId, type Repositorio, type Sesion } from "./repositorio";

export const BUCKET_IMAGENES = "productos";

type Fila = Record<string, unknown>;

const aCategoria = (f: Fila): Categoria => ({
  id: String(f.id),
  nombre: String(f.nombre),
  imagen: String(f.imagen ?? ""),
  icono: String(f.icono ?? "paquete"),
  orden: Number(f.orden ?? 0),
  activa: Boolean(f.activa),
});
const deCategoria = (c: Categoria) => ({ id: c.id, nombre: c.nombre, imagen: c.imagen, icono: c.icono, orden: c.orden, activa: c.activa });

const aBanner = (f: Fila): Banner => ({
  id: String(f.id),
  titulo: String(f.titulo ?? ""),
  texto: String(f.texto ?? ""),
  imagen: String(f.imagen ?? ""),
  imagenMovil: String(f.imagen_movil ?? ""),
  botonTexto: String(f.boton_texto ?? ""),
  enlace: String(f.enlace ?? ""),
  orden: Number(f.orden ?? 0),
  activo: Boolean(f.activo),
});
const deBanner = (b: Banner) => ({
  id: b.id,
  titulo: b.titulo,
  texto: b.texto,
  imagen: b.imagen,
  imagen_movil: b.imagenMovil,
  boton_texto: b.botonTexto,
  enlace: b.enlace,
  orden: b.orden,
  activo: b.activo,
});

const aProducto = (f: Fila): Producto => ({
  id: String(f.id),
  nombre: String(f.nombre),
  categoriaId: String(f.categoria_id),
  descripcion: String(f.descripcion ?? ""),
  fichaTecnica: String(f.ficha_tecnica ?? ""),
  precio: f.precio == null ? null : Number(f.precio),
  imagenes: Array.isArray(f.imagenes) ? (f.imagenes as string[]) : [],
  destacado: Boolean(f.destacado),
  nuevo: Boolean(f.nuevo),
  activo: Boolean(f.activo),
  orden: Number(f.orden ?? 0),
  creado: String(f.creado ?? ""),
});
const deProducto = (p: Producto) => ({
  id: p.id,
  nombre: p.nombre,
  categoria_id: p.categoriaId,
  descripcion: p.descripcion,
  ficha_tecnica: p.fichaTecnica,
  precio: p.precio,
  imagenes: p.imagenes,
  destacado: p.destacado,
  nuevo: p.nuevo,
  activo: p.activo,
  orden: p.orden,
});

const aPedido = (f: Fila): Pedido => ({
  id: String(f.id),
  codigo: String(f.codigo),
  cliente: (f.cliente as Pedido["cliente"]) ?? { nombre: "", celular: "", ciudad: "" },
  items: (f.items as ItemCarrito[]) ?? [],
  total: Number(f.total ?? 0),
  conItemsACotizar: Boolean(f.con_items_a_cotizar),
  estado: f.estado as EstadoPedido,
  creado: String(f.creado),
});

function falla(error: { message: string } | null, texto: string): void {
  if (error) throw new ErrorDatos(`${texto}: ${error.message}`);
}

export function crearRepoSupabase(url: string, anonKey: string): Repositorio {
  const sb: SupabaseClient = createBrowserClient(url, anonKey);

  const sesion = async (): Promise<Sesion | null> => {
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const { data: perfil } = await sb.from("perfiles").select("rol").eq("id", data.user.id).maybeSingle();
    return { correo: data.user.email ?? "", esAdmin: perfil?.rol === "admin" };
  };

  return {
    modo: "supabase",

    async categorias(opts) {
      let q = sb.from("categorias").select("*").order("orden");
      if (!opts?.todas) q = q.eq("activa", true);
      const { data, error } = await q;
      falla(error, "No se pudieron cargar las categorías");
      return (data ?? []).map(aCategoria);
    },
    async productos(opts) {
      let q = sb.from("productos").select("*").order("orden");
      if (!opts?.todos) q = q.eq("activo", true);
      const { data, error } = await q;
      falla(error, "No se pudieron cargar los productos");
      const ps = (data ?? []).map(aProducto);
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
    async configuracion(): Promise<Configuracion> {
      const { data } = await sb.from("configuracion").select("whatsapp, mensaje_inicial").eq("id", 1).maybeSingle();
      return data ? { whatsapp: String(data.whatsapp), mensajeInicial: String(data.mensaje_inicial) } : CONFIG_INICIAL;
    },

    async banners(opts) {
      let q = sb.from("banners").select("*").order("orden");
      if (!opts?.todos) q = q.eq("activo", true);
      const { data, error } = await q;
      falla(error, "No se pudieron cargar los banners");
      return (data ?? []).map(aBanner);
    },

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

    async guardarProducto(p) {
      const { error } = await sb.from("productos").upsert(deProducto(p));
      falla(error, "No se pudo guardar el producto");
      return p;
    },
    async eliminarProducto(id) {
      const { error } = await sb.from("productos").delete().eq("id", id);
      falla(error, "No se pudo eliminar el producto");
    },
    async guardarCategoria(c) {
      const { error } = await sb.from("categorias").upsert(deCategoria(c));
      falla(error, "No se pudo guardar la categoría");
      return c;
    },
    async eliminarCategoria(id) {
      const { error } = await sb.from("categorias").delete().eq("id", id);
      falla(error, "No se pudo eliminar la categoría (¿tiene productos?)");
    },
    async guardarBanner(b) {
      const { error } = await sb.from("banners").upsert(deBanner(b));
      falla(error, "No se pudo guardar el banner");
      return b;
    },
    async eliminarBanner(id) {
      const { error } = await sb.from("banners").delete().eq("id", id);
      falla(error, "No se pudo eliminar el banner");
    },
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
      const { error } = await sb.from("configuracion").upsert({ id: 1, whatsapp: c.whatsapp, mensaje_inicial: c.mensajeInicial });
      falla(error, "No se pudo guardar la configuración");
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
