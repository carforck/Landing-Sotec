/** Tipos del dominio de la tienda. Iguales en el modo local y en Supabase. */

export interface Categoria {
  id: string;
  nombre: string;
  /** Imagen de portada de la categoría (ruta pública o URL). */
  imagen: string;
  /** Nombre del ícono (ver @/lib/iconos). */
  icono: string;
  orden: number;
  activa: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  categoriaId: string;
  /** Descripción corta para la tarjeta y la ficha. */
  descripcion: string;
  /** Ficha técnica: una característica por línea. */
  fichaTecnica: string;
  /** Precio en COP. `null` = «Precio a cotizar». */
  precio: number | null;
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

/** Banner del carrusel principal (administrable). */
export interface Banner {
  id: string;
  titulo: string;
  texto: string;
  /** Imagen de escritorio (horizontal). */
  imagen: string;
  /** Imagen para celular (opcional; si falta se usa la de escritorio). */
  imagenMovil: string;
  botonTexto: string;
  /** Destino del botón dentro de la tienda: «/producto/<id>», «/?categoria=<id>» o «/carrito». */
  enlace: string;
  orden: number;
  activo: boolean;
}

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  /** Precio unitario al momento de agregarlo; `null` = a cotizar. */
  precio: number | null;
  imagen: string;
  cantidad: number;
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
  correo?: string;
  nota?: string;
}

export interface Pedido {
  id: string;
  /** Código corto para el cliente y el mensaje de WhatsApp (ej. «T-7K3Q9P»). */
  codigo: string;
  cliente: DatosCliente;
  items: ItemCarrito[];
  /** Suma de los ítems con precio (los «a cotizar» no suman). */
  total: number;
  /** Hay ítems sin precio. */
  conItemsACotizar: boolean;
  estado: EstadoPedido;
  creado: string;
}

export interface Configuracion {
  /** Número de WhatsApp de ventas con indicativo, solo dígitos (ej. 573104696060). */
  whatsapp: string;
  /** Saludo con el que empieza el mensaje de WhatsApp. */
  mensajeInicial: string;
}

export const CONFIG_INICIAL: Configuracion = {
  whatsapp: "573104696060",
  mensajeInicial: "Hola SOTEC, quiero cotizar este pedido de la tienda virtual:",
};
