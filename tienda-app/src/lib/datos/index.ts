/** Elige el adaptador: Supabase si hay variables; si no, modo demostración (localStorage). */
import { crearRepoLocal } from "./local";
import type { Repositorio } from "./repositorio";
import { crearRepoSupabase } from "./supabase";

let repo: Repositorio | null = null;

export function obtenerRepo(): Repositorio {
  if (repo) return repo;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  repo = url && key ? crearRepoSupabase(url, key) : crearRepoLocal(window.localStorage, window.sessionStorage);
  return repo;
}

export const MODO_DATOS = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "local";

export type { Repositorio, Sesion, Modo, NuevoPedido } from "./repositorio";
export { ErrorDatos, nuevoId } from "./repositorio";
