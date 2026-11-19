"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos } from "@/lib/datos";
import type { Configuracion } from "@/lib/tipos";
import { normalizarNumero } from "@/lib/whatsapp";

export default function Config() {
  const { repo, config, recargar } = useTienda();
  const [c, setC] = useState<Configuracion>(config);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setC(config), [config]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!repo) return;
    const numero = normalizarNumero(c.whatsapp);
    if (numero.length < 10 || numero.length > 15) return setMsg("Escribe el número con indicativo, ej.: 573104696060.");
    if (!c.mensajeInicial.trim()) return setMsg("Escribe el saludo del mensaje.");
    try {
      await repo.guardarConfiguracion({ whatsapp: numero, mensajeInicial: c.mensajeInicial.trim() });
      await recargar();
      setMsg("Configuración guardada.");
    } catch (err) {
      setMsg(err instanceof ErrorDatos ? err.message : "No se pudo guardar.");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Configuración</h1>
      <form onSubmit={guardar} className="tarjeta max-w-xl space-y-4 p-4">
        <div>
          <label htmlFor="wa" className="etiqueta">WhatsApp de ventas (con indicativo)</label>
          <input id="wa" className="campo" inputMode="tel" value={c.whatsapp} onChange={(e) => setC({ ...c, whatsapp: e.target.value })} />
          <p className="mt-1 text-xs">Aquí llegan los pedidos de la tienda. Ej.: 573104696060.</p>
        </div>
        <div>
          <label htmlFor="msj" className="etiqueta">Saludo del mensaje del pedido</label>
          <textarea id="msj" rows={3} className="campo" value={c.mensajeInicial} onChange={(e) => setC({ ...c, mensajeInicial: e.target.value })} maxLength={300} />
        </div>
        {msg && <p role="status" className="text-sm">{msg}</p>}
        <button type="submit" className="btn-primario">Guardar</button>
      </form>
    </>
  );
}
