import { descuento, formatoCOP } from "@/lib/formato";
import type { Producto } from "@/lib/tipos";

/** Etiquetas de la tarjeta y la ficha: Servicio, Oferta -X %, Más vendido, Nuevo, Precio a cotizar. */
export function Etiquetas({ producto }: { producto: Producto }) {
  const d = descuento(producto);
  return (
    <div className="flex flex-wrap gap-1" data-etiquetas>
      {producto.tipo === "servicio" && <span className="rounded-md bg-violet-700 px-2 py-0.5 text-xs font-bold text-white">Servicio</span>}
      {d != null && <span className="rounded-md bg-red-700 px-2 py-0.5 text-xs font-bold text-white" data-oferta>Oferta -{d} %</span>}
      {producto.destacado && <span className="rounded-md bg-marca-btn px-2 py-0.5 text-xs font-bold text-white">Más vendido</span>}
      {producto.nuevo && <span className="rounded-md bg-sky-700 px-2 py-0.5 text-xs font-bold text-white">Nuevo</span>}
      {producto.precio == null && <span className="rounded-md bg-tinta px-2 py-0.5 text-xs font-bold text-white">{producto.tipo === "servicio" ? "A cotizar" : "Precio a cotizar"}</span>}
    </div>
  );
}

/** Precio protagonista: «$ X» con anterior tachado y -X %, «Desde $ X» en servicios o «a cotizar». */
export function Precio({ producto, tamano = "tarjeta" }: { producto: Producto; tamano?: "tarjeta" | "ficha" }) {
  const grande = tamano === "ficha" ? "[font-size:clamp(1.875rem,1.5rem+1.5vw,2.5rem)]" : "text-xl sm:text-2xl";
  const d = descuento(producto);
  if (producto.precio == null)
    return <p className={`font-bold text-tenue ${tamano === "ficha" ? "text-xl" : "text-base sm:text-lg"}`}>{producto.tipo === "servicio" ? "A cotizar" : "Precio a cotizar"}</p>;
  return (
    <div data-precio-bloque>
      {d != null && producto.precioAnterior != null && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <s className="text-tenue" data-precio-anterior>
            <span className="sr-only">Antes </span>
            {formatoCOP(producto.precioAnterior)}
          </s>
          <span className="font-bold text-red-700">-{d} %</span>
        </p>
      )}
      <p className={`font-extrabold tracking-tight text-tinta ${grande}`} data-precio>
        {producto.tipo === "servicio" && <span className="mr-1 text-sm font-semibold text-tenue">Desde</span>}
        {formatoCOP(producto.precio)}
      </p>
    </div>
  );
}
