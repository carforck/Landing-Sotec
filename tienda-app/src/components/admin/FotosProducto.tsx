"use client";

import { useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2, UploadCloud } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { FOTOS_MAXIMAS, comprimirImagen } from "@/lib/imagen";
import { urlImagen } from "@/lib/rutas";

/**
 * Fotos del producto: arrastrar y soltar o botón «Elegir fotos», mover a izquierda/derecha,
 * elegir la principal (la primera) y quitar. Las fotos se comprimen antes de subirlas.
 */
export function FotosProducto({
  imagenes,
  alCambiar,
  alSubiendo,
}: {
  imagenes: string[];
  /** Recibe una función para no perder fotos si llegan mientras se sube otra. */
  alCambiar: (f: (actuales: string[]) => string[]) => void;
  alSubiendo?: (v: boolean) => void;
}) {
  const { repo } = useTienda();
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caben = FOTOS_MAXIMAS - imagenes.length;

  async function agregar(lista: FileList | File[] | null) {
    if (!repo || !lista) return;
    const archivos = Array.from(lista).filter((a) => a.type.startsWith("image/"));
    setError(null);
    if (!archivos.length) return setError("Eso no parece una foto. Usa archivos JPG, PNG o WEBP.");
    if (caben <= 0) return setError(`Ya tienes ${FOTOS_MAXIMAS} fotos, el máximo. Quita una para agregar otra.`);
    setSubiendo(true);
    alSubiendo?.(true);
    const nuevas: string[] = [];
    try {
      for (const a of archivos.slice(0, caben)) {
        nuevas.push(await repo.subirImagen(await comprimirImagen(a), a.name));
      }
      if (archivos.length > caben) setError(`Solo se agregaron ${caben}: el máximo son ${FOTOS_MAXIMAS} fotos.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la foto. Intenta con otra.");
    } finally {
      if (nuevas.length) alCambiar((xs) => [...xs, ...nuevas].slice(0, FOTOS_MAXIMAS));
      setSubiendo(false);
      alSubiendo?.(false);
    }
  }

  function mover(i: number, a: number) {
    alCambiar((xs) => {
      if (a < 0 || a >= xs.length) return xs;
      const copia = [...xs];
      [copia[i], copia[a]] = [copia[a], copia[i]];
      return copia;
    });
  }

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    void agregar(e.dataTransfer.files);
  };

  const claseMini = "flex h-10 w-10 items-center justify-center rounded-lg border border-linea bg-white text-tinta hover:bg-fondo disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-3">
      {imagenes.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {imagenes.map((src, i) => (
            <li key={`${i}-${src.slice(-24)}`} className={`overflow-hidden rounded-xl border-2 bg-white ${i === 0 ? "border-marca-btn" : "border-linea"}`} data-foto>
              <div className="relative aspect-square bg-fondo">
                <img src={urlImagen(src)} alt={`Foto ${i + 1}${i === 0 ? " (principal)" : ""}`} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-marca-btn px-2 py-0.5 text-xs font-bold text-white">
                    <Star className="h-3 w-3 fill-white" aria-hidden /> Principal
                  </span>
                )}
              </div>
              <div className="space-y-2 p-2">
                {i > 0 && (
                  <button type="button" className="btn-secundario min-h-[40px] w-full px-2 text-xs" onClick={() => alCambiar((xs) => [xs[i], ...xs.filter((_, k) => k !== i)])}>
                    <Star className="h-3.5 w-3.5" aria-hidden /> Usar como principal
                  </button>
                )}
                <div className="flex items-center justify-between gap-1">
                  <button type="button" className={claseMini} onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label={`Mover foto ${i + 1} a la izquierda`} title="Mover a la izquierda">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" className={claseMini} onClick={() => mover(i, i + 1)} disabled={i === imagenes.length - 1} aria-label={`Mover foto ${i + 1} a la derecha`} title="Mover a la derecha">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" className={`${claseMini} border-red-200 text-red-700 hover:bg-red-50`} onClick={() => alCambiar((xs) => xs.filter((_, k) => k !== i))} aria-label={`Quitar foto ${i + 1}`} title="Quitar foto">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {caben > 0 ? (
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${arrastrando ? "border-marca-btn bg-marca-suave" : "border-linea bg-fondo"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
          data-zona-fotos
        >
          <UploadCloud className="h-8 w-8 text-marca-btn" aria-hidden />
          <p className="text-sm font-semibold text-tinta">{subiendo ? "Cargando fotos…" : "Arrastra las fotos aquí"}</p>
          <p className="text-xs text-tenue">o</p>
          <label className={`btn-primario cursor-pointer focus-within:ring-2 focus-within:ring-marca-btn focus-within:ring-offset-2 ${subiendo ? "pointer-events-none opacity-60" : ""}`}>
            <ImagePlus className="h-4 w-4" aria-hidden /> {subiendo ? "Cargando…" : "Elegir fotos"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => {
              void agregar(e.target.files);
              e.target.value = "";
            }} disabled={subiendo} aria-label="Elegir fotos del producto" data-subir-fotos />
          </label>
          <p className="text-xs text-tenue">Puedes agregar {caben === FOTOS_MAXIMAS ? `hasta ${FOTOS_MAXIMAS}` : `${caben} más`}. Se achican solas para que la tienda cargue rápido.</p>
        </div>
      ) : (
        <p className="text-sm text-tenue">Llegaste al máximo de {FOTOS_MAXIMAS} fotos. Quita una si quieres cambiarla.</p>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
