/** Tipos del dominio de la tienda. Iguales en el modo local y en Supabase. */

export type TipoItem = "producto" | "servicio";
export const SEGMENTOS = ["hogar", "empresa"] as const;
export type Segmento = (typeof SEGMENTOS)[number];
export const ETIQUETA_SEGMENTO: Record<Segmento, string> = { hogar: "Hogar", empresa: "Empresas" };

export interface Categoria {
  id: string;
  nombre: string;
  /** Foto de la tarjeta de la categoría (ruta pública o URL). Vacía = se muestra el ícono. */
  imagen: string;
  /** Nombre del ícono (ver @/lib/iconos). */
  icono: string;
  orden: number;
  activa: boolean;
}

export interface Marca {
  id: string;
  nombre: string;
  /** Logo opcional (ruta o URL). Vacío = se muestra el nombre. */
  logo: string;
  orden: number;
  activa: boolean;
}

export interface Producto {
  id: string;
  tipo: TipoItem;
  nombre: string;
  categoriaId: string;
  marcaId: string | null;
  /** Descripción corta para la tarjeta y la ficha. */
  descripcion: string;
  /** Ficha técnica: una característica por línea («Nombre: valor»). */
  fichaTecnica: string;
  /** Servicios: qué incluye, un punto por línea. */
  incluye: string;
  /** Servicios: duración o modalidad («Visita técnica», «Mantenimiento anual»). */
  modalidad: string;
  /**
   * Precio en COP. `null` = a cotizar. En servicios es un precio de referencia («Desde $X»)
   * y no suma al total del pedido.
   */
  precio: number | null;
  /** Precio anterior (tachado) para ofertas; debe ser mayor que `precio`. */
  precioAnterior: number | null;
  /** Para quién es: hogar, empresa o ambos. */
  segmentos: Segmento[];
  /** Rutas públicas, URLs o data URLs (modo local). La primera es la principal. */
  imagenes: string[];
  /** Etiqueta «Más vendido». */
  destacado: boolean;
  /** Etiqueta «Nuevo». */
  nuevo: boolean;
  activo: boolean;
  orden: number;
  creado: string;
}

export interface ItemCarrito {
  productoId: string;
  tipo: TipoItem;
  nombre: string;
  /** Precio al momento de agregarlo; `null` = a cotizar. En servicios es «desde». */
  precio: number | null;
  modalidad?: string;
  imagen: string;
  cantidad: number;
}

export type UbicacionBanner = "carrusel" | "promo";

/** Banner del carrusel principal o tarjeta de promoción bajo el carrusel (administrables). */
export interface Banner {
  id: string;
  ubicacion: UbicacionBanner;
  titulo: string;
  texto: string;
  /** Imagen de escritorio (horizontal). */
  imagen: string;
  /** Imagen para celular (opcional; si falta se usa la de escritorio). */
  imagenMovil: string;
  botonTexto: string;
  /** Destino dentro de la tienda: «/producto/<id>», «/?categoria=<id>», «/carrito»… */
  enlace: string;
  orden: number;
  activo: boolean;
}

export const ESTADOS_PEDIDO = ["pendiente", "contactado", "cotizado", "vendido", "cancelado"] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  contactado: "Contactado",
  cotizado: "Cotizado",
  vendido: "Vendido",
  cancelado: "Cancelado",
};

export interface DatosCliente {
  nombre: string;
  celular: string;
  ciudad: string;
  /** «¿Es para hogar o empresa?»: decide a qué WhatsApp de ventas llega el pedido. */
  segmento: Segmento;
  empresa?: string;
  correo?: string;
  nota?: string;
}

export interface Pedido {
  id: string;
  /** Código corto para el cliente y el mensaje de WhatsApp (ej. «T-7K3Q9P»). */
  codigo: string;
  cliente: DatosCliente;
  items: ItemCarrito[];
  /** Suma de los productos con precio (servicios y productos a cotizar no suman). */
  total: number;
  /** Hay productos sin precio o servicios por cotizar. */
  conItemsACotizar: boolean;
  estado: EstadoPedido;
  creado: string;
}

export interface Configuracion {
  /** WhatsApp de ventas para hogar (con indicativo, solo dígitos). */
  whatsappHogar: string;
  /** WhatsApp de ventas para empresas. */
  whatsappEmpresa: string;
  /** Saludo con el que empieza el mensaje de WhatsApp. */
  mensajeInicial: string;
}

export const CONFIG_INICIAL: Configuracion = {
  whatsappHogar: "573104696060",
  whatsappEmpresa: "573104696060",
  mensajeInicial: "Hola SOTEC, quiero cotizar este pedido de la tienda virtual:",
};
