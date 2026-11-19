/** basePath de la app (next.config.mjs). Los <img> no lo agregan solos. */
export const BASE = "/tienda";

/** Ruta pública absoluta para imágenes: añade /tienda a las rutas locales; deja URLs y data URLs. */
export function urlImagen(src: string | undefined): string {
  if (!src) return `${BASE}/img/sotec-emblem.webp`;
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  if (src.startsWith(BASE + "/")) return src;
  return `${BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}

export const SITIO_SOTEC = "https://sotecse.com";
