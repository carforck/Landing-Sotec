import { BadgeCheck, Headset, MessageCircle, Wrench } from "lucide-react";

const BENEFICIOS = [
  { Icono: Wrench, titulo: "Instalación profesional", texto: "Técnicos certificados de SOTEC" },
  { Icono: Headset, titulo: "Asesoría técnica sin costo", texto: "Te ayudamos a elegir bien" },
  { Icono: MessageCircle, titulo: "Cotización por WhatsApp en minutos", texto: "Respuesta rápida y directa" },
  { Icono: BadgeCheck, titulo: "Garantía SOTEC", texto: "Respaldo en equipos e instalación" },
];

export function Beneficios() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" data-beneficios>
      {BENEFICIOS.map(({ Icono, titulo, texto }) => (
        <li key={titulo} className="tarjeta flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca-btn text-white">
            <Icono className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-bold text-tinta">{titulo}</span>
            <span className="block text-xs">{texto}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
