"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos } from "@/lib/datos";

const CLAVE_MINIMA = 10;

/** Cambiar la contraseña del administrador. También es el destino del enlace «¿Olvidaste tu contraseña?». */
export default function Clave() {
  const { repo } = useTienda();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!repo?.cambiarClave) {
    return (
      <>
        <h1 className="text-2xl font-bold">Contraseña</h1>
        <p className="text-sm">En el modo demostración no hay usuarios ni contraseñas.</p>
      </>
    );
  }

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const nueva = String(f.get("nueva") ?? "");
    if (nueva.length < CLAVE_MINIMA) return setMsg({ ok: false, t: `Usa al menos ${CLAVE_MINIMA} caracteres.` });
    if (nueva !== String(f.get("repetir") ?? "")) return setMsg({ ok: false, t: "Las contraseñas no coinciden." });
    setCargando(true);
    setMsg(null);
    try {
      await repo!.cambiarClave!(nueva);
      form.reset();
      setMsg({ ok: true, t: "Contraseña actualizada. Úsala la próxima vez que entres." });
    } catch (err) {
      setMsg({ ok: false, t: err instanceof ErrorDatos ? err.message : "No se pudo cambiar la contraseña." });
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Contraseña</h1>
      <form onSubmit={guardar} className="tarjeta max-w-md space-y-4 p-4" data-form-clave>
        <div>
          <label htmlFor="nueva" className="etiqueta">Nueva contraseña</label>
          <input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={CLAVE_MINIMA} required className="campo" />
        </div>
        <div>
          <label htmlFor="repetir" className="etiqueta">Repite la contraseña</label>
          <input id="repetir" name="repetir" type="password" autoComplete="new-password" minLength={CLAVE_MINIMA} required className="campo" />
        </div>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-800" : "text-red-700"}`}>
            {msg.t}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primario" disabled={cargando}>{cargando ? "Guardando…" : "Cambiar contraseña"}</button>
          <Link href="/admin" className="btn-secundario">Ir al resumen</Link>
        </div>
      </form>
    </>
  );
}
