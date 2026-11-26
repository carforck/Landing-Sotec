"use client";

import { useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { ArrowBigUp, Eye, EyeOff, Lock } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; etiqueta: string; conIcono?: boolean };

/** Campo de contraseña con botón para mostrarla/ocultarla y aviso de Bloq Mayús. */
export function CampoClave({ id, etiqueta, conIcono = false, className = "", onKeyUp, ...resto }: Props) {
  const [visible, setVisible] = useState(false);
  const [mayus, setMayus] = useState(false);

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    setMayus(e.getModifierState?.("CapsLock") ?? false);
    onKeyUp?.(e);
  }

  return (
    <div>
      <label htmlFor={id} className="etiqueta">{etiqueta}</label>
      <div className="relative">
        {conIcono && <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" aria-hidden />}
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyUp={teclas}
          onKeyDown={teclas}
          onBlur={() => setMayus(false)}
          className={`campo pr-12 ${conIcono ? "pl-10" : ""} ${className}`}
          aria-describedby={mayus ? `${id}-mayus` : undefined}
          data-campo-clave
          {...resto}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-tenue hover:bg-fondo hover:text-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-btn"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          aria-controls={id}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          data-ver-clave
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {mayus && (
        <p id={`${id}-mayus`} className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-800" data-aviso-mayus>
          <ArrowBigUp className="h-4 w-4" aria-hidden /> Las mayúsculas están activadas.
        </p>
      )}
    </div>
  );
}
