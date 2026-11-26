"use client";

import { useState, type DragEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { comprimirImagen } from "@/lib/imagen";
import { urlImagen } from "@/lib/rutas";

/**
 * Subir una imagen (comprimida) con vista previa; se elige con el botón o se arrastra y suelta
 * encima. Opcionalmente se puede quitar. `ayuda`: texto corto, ej. el tamaño recomendado.
 */
export function CampoImagen({
  etiqueta,
  valor,
  alCambiar,
  opcional,
  dataId,
  ancho = "w-28",
  ayuda,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  opcional?: boolean;
  dataId: string;
  ancho?: string;
  ayuda?: string;
}) {
  const { repo } = useTienda();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);

  async function subir(f: File | undefined) {
    if (!f || !repo) return;
    if (f.type && !f.type.startsWith("image/")) return setError("Ese archivo no es una imagen. Usa una foto JPG, PNG o WebP.");
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

  function soltar(e: DragEvent) {
    e.preventDefault();
    setEncima(false);
    if (!cargando) void subir(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <p className="etiqueta">{etiqueta}{opcional && " (opcional)"}</p>
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl p-1 transition-colors ${encima ? "bg-marca-suave outline-dashed outline-2 outline-marca-btn" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!cargando) setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
      >
        <div className={`relative flex h-16 ${ancho} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-linea bg-fondo`}>
          {valor ? <img src={urlImagen(valor)} alt="" className="h-full w-full object-cover" data-vista={dataId} /> : <ImagePlus className="h-5 w-5 text-tenue" aria-hidden />}
          {cargando && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70" aria-hidden>
              <Loader2 className="h-5 w-5 animate-spin text-marca-btn" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-secundario cursor-pointer focus-within:ring-2 focus-within:ring-marca-btn">
              <ImagePlus className="h-4 w-4" aria-hidden /> {cargando ? "Cargando…" : valor ? "Cambiar" : "Subir"}
              <input type="file" accept="image/*" className="sr-only" disabled={cargando} onChange={(e) => void subir(e.target.files?.[0])} aria-label={etiqueta} data-subir={dataId} />
            </label>
            {opcional && valor && (
              <button type="button" className="btn px-2 text-sm text-tenue hover:text-tinta" onClick={() => alCambiar("")}>Quitar</button>
            )}
          </div>
          <p className="mt-1 text-xs text-tenue">
            {encima ? "Suelta la imagen aquí." : "También puedes arrastrarla aquí."}
            {ayuda && <span className="block">{ayuda}</span>}
          </p>
        </div>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
