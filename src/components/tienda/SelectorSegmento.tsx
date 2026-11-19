"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, House, LayoutGrid } from "lucide-react";

/** «¿Para dónde compras?»: filtra carruseles y catálogo por segmento (?segmento=). */
export function SelectorSegmento() {
  const params = useSearchParams();
  const actual = params.get("segmento") ?? "";
  const opciones = [
    { valor: "", texto: "Todo", Icono: LayoutGrid },
    { valor: "hogar", texto: "Para el hogar", Icono: House },
    { valor: "empresa", texto: "Para empresas", Icono: Building2 },
  ];
  return (
    <nav aria-label="¿Para dónde compras?" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-selector-segmento>
      <p className="font-titulo text-base font-bold text-tinta sm:text-lg">¿Para dónde compras?</p>
      <ul className="grid grid-cols-3 gap-2 sm:flex">
        {opciones.map(({ valor, texto, Icono }) => {
          const activo = actual === valor;
          const q = new URLSearchParams(params.toString());
          if (valor) q.set("segmento", valor);
          else q.delete("segmento");
          return (
            <li key={valor || "todo"}>
              <Link
                href={`/${q.size ? `?${q}` : ""}`}
                scroll={false}
                aria-current={activo ? "true" : undefined}
                className={`btn w-full flex-col gap-1 px-2 py-2 text-xs sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${activo ? "bg-marca-btn text-white" : "border border-linea bg-white text-tinta hover:bg-fondo"}`}
                data-segmento={valor || "todo"}
              >
                <Icono className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden /> {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
