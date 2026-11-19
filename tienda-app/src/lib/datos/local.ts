/**
 * Adaptador de MODO DEMOSTRACIÓN: todo vive en el localStorage de este navegador.
 * Lo que se agrega en el panel NO lo ven otros visitantes. Para producción: Supabase.
 */
import { resumen, sincronizar } from "../carrito";
import { normalizarBanner, normalizarCategoria, normalizarConfig, normalizarMarca, normalizarProducto } from "../normalizar";
import { BANNERS_SEMILLA, CATEGORIAS_SEMILLA, MARCAS_SEMILLA, PRODUCTOS_SEMILLA, esEjemplo } from "../semilla";
import { CONFIG_INICIAL, type Banner, type Categoria, type Configuracion, type Marca, type Pedido, type Producto } from "../tipos";
import { ErrorDatos, codigoPedido, nuevoId, type NuevoPedido, type Repositorio, type Sesion } from "./repositorio";

/** v2: catálogo de productos y servicios (la v1 solo tenía productos de ejemplo). */
export const CLAVE_LOCAL = "sotec-tienda-v2";
export const CLAVE_SESION = "sotec-tienda-admin";

interface Estado {
  banners: Banner[];
  marcas: Marca[];
  categorias: Categoria[];
  productos: Producto[];
  pedidos: Pedido[];
  config: Configuracion;
}

/** Almacenamiento mínimo (localStorage o uno en memoria para pruebas). */
export interface Almacen {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function almacenMemoria(): Almacen {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

const inicial = (): Estado => ({
  banners: structuredClone(BANNERS_SEMILLA),
  marcas: structuredClone(MARCAS_SEMILLA),
  categorias: structuredClone(CATEGORIAS_SEMILLA),
  productos: structuredClone(PRODUCTOS_SEMILLA),
  pedidos: [],
  config: { ...CONFIG_INICIAL },
});

const ordenar = <T extends { orden: number }>(xs: T[]) => [...xs].sort((a, b) => a.orden - b.orden);
const lista = <T,>(v: unknown, def: T[], f: (x: Record<string, unknown>) => T): T[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object").map((x) => f(x as Record<string, unknown>)) : def);

export function crearRepoLocal(almacen: Almacen, sesionAlmacen: Almacen = almacen): Repositorio {
  const leer = (): Estado => {
    const base = inicial();
    try {
      const raw = almacen.getItem(CLAVE_LOCAL);
      if (!raw) return base;
      const e = JSON.parse(raw) as Record<string, unknown>;
      return {
        banners: lista(e.banners, base.banners, normalizarBanner),
        marcas: lista(e.marcas, base.marcas, normalizarMarca),
        categorias: lista(e.categorias, base.categorias, normalizarCategoria),
        productos: lista(e.productos, base.productos, normalizarProducto),
        pedidos: Array.isArray(e.pedidos) ? (e.pedidos as Pedido[]) : [],
        config: normalizarConfig((e.config as Record<string, unknown>) ?? {}),
      };
    } catch {
      return base;
    }
  };
  const escribir = (e: Estado) => {
    try {
      almacen.setItem(CLAVE_LOCAL, JSON.stringify(e));
    } catch {
      throw new ErrorDatos("El navegador no tiene espacio para guardar más (las fotos ocupan mucho en el modo demostración). Borra productos o usa fotos más livianas.");
    }
  };
  const exigirAdmin = () => {
    if (sesionAlmacen.getItem(CLAVE_SESION) !== "1") throw new ErrorDatos("Entra al panel para hacer cambios.");
  };
  const upsert = <T extends { id: string }>(xs: T[], x: T) => {
    const i = xs.findIndex((y) => y.id === x.id);
    if (i >= 0) xs[i] = x;
    else xs.push(x);
  };

  return {
    modo: "local",

    async categorias(opts) {
      const cs = ordenar(leer().categorias);
      return opts?.todas ? cs : cs.filter((c) => c.activa);
    },
    async productos(opts) {
      const e = leer();
      const activas = new Set(e.categorias.filter((c) => c.activa).map((c) => c.id));
      const ps = ordenar(e.productos);
      return opts?.todos ? ps : ps.filter((p) => p.activo && activas.has(p.categoriaId));
    },
    async producto(id) {
      return leer().productos.find((p) => p.id === id) ?? null;
    },
    async configuracion() {
      return leer().config;
    },
    async banners(opts) {
      const bs = ordenar(leer().banners);
      return opts?.todos ? bs : bs.filter((b) => b.activo);
    },
    async marcas(opts) {
      const ms = ordenar(leer().marcas);
      return opts?.todas ? ms : ms.filter((m) => m.activa);
    },

    async crearPedido({ cliente, items }: NuevoPedido) {
      const e = leer();
      // Precios y tipos desde el catálogo vigente, nunca los que trae el carrito
      const limpios = sincronizar(items, e.productos);
      if (!limpios.length) throw new ErrorDatos("Tu carrito está vacío o sus productos ya no están disponibles.");
      const r = resumen(limpios);
      const pedido: Pedido = {
        id: nuevoId("ped"),
        codigo: codigoPedido(),
        cliente,
        items: limpios,
        total: r.total,
        conItemsACotizar: r.aCotizar > 0 || r.servicios > 0,
        estado: "pendiente",
        creado: new Date().toISOString(),
      };
      e.pedidos.unshift(pedido);
      escribir(e);
      return pedido;
    },

    async sesion(): Promise<Sesion | null> {
      return sesionAlmacen.getItem(CLAVE_SESION) === "1" ? { correo: "demo@tienda", esAdmin: true } : null;
    },
    async entrar() {
      // Puerta de demostración: no hay usuarios reales en este modo.
      sesionAlmacen.setItem(CLAVE_SESION, "1");
      return { correo: "demo@tienda", esAdmin: true };
    },
    async salir() {
      sesionAlmacen.removeItem(CLAVE_SESION);
    },

    async guardarProducto(p) {
      exigirAdmin();
      const e = leer();
      upsert(e.productos, p);
      escribir(e);
      return p;
    },
    async eliminarProducto(id) {
      exigirAdmin();
      const e = leer();
      e.productos = e.productos.filter((x) => x.id !== id);
      escribir(e);
    },
    async guardarCategoria(c) {
      exigirAdmin();
      const e = leer();
      upsert(e.categorias, c);
      escribir(e);
      return c;
    },
    async eliminarCategoria(id) {
      exigirAdmin();
      const e = leer();
      if (e.productos.some((p) => p.categoriaId === id)) throw new ErrorDatos("La categoría tiene productos: muévelos o desactívala.");
      e.categorias = e.categorias.filter((x) => x.id !== id);
      escribir(e);
    },
    async guardarBanner(b) {
      exigirAdmin();
      const e = leer();
      upsert(e.banners, b);
      escribir(e);
      return b;
    },
    async eliminarBanner(id) {
      exigirAdmin();
      const e = leer();
      e.banners = e.banners.filter((x) => x.id !== id);
      escribir(e);
    },
    async guardarMarca(m) {
      exigirAdmin();
      const e = leer();
      upsert(e.marcas, m);
      escribir(e);
      return m;
    },
    async eliminarMarca(id) {
      exigirAdmin();
      const e = leer();
      e.marcas = e.marcas.filter((x) => x.id !== id);
      // Igual que en la base (on delete set null)
      e.productos = e.productos.map((p) => (p.marcaId === id ? { ...p, marcaId: null } : p));
      escribir(e);
    },
    async borrarCatalogoEjemplo() {
      exigirAdmin();
      const e = leer();
      e.productos = e.productos.filter((p) => !esEjemplo(p.id));
      e.banners = e.banners.filter((b) => !esEjemplo(b.id));
      const marcasEjemplo = new Set(e.marcas.filter((m) => esEjemplo(m.id)).map((m) => m.id));
      e.marcas = e.marcas.filter((m) => !marcasEjemplo.has(m.id));
      e.productos = e.productos.map((p) => (p.marcaId && marcasEjemplo.has(p.marcaId) ? { ...p, marcaId: null } : p));
      escribir(e);
    },
    async pedidos() {
      exigirAdmin();
      return leer().pedidos;
    },
    async cambiarEstadoPedido(id, estado) {
      exigirAdmin();
      const e = leer();
      e.pedidos = e.pedidos.map((p) => (p.id === id ? { ...p, estado } : p));
      escribir(e);
    },
    async guardarConfiguracion(c) {
      exigirAdmin();
      const e = leer();
      e.config = c;
      escribir(e);
    },
    async subirImagen(archivo) {
      exigirAdmin();
      // En demostración la imagen (ya comprimida) se guarda como data URL
      return await new Promise<string>((ok, mal) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => mal(new ErrorDatos("No se pudo leer la imagen."));
        r.readAsDataURL(archivo);
      });
    },
  };
}
