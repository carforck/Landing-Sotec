"use client";

import { CheckCircle2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";

export function Aviso() {
  const { aviso } = useTienda();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      {aviso && (
        <p className="flex max-w-md items-center gap-2 rounded-xl bg-tinta px-4 py-3 text-sm text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-marca" aria-hidden />
          {aviso}
        </p>
      )}
    </div>
  );
}
