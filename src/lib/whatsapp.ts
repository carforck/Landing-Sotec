/** Armado del mensaje y del enlace de WhatsApp del pedido (lógica pura). */
import { formatoCOP, textoPrecio } from "./formato";
import { resumen, subtotal } from "./carrito";
import type { Configuracion, DatosCliente, ItemCarrito } from "./tipos";

/** Solo dígitos; un celular colombiano de 10 dígitos (3XX…) recibe el indicativo 57. */
export function normalizarNumero(n: string): string {
  const d = (n || "").replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  return d;
}

export function mensajePedido(cfg: Configuracion, codigo: string, cliente: DatosCliente, items: ItemCarrito[]): string {
  const r = resumen(items);
  const lineas: string[] = [cfg.mensajeInicial.trim(), "", `*Pedido ${codigo}*`, ""];
  items.forEach((it, i) => {
    const sub = subtotal(it);
    lineas.push(`${i + 1}. ${it.nombre}`);
    lineas.push(`   Cantidad: ${it.cantidad} · Precio unitario: ${textoPrecio(it.precio)}${sub == null ? "" : ` · Subtotal: ${formatoCOP(sub)}`}`);
  });
  lineas.push("");
  lineas.push(`*Total: ${formatoCOP(r.total)}*${r.aCotizar ? ` (+ ${r.aCotizar} producto${r.aCotizar === 1 ? "" : "s"} a cotizar)` : ""}`);
  lineas.push(`Unidades: ${r.unidades}`);
  lineas.push("");
  lineas.push("*Mis datos*");
  lineas.push(`Nombre: ${cliente.nombre.trim()}`);
  lineas.push(`Celular: ${cliente.celular.trim()}`);
  lineas.push(`Ciudad: ${cliente.ciudad.trim()}`);
  if (cliente.correo?.trim()) lineas.push(`Correo: ${cliente.correo.trim()}`);
  if (cliente.nota?.trim()) lineas.push(`Nota: ${cliente.nota.trim()}`);
  return lineas.join("\n");
}

export function enlaceWhatsApp(numero: string, texto: string): string {
  return `https://api.whatsapp.com/send?phone=${normalizarNumero(numero)}&text=${encodeURIComponent(texto)}`;
}

/** Enlace del botón flotante (consulta general). */
export function enlaceConsulta(cfg: Configuracion): string {
  return enlaceWhatsApp(cfg.whatsapp, "Hola SOTEC, vengo de la tienda virtual y quiero hacer una consulta.");
}
