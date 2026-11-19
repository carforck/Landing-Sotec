"use client";

import { MessageCircle } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { enlaceConsulta } from "@/lib/whatsapp";

export function BotonWhatsApp() {
  const { config } = useTienda();
  return (
    <a
      href={enlaceConsulta(config)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f9d55] text-white shadow-lg hover:bg-[#178246]"
      aria-label="Escríbenos por WhatsApp"
    >
      <MessageCircle className="h-7 w-7" aria-hidden />
    </a>
  );
}
