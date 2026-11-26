"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, Loader2, MessageCircle } from "lucide-react";

import { Interruptor } from "@/components/admin/Interruptor";
import { useTienda } from "@/components/Proveedor";
import { ErrorDatos } from "@/lib/datos";
import type { Configuracion, DatosCliente, ItemCarrito } from "@/lib/tipos";
import { enlaceWhatsApp, mensajePedido, normalizarNumero } from "@/lib/whatsapp";

/** «573104696060» → «+57 310 469 6060». Vacío si aún no parece un número. */
function numeroLegible(n: string): string {
  const d = normalizarNumero(n);
  if (d.length === 12 && d.startsWith("57")) return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return d.length >= 10 ? `+${d}` : "";
}
const numeroValido = (n: string) => {
  const d = normalizarNumero(n);
  return d.length >= 10 && d.length <= 15;
};

const CLIENTE_EJEMPLO: DatosCliente = { nombre: "Cliente de ejemplo", celular: "300 000 0000", ciudad: "Barranquilla", segmento: "hogar" };
const ITEMS_EJEMPLO: ItemCarrito[] = [
  { productoId: "ejemplo-1", tipo: "producto", nombre: "Cámara de seguridad Wi-Fi", precio: 180000, imagen: "", cantidad: 2 },
  { productoId: "ejemplo-2", tipo: "servicio", nombre: "Instalación de cámaras", precio: 120000, modalidad: "Visita técnica", imagen: "", cantidad: 1 },
];

/** Texto de WhatsApp con *negritas* como se ven en el chat. */
function TextoWhatsApp({ texto }: { texto: string }): ReactNode {
  return texto.split(/(\*[^*\n]+\*)/g).map((t, i) => (t.startsWith("*") && t.endsWith("*") && t.length > 2 ? <strong key={i}>{t.slice(1, -1)}</strong> : t));
}

function CampoNumero({ id, etiqueta, valor, alCambiar, disabled, ayuda }: { id: string; etiqueta: string; valor: string; alCambiar: (v: string) => void; disabled?: boolean; ayuda?: string }) {
  const legible = numeroLegible(valor);
  const ok = numeroValido(valor);
  return (
    <div>
      <label htmlFor={id} className="etiqueta">{etiqueta}</label>
      <div className="flex flex-wrap gap-2">
        <input id={id} className="campo min-w-0 flex-1 disabled:bg-fondo disabled:text-tenue" inputMode="tel" autoComplete="off" value={valor} disabled={disabled} onChange={(e) => alCambiar(e.target.value)} aria-describedby={`${id}-ayuda`} />
        <a
          className={`btn-secundario ${ok ? "" : "pointer-events-none opacity-50"}`}
          href={ok ? enlaceWhatsApp(valor, "Hola, esta es una prueba desde el panel de la tienda virtual de SOTEC.") : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!ok}
          title="Abre WhatsApp con este número para comprobar que es el correcto"
        >
          <ExternalLink className="h-4 w-4" aria-hidden /> Probar
        </a>
      </div>
      <p id={`${id}-ayuda`} className="mt-1 text-sm">
        {legible ? (
          <span className={ok ? "font-semibold text-marca-oscuro" : "text-red-700"}>
            {ok && <CheckCircle2 className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden />}
            Así queda: {legible}
          </span>
        ) : (
          <span className="text-red-700">Escribe el celular, ej.: 310 469 6060.</span>
        )}
        {ayuda && <span className="block text-xs text-tenue">{ayuda}</span>}
      </p>
    </div>
  );
}

export default function Config() {
  const { repo, config, recargar, avisar } = useTienda();
  const [c, setC] = useState<Configuracion>(config);
  const [mismo, setMismo] = useState(config.whatsappHogar === config.whatsappEmpresa);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setC(config);
    setMismo(normalizarNumero(config.whatsappHogar) === normalizarNumero(config.whatsappEmpresa));
  }, [config]);

  const empresa = mismo ? c.whatsappHogar : c.whatsappEmpresa;
  const cambios = normalizarNumero(c.whatsappHogar) !== config.whatsappHogar || normalizarNumero(empresa) !== config.whatsappEmpresa || c.mensajeInicial.trim() !== config.mensajeInicial.trim();

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!repo) return;
    const hogar = normalizarNumero(c.whatsappHogar);
    const emp = normalizarNumero(empresa);
    if (![hogar, emp].every((n) => n.length >= 10 && n.length <= 15)) return setError("Revisa los números: escribe el celular con indicativo, ej.: 57 310 469 6060.");
    if (!c.mensajeInicial.trim()) return setError("Escribe el saludo del mensaje.");
    setError(null);
    setGuardando(true);
    try {
      await repo.guardarConfiguracion({ whatsappHogar: hogar, whatsappEmpresa: emp, mensajeInicial: c.mensajeInicial.trim() });
      await recargar();
      avisar("Configuración guardada.");
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const ejemplo = mensajePedido({ ...c, whatsappEmpresa: empresa }, "T-EJEMPLO", CLIENTE_EJEMPLO, ITEMS_EJEMPLO);

  return (
    <>
      <h1 className="text-2xl font-bold">Configuración</h1>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
        <form onSubmit={guardar} className="tarjeta min-w-0 space-y-5 p-4">
          <div>
            <h2 className="text-lg font-bold">WhatsApp de ventas</h2>
            <p className="text-sm">Al enviar el pedido, el cliente elige si es para hogar o para empresa, y el mensaje llega al número de ese grupo. Pulsa «Probar» para comprobar que el número abre el chat correcto.</p>
          </div>
          <CampoNumero id="wa-hogar" etiqueta={mismo ? "WhatsApp de ventas (hogar y empresas)" : "WhatsApp de ventas para hogar"} valor={c.whatsappHogar} alCambiar={(v) => setC({ ...c, whatsappHogar: v })} ayuda="Puedes escribirlo con espacios; se guarda con el indicativo 57." />
          <Interruptor
            activo={mismo}
            alCambiar={(v) => {
              setMismo(v);
              // Al separarlos, el de empresas arranca con el mismo número para que solo lo cambies
              if (!v) setC({ ...c, whatsappEmpresa: c.whatsappHogar });
            }}
            etiqueta="Usar el mismo número para hogar y empresas"
            ayuda={mismo ? "Todos los pedidos llegan a un solo WhatsApp" : "Los pedidos de empresas llegan a otro número"}
          />
          <CampoNumero id="wa-empresa" etiqueta="WhatsApp de ventas para empresas" valor={empresa} disabled={mismo} alCambiar={(v) => setC({ ...c, whatsappEmpresa: v })} ayuda={mismo ? "Es el mismo de arriba. Apaga el interruptor para usar otro." : undefined} />
          <div>
            <label htmlFor="msj" className="etiqueta">Saludo con el que empieza el mensaje</label>
            <textarea id="msj" rows={3} className="campo" value={c.mensajeInicial} onChange={(e) => setC({ ...c, mensajeInicial: e.target.value })} maxLength={300} />
            <p className="mt-1 text-xs text-tenue">Es la primera línea del mensaje que te llega. Mira el ejemplo.</p>
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primario" disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Guardar configuración
            </button>
            {cambios && <span className="text-sm font-semibold text-amber-800">Tienes cambios sin guardar.</span>}
          </div>
        </form>

        <section aria-labelledby="ejemplo-mensaje" className="tarjeta min-w-0 p-4">
          <h2 id="ejemplo-mensaje" className="flex items-center gap-2 text-lg font-bold">
            <MessageCircle className="h-5 w-5 text-[#128c7e]" aria-hidden /> Así te llega un pedido
          </h2>
          <p className="text-sm">Ejemplo con datos inventados. Llega a {numeroLegible(c.whatsappHogar) || "tu número"} si es para hogar{!mismo && numeroLegible(empresa) ? ` y a ${numeroLegible(empresa)} si es para empresa` : ""}.</p>
          <div className="mt-3 rounded-2xl bg-[#efeae2] p-3">
            <div className="ml-auto max-w-[95%] whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-[#d9fdd3] p-3 text-[13px] leading-snug text-[#111b21] shadow-sm">
              <TextoWhatsApp texto={ejemplo} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
