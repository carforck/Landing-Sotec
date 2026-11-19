/** Armado del mensaje y del enlace de WhatsApp (lógica pura). */
import { formatoCOP, textoPrecio } from "./formato";
import { resumen, subtotal } from "./carrito";
import { ETIQUETA_SEGMENTO, type Configuracion, type DatosCliente, type ItemCarrito, type Producto, type Segmento } from "./tipos";

/** Solo dígitos; un celular colombiano de 10 dígitos (3XX…) recibe el indicativo 57. */
export function normalizarNumero(n: string): string {
  const d = (n || "").replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  return d;
}

/** WhatsApp de ventas según el segmento («¿Es para hogar o empresa?»). */
export function numeroPara(cfg: Configuracion, segmento: Segmento): string {
  return segmento === "empresa" ? cfg.whatsappEmpresa || cfg.whatsappHogar : cfg.whatsappHogar || cfg.whatsappEmpresa;
}

function lineaItem(it: ItemCarrito, i: number): string[] {
  const sub = subtotal(it);
  const titulo = `${i + 1}. ${it.nombre}${it.tipo === "servicio" && it.modalidad ? ` (${it.modalidad})` : ""}`;
  const precio = it.tipo === "servicio" ? `Precio: ${textoPrecio(it.precio, "servicio")}` : `Precio unitario: ${textoPrecio(it.precio)}`;
  return [titulo, `   Cantidad: ${it.cantidad} · ${precio}${sub == null ? "" : ` · Subtotal: ${formatoCOP(sub)}`}`];
}

export function mensajePedido(cfg: Configuracion, codigo: string, cliente: DatosCliente, items: ItemCarrito[]): string {
  const r = resumen(items);
  const productos = items.filter((x) => x.tipo !== "servicio");
  const servicios = items.filter((x) => x.tipo === "servicio");
  const lineas: string[] = [cfg.mensajeInicial.trim(), "", `*Pedido ${codigo}*`, `Para: ${ETIQUETA_SEGMENTO[cliente.segmento]}`];
  if (productos.length) {
    lineas.push("", "*Productos*");
    productos.forEach((it, i) => lineas.push(...lineaItem(it, i)));
  }
  if (servicios.length) {
    lineas.push("", "*Servicios solicitados*");
    servicios.forEach((it, i) => lineas.push(...lineaItem(it, i)));
  }
  lineas.push("");
  if (productos.length) {
    lineas.push(`*Total productos: ${formatoCOP(r.total)}*${r.aCotizar ? ` (+ ${r.aCotizar} producto${r.aCotizar === 1 ? "" : "s"} a cotizar)` : ""}`);
  }
  if (servicios.length) lineas.push(`Servicios: ${r.servicios}, se cotizan según el alcance.`);
  lineas.push("");
  lineas.push("*Mis datos*");
  lineas.push(`Nombre: ${cliente.nombre.trim()}`);
  if (cliente.empresa?.trim()) lineas.push(`Empresa: ${cliente.empresa.trim()}`);
  lineas.push(`Celular: ${cliente.celular.trim()}`);
  lineas.push(`Ciudad: ${cliente.ciudad.trim()}`);
  if (cliente.correo?.trim()) lineas.push(`Correo: ${cliente.correo.trim()}`);
  if (cliente.nota?.trim()) lineas.push(`Nota: ${cliente.nota.trim()}`);
  return lineas.join("\n");
}

export function enlaceWhatsApp(numero: string, texto: string): string {
  return `https://api.whatsapp.com/send?phone=${normalizarNumero(numero)}&text=${encodeURIComponent(texto)}`;
}

/** Enlace de consulta general (botones de ayuda). */
export function enlaceConsulta(cfg: Configuracion): string {
  return enlaceWhatsApp(cfg.whatsappHogar || cfg.whatsappEmpresa, "Hola SOTEC, vengo de la tienda virtual y quiero hacer una consulta.");
}

/** «Cotizar ahora» / «Solicitar»: mensaje de un solo producto o servicio, sin pasar por el carrito. */
export function mensajeProducto(p: Pick<Producto, "nombre" | "precio"> & Partial<Pick<Producto, "tipo" | "modalidad">>, cantidad: number, urlProducto?: string): string {
  const servicio = p.tipo === "servicio";
  const lineas = [
    `Hola SOTEC, quiero cotizar este ${servicio ? "servicio" : "producto"} de la tienda virtual:`,
    "",
    `*${p.nombre}*${servicio && p.modalidad ? ` (${p.modalidad})` : ""}`,
    servicio
      ? `Cantidad: ${cantidad} · Precio: ${textoPrecio(p.precio, "servicio")}`
      : `Cantidad: ${cantidad} · Precio unitario: ${textoPrecio(p.precio)}${p.precio == null ? "" : ` · Subtotal: ${formatoCOP(p.precio * cantidad)}`}`,
  ];
  if (urlProducto) lineas.push("", urlProducto);
  return lineas.join("\n");
}

/** Número para «Cotizar ahora» de un producto: empresas si el ítem es solo para empresas. */
export function numeroProducto(cfg: Configuracion, p: Pick<Producto, "segmentos">): string {
  return numeroPara(cfg, p.segmentos.length === 1 && p.segmentos[0] === "empresa" ? "empresa" : "hogar");
}
