"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { CampoClave } from "@/components/admin/CampoClave";
import { ErrorDatos } from "@/lib/datos";

const CLAVE_MINIMA = 10;

/** Cambiar la contraseña del administrador. También es el destino del enlace «¿Olvidaste tu contraseña?». */
export default function Clave() {
  const { repo } = useTienda();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");

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
      setNueva("");
      setRepetir("");
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
        <CampoClave id="nueva" name="nueva" etiqueta="Nueva contraseña" autoComplete="new-password" minLength={CLAVE_MINIMA} required value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <CampoClave id="repetir" name="repetir" etiqueta="Repite la contraseña" autoComplete="new-password" minLength={CLAVE_MINIMA} required value={repetir} onChange={(e) => setRepetir(e.target.value)} />
        <ul className="space-y-1 text-sm" aria-label="Requisitos" data-requisitos-clave>
          <Requisito ok={nueva.length >= CLAVE_MINIMA} texto={`Al menos ${CLAVE_MINIMA} caracteres`} />
          <Requisito ok={/[a-zñ]/i.test(nueva) && /\d/.test(nueva)} texto="Letras y números (recomendado)" />
          <Requisito ok={nueva.length > 0 && nueva === repetir} texto="Las dos contraseñas coinciden" />
        </ul>
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

function Requisito({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-green-800" : "text-tenue"}`} data-cumple={ok ? "si" : "no"}>
      {ok ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />} {texto}
      <span className="sr-only">{ok ? "(cumple)" : "(pendiente)"}</span>
    </li>
  );
}
