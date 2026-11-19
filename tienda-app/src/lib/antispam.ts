/**
 * Defensa básica del formulario en el navegador: campo trampa (honeypot) y límite de envíos.
 * En Supabase la función `crear_pedido` repite el límite en el servidor (no se puede saltar).
 */
export const LIMITE_PEDIDOS = 3;
export const VENTANA_MS = 10 * 60 * 1000;

export function esBot(trampa: string | undefined): boolean {
  return Boolean(trampa && trampa.trim());
}

/** Devuelve las marcas de tiempo vigentes y si se permite un envío más. */
export function revisarLimite(marcas: number[], ahora: number): { permitido: boolean; vigentes: number[] } {
  const vigentes = marcas.filter((t) => ahora - t < VENTANA_MS);
  return { permitido: vigentes.length < LIMITE_PEDIDOS, vigentes };
}
