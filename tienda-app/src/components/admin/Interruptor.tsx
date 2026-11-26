"use client";

/** Interruptor accesible (role="switch") para opciones de sí/no del panel, ej. «Visible en la tienda». */
export function Interruptor({
  activo,
  alCambiar,
  etiqueta,
  ayuda,
  oculto = false,
  disabled,
  ...data
}: {
  activo: boolean;
  alCambiar: (v: boolean) => void;
  etiqueta: string;
  /** Texto corto debajo de la etiqueta. */
  ayuda?: string;
  /** Solo el interruptor, con la etiqueta para lectores de pantalla. */
  oculto?: boolean;
  disabled?: boolean;
} & { [k: `data-${string}`]: string | undefined }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={oculto ? etiqueta : undefined}
      disabled={disabled}
      onClick={() => alCambiar(!activo)}
      className="group flex min-h-[44px] items-center gap-3 rounded-xl text-left disabled:cursor-not-allowed disabled:opacity-60"
      {...data}
    >
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-marca-btn group-focus-visible:ring-offset-2 ${activo ? "bg-marca-btn" : "bg-gray-300"}`} aria-hidden>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </span>
      {!oculto && (
        <span>
          <span className="block text-sm font-semibold text-tinta">{etiqueta}</span>
          {ayuda && <span className="block text-xs text-tenue">{ayuda}</span>}
        </span>
      )}
    </button>
  );
}
