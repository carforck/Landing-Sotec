const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** «$ 1.250.000» (pesos colombianos sin decimales). */
export function formatoCOP(valor: number): string {
  return cop.format(Math.round(valor)).replace(/ /g, " ");
}

/** Precio para mostrar: el valor en COP o «Precio a cotizar». */
export function textoPrecio(precio: number | null): string {
  return precio == null ? "Precio a cotizar" : formatoCOP(precio);
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
}
