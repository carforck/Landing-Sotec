/** Íconos que el admin puede elegir por categoría (nombre guardado → componente lucide). */
import { Bell, Cable, Camera, Cctv, Cog, Cpu, DoorOpen, Fingerprint, Flame, HardDrive, KeyRound, Laptop, Lightbulb, Lock, Monitor, Network, Package, Printer, Radio, Router, Server, ShieldCheck, Sun, Wifi, Wrench, Zap, type LucideIcon } from "lucide-react";

export const ICONOS: { clave: string; nombre: string; Icono: LucideIcon }[] = [
  { clave: "computador", nombre: "Portátil / cómputo", Icono: Laptop },
  { clave: "monitor", nombre: "Monitor / PC de escritorio", Icono: Monitor },
  { clave: "servidor", nombre: "Servidor", Icono: Server },
  { clave: "disco", nombre: "Almacenamiento", Icono: HardDrive },
  { clave: "impresora", nombre: "Impresora / periféricos", Icono: Printer },
  { clave: "incendio", nombre: "Incendio", Icono: Flame },
  { clave: "sol", nombre: "Sol / energía solar", Icono: Sun },
  { clave: "energia", nombre: "Rayo / energía", Icono: Zap },
  { clave: "bombillo", nombre: "Bombillo / iluminación", Icono: Lightbulb },
  { clave: "alarma", nombre: "Escudo / alarma", Icono: ShieldCheck },
  { clave: "campana", nombre: "Campana / sirena", Icono: Bell },
  { clave: "camara", nombre: "Cámara CCTV", Icono: Cctv },
  { clave: "foto", nombre: "Cámara", Icono: Camera },
  { clave: "red", nombre: "Red", Icono: Network },
  { clave: "router", nombre: "Router", Icono: Router },
  { clave: "wifi", nombre: "Wi-Fi", Icono: Wifi },
  { clave: "cable", nombre: "Cableado", Icono: Cable },
  { clave: "radio", nombre: "Radio / antena", Icono: Radio },
  { clave: "automatizacion", nombre: "Automatización", Icono: Cpu },
  { clave: "engranaje", nombre: "Engranaje", Icono: Cog },
  { clave: "acceso", nombre: "Huella / control de acceso", Icono: Fingerprint },
  { clave: "llave", nombre: "Llave", Icono: KeyRound },
  { clave: "candado", nombre: "Candado", Icono: Lock },
  { clave: "puerta", nombre: "Puerta", Icono: DoorOpen },
  { clave: "herramienta", nombre: "Herramienta / servicio", Icono: Wrench },
  { clave: "paquete", nombre: "Paquete / otros", Icono: Package },
];

const POR_CLAVE = new Map(ICONOS.map((i) => [i.clave, i.Icono]));

/** Componente del ícono; si la clave no existe, «paquete». */
export function iconoDe(clave: string | undefined): LucideIcon {
  return (clave && POR_CLAVE.get(clave)) || Package;
}
