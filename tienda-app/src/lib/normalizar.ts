/** Completa con valores por defecto los registros guardados por versiones anteriores o incompletos. */
import { CONFIG_INICIAL, SEGMENTOS, type Banner, type Categoria, type Configuracion, type Marca, type Producto, type Segmento } from "./tipos";

type Suelto<T> = Partial<T> & Record<string, unknown>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const txt = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);

export function normalizarSegmentos(v: unknown): Segmento[] {
  const xs = Array.isArray(v) ? v.filter((x): x is Segmento => (SEGMENTOS as readonly string[]).includes(String(x))) : [];
  return xs.length ? [...new Set(xs)] : ["hogar", "empresa"];
}

export function normalizarProducto(p: Suelto<Producto>): Producto {
  const precio = num(p.precio);
  const anterior = num(p.precioAnterior);
  return {
    id: txt(p.id),
    tipo: p.tipo === "servicio" ? "servicio" : "producto",
    nombre: txt(p.nombre),
    categoriaId: txt(p.categoriaId),
    marcaId: typeof p.marcaId === "string" && p.marcaId ? p.marcaId : null,
    descripcion: txt(p.descripcion),
    fichaTecnica: txt(p.fichaTecnica),
    incluye: txt(p.incluye),
    modalidad: txt(p.modalidad),
    precio,
    precioAnterior: precio != null && anterior != null && anterior > precio ? anterior : null,
    segmentos: normalizarSegmentos(p.segmentos),
    imagenes: Array.isArray(p.imagenes) ? p.imagenes.filter((x): x is string => typeof x === "string") : [],
    destacado: Boolean(p.destacado),
    nuevo: Boolean(p.nuevo),
    activo: p.activo !== false,
    orden: num(p.orden) ?? 0,
    creado: txt(p.creado, new Date(0).toISOString()),
  };
}

export function normalizarCategoria(c: Suelto<Categoria>): Categoria {
  return { id: txt(c.id), nombre: txt(c.nombre), imagen: txt(c.imagen), icono: txt(c.icono, "paquete") || "paquete", orden: num(c.orden) ?? 0, activa: c.activa !== false };
}

export function normalizarBanner(b: Suelto<Banner>): Banner {
  return {
    id: txt(b.id),
    ubicacion: b.ubicacion === "promo" ? "promo" : "carrusel",
    titulo: txt(b.titulo),
    texto: txt(b.texto),
    imagen: txt(b.imagen),
    imagenMovil: txt(b.imagenMovil),
    botonTexto: txt(b.botonTexto),
    enlace: txt(b.enlace),
    orden: num(b.orden) ?? 0,
    activo: b.activo !== false,
  };
}

export function normalizarMarca(m: Suelto<Marca>): Marca {
  return { id: txt(m.id), nombre: txt(m.nombre), logo: txt(m.logo), orden: num(m.orden) ?? 0, activa: m.activa !== false };
}

export function normalizarConfig(c: Suelto<Configuracion> & { whatsapp?: unknown }): Configuracion {
  const viejo = txt(c.whatsapp);
  return {
    whatsappHogar: txt(c.whatsappHogar) || viejo || CONFIG_INICIAL.whatsappHogar,
    whatsappEmpresa: txt(c.whatsappEmpresa) || viejo || CONFIG_INICIAL.whatsappEmpresa,
    mensajeInicial: txt(c.mensajeInicial) || CONFIG_INICIAL.mensajeInicial,
  };
}
