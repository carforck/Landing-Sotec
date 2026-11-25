/** Modo de datos y disponibilidad del panel (sin dependencias: se puede importar en cualquier componente). */
export const MODO_DATOS = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "local";

/**
 * ¿Se puede usar el panel /admin? Con Supabase siempre (pide usuario con rol admin). Sin Supabase
 * (modo demostración) solo si NEXT_PUBLIC_TIENDA_PANEL_DEMO=1 (desarrollo local o preview): en
 * producción sin base de datos el panel queda cerrado y el enlace «Administrar tienda» oculto.
 */
export const PANEL_DISPONIBLE = MODO_DATOS === "supabase" || process.env.NEXT_PUBLIC_TIENDA_PANEL_DEMO === "1";
