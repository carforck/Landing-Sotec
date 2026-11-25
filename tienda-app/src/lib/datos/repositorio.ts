/**
 * Contrato único de datos. La interfaz no sabe si detrás hay localStorage (modo demostración)
 * o Supabase: las páginas solo usan esto (ver ./index.ts).
 */
import type { Banner, Categoria, Marca, Configuracion, DatosCliente, EstadoPedido, ItemCarrito, Pedido, Producto } from "../tipos";

export type Modo = "local" | "supabase";

export interface Sesion {
  correo: string;
  esAdmin: boolean;
}

export interface NuevoPedido {
  cliente: DatosCliente;
  items: ItemCarrito[];
}

export interface Repositorio {
  modo: Modo;

  // Catálogo público
  categorias(opts?: { todas?: boolean }): Promise<Categoria[]>;
  productos(opts?: { todos?: boolean }): Promise<Producto[]>;
  producto(id: string): Promise<Producto | null>;
  configuracion(): Promise<Configuracion>;
  banners(opts?: { todos?: boolean }): Promise<Banner[]>;
  marcas(opts?: { todas?: boolean }): Promise<Marca[]>;

  // Pedido del cliente (público). Devuelve el pedido guardado (con código y total calculado).
  crearPedido(p: NuevoPedido): Promise<Pedido>;

  // Panel (requiere sesión de administrador)
  sesion(): Promise<Sesion | null>;
  entrar(correo: string, clave: string): Promise<Sesion>;
  salir(): Promise<void>;
  /** Solo Supabase: envía el correo para restablecer la contraseña (vuelve a `volverA`). */
  recuperarClave?(correo: string, volverA: string): Promise<void>;
  /** Solo Supabase: cambia la contraseña del usuario con sesión (también tras el enlace del correo). */
  cambiarClave?(nueva: string): Promise<void>;
  guardarProducto(p: Producto): Promise<Producto>;
  eliminarProducto(id: string): Promise<void>;
  guardarCategoria(c: Categoria): Promise<Categoria>;
  eliminarCategoria(id: string): Promise<void>;
  guardarBanner(b: Banner): Promise<Banner>;
  eliminarBanner(id: string): Promise<void>;
  guardarMarca(m: Marca): Promise<Marca>;
  eliminarMarca(id: string): Promise<void>;
  /** Solo modo demostración: quita productos, banners y marcas de ejemplo. */
  borrarCatalogoEjemplo?(): Promise<void>;
  pedidos(): Promise<Pedido[]>;
  cambiarEstadoPedido(id: string, estado: EstadoPedido): Promise<void>;
  guardarConfiguracion(c: Configuracion): Promise<void>;
  /** Sube una imagen ya comprimida y devuelve la URL que se guarda en el producto. */
  subirImagen(archivo: Blob, nombre: string): Promise<string>;
}

export class ErrorDatos extends Error {}

/** Id aleatorio corto. */
export function nuevoId(prefijo: string): string {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return `${prefijo}-${r}`;
}

/** Código legible del pedido (sin 0/O/1/I para dictarlo por teléfono). */
export function codigoPedido(): string {
  const abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `T-${s}`;
}
