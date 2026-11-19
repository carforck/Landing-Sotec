import { BadgeCheck, Headset, MessageCircle, Wrench } from "lucide-react";

const BENEFICIOS = [
  { Icono: Wrench, titulo: "Instalación profesional", texto: "Técnicos certificados de SOTEC" },
  { Icono: Headset, titulo: "Asesoría técnica sin costo", texto: "Te ayudamos a elegir bien" },
  { Icono: MessageCircle, titulo: "Cotización por WhatsApp en minutos", texto: "Respuesta rápida y directa" },
  { Icono: BadgeCheck, titulo: "Garantía SOTEC", texto: "Respaldo en equipos e instalación" },
];

export function Beneficios() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4" data-beneficios>
      {BENEFICIOS.map(({ Icono, titulo, texto }) => (
        <li key={titulo} className="tarjeta flex flex-col items-center gap-2 p-3 text-center sm:flex-row sm:gap-3 sm:p-4 sm:text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-btn text-white sm:h-11 sm:w-11">
            <Icono className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-xs font-bold leading-snug text-tinta sm:text-sm">{titulo}</span>
            <span className="hidden text-xs sm:block">{texto}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
