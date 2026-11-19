"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { comprimirImagen } from "@/lib/imagen";
import { urlImagen } from "@/lib/rutas";

/** Subir una imagen (comprimida) con vista previa; opcionalmente se puede quitar. */
export function CampoImagen({ etiqueta, valor, alCambiar, opcional, dataId, ancho = "w-28" }: { etiqueta: string; valor: string; alCambiar: (v: string) => void; opcional?: boolean; dataId: string; ancho?: string }) {
  const { repo } = useTienda();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function subir(f: File | undefined) {
    if (!f || !repo) return;
    setCargando(true);
    setError(null);
    try {
      alCambiar(await repo.subirImagen(await comprimirImagen(f), f.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la imagen.");
    } finally {
      setCargando(false);
    }
  }
  return (
    <div>
      <p className="etiqueta">{etiqueta}{opcional && " (opcional)"}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className={`h-16 ${ancho} shrink-0 overflow-hidden rounded-lg border border-linea bg-fondo`}>
          {valor && <img src={urlImagen(valor)} alt="" className="h-full w-full object-cover" data-vista={dataId} />}
        </div>
        <label className="btn-secundario cursor-pointer focus-within:ring-2 focus-within:ring-marca-btn">
          <ImagePlus className="h-4 w-4" aria-hidden /> {cargando ? "Cargando…" : valor ? "Cambiar" : "Subir"}
          <input type="file" accept="image/*" className="sr-only" disabled={cargando} onChange={(e) => void subir(e.target.files?.[0])} aria-label={etiqueta} data-subir={dataId} />
        </label>
        {opcional && valor && (
          <button type="button" className="btn px-2 text-sm text-tenue hover:text-tinta" onClick={() => alCambiar("")}>Quitar</button>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
