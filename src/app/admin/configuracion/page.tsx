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
    const hogar = normalizarNumero(c.whatsappHogar);
    const empresa = normalizarNumero(c.whatsappEmpresa);
    if ([hogar, empresa].some((n) => n.length < 10 || n.length > 15)) return setMsg("Escribe los números con indicativo, ej.: 573104696060.");
    if (!c.mensajeInicial.trim()) return setMsg("Escribe el saludo del mensaje.");
    try {
      await repo.guardarConfiguracion({ whatsappHogar: hogar, whatsappEmpresa: empresa, mensajeInicial: c.mensajeInicial.trim() });
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
        <p className="text-sm">El cliente responde «¿Es para hogar o empresa?» al enviar el pedido, y el mensaje llega al número de ese segmento. Pueden ser el mismo número.</p>
        <div>
          <label htmlFor="wa-hogar" className="etiqueta">WhatsApp de ventas para hogar</label>
          <input id="wa-hogar" className="campo" inputMode="tel" value={c.whatsappHogar} onChange={(e) => setC({ ...c, whatsappHogar: e.target.value })} />
        </div>
        <div>
          <label htmlFor="wa-empresa" className="etiqueta">WhatsApp de ventas para empresas</label>
          <input id="wa-empresa" className="campo" inputMode="tel" value={c.whatsappEmpresa} onChange={(e) => setC({ ...c, whatsappEmpresa: e.target.value })} />
          <p className="mt-1 text-xs">Con indicativo del país, ej.: 573104696060.</p>
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
