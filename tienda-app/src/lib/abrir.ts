/** Abre WhatsApp en otra pestaña; si el navegador la bloquea, en la misma. */
export function abrirWhatsApp(url: string): void {
  // Sin "noopener" en los rasgos: con él window.open devuelve null y no se sabe si se bloqueó
  const w = window.open(url, "_blank");
  if (w) w.opener = null;
  else window.location.href = url;
}
