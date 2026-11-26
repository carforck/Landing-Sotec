"use client";

import { useLayoutEffect, useRef } from "react";

/** «690000» → «690.000» (sin ceros a la izquierda, máximo 12 cifras). */
export function formatoMiles(texto: string): string {
  const d = texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** «$ 690.000» → 690000; vacío → null. */
export function numeroDe(texto: string): number | null {
  const d = texto.replace(/\D/g, "");
  return d ? Number(d) : null;
}

/**
 * Campo de pesos con separador de miles mientras se escribe («$ 690.000»).
 * Acepta que se escriba o pegue con puntos, espacios o «$»: solo se guardan las cifras.
 */
export function ProductoCampoPrecio({
  id,
  valor,
  alCambiar,
  placeholder,
  error,
  ayudaId,
}: {
  id: string;
  valor: string;
  alCambiar: (texto: string) => void;
  placeholder?: string;
  error?: string;
  ayudaId?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  /** Cifras que había antes del cursor, para dejarlo en su sitio tras poner los puntos. */
  const cifrasAntes = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const n0 = cifrasAntes.current;
    cifrasAntes.current = null;
    if (!el || n0 == null || document.activeElement !== el) return;
    let n = n0;
    let i = 0;
    while (i < el.value.length && n > 0) {
      if (/\d/.test(el.value[i])) n--;
      i++;
    }
    el.setSelectionRange(i, i);
  }, [valor]);

  const describe = [ayudaId, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-tenue" aria-hidden>
          $
        </span>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={`campo pl-7 ${error ? "border-red-500 focus:border-red-600" : ""}`}
          placeholder={placeholder}
          value={valor}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe}
          onChange={(e) => {
            const el = e.target;
            const pos = el.selectionStart ?? el.value.length;
            cifrasAntes.current = el.value.slice(0, pos).replace(/\D/g, "").length;
            alCambiar(formatoMiles(el.value));
          }}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
