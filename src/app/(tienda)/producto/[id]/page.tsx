"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { textoPrecio } from "@/lib/formato";
import { urlImagen } from "@/lib/rutas";
import type { Producto } from "@/lib/tipos";

export default function FichaProducto({ params }: { params: { id: string } }) {
  const { listo, productos, categorias, agregar } = useTienda();
  const [producto, setProducto] = useState<Producto | null | undefined>(undefined);
  const [foto, setFoto] = useState(0);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    if (!listo) return;
    setProducto(productos.find((p) => p.id === decodeURIComponent(params.id)) ?? null);
  }, [listo, productos, params.id]);

  if (producto === undefined) return <div className="contenedor py-10" aria-busy="true">Cargando…</div>;
  if (producto === null)
    return (
      <div className="contenedor py-16 text-center">
        <h1 className="text-2xl font-bold">Este producto no está disponible</h1>
        <Link href="/" className="btn-primario mt-6">Ver el catálogo</Link>
      </div>
    );

  const cat = categorias.find((c) => c.id === producto.categoriaId);
  const ficha = producto.fichaTecnica.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="contenedor py-6">
      <Link href={cat ? `/?categoria=${cat.id}` : "/"} className="btn -ml-2 px-2 text-tenue hover:text-tinta">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {cat?.nombre ?? "Catálogo"}
      </Link>
      <div className="mt-2 grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-fondo">
            <img src={urlImagen(producto.imagenes[foto])} alt={producto.nombre} className="h-full w-full object-cover" />
          </div>
          {producto.imagenes.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto" role="group" aria-label="Fotos del producto">
              {producto.imagenes.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFoto(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-pressed={i === foto}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === foto ? "border-marca-btn" : "border-transparent"}`}
                >
                  <img src={urlImagen(src)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          {cat && <p className="text-sm font-semibold uppercase tracking-wide text-marca-oscuro">{cat.nombre}</p>}
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{producto.nombre}</h1>
          <p className={`mt-3 ${producto.precio == null ? "text-lg font-semibold text-tenue" : "text-3xl font-bold text-tinta"}`}>{textoPrecio(producto.precio)}</p>
          {producto.precio == null && <p className="mt-1 text-sm">Agrégalo al carrito y te enviamos el valor por WhatsApp.</p>}
          <p className="mt-4">{producto.descripcion}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-linea" role="group" aria-label="Cantidad">
              <button type="button" className="btn px-3" onClick={() => setCantidad((c) => Math.max(1, c - 1))} aria-label="Menos">
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span className="w-10 text-center font-semibold text-tinta" aria-live="polite">{cantidad}</span>
              <button type="button" className="btn px-3" onClick={() => setCantidad((c) => Math.min(999, c + 1))} aria-label="Más">
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <button type="button" className="btn-primario flex-1 sm:flex-none" onClick={() => agregar(producto, cantidad)}>
              <ShoppingCart className="h-4 w-4" aria-hidden /> Agregar al carrito
            </button>
          </div>

          {ficha.length > 0 && (
            <section className="mt-8" aria-labelledby="ficha">
              <h2 id="ficha" className="text-lg font-bold">Ficha técnica</h2>
              <ul className="mt-2 divide-y divide-linea rounded-xl border border-linea">
                {ficha.map((l, i) => {
                  const [k, ...v] = l.split(":");
                  return (
                    <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-sm">
                      {v.length ? (
                        <>
                          <span className="font-semibold text-tinta">{k.trim()}</span>
                          <span>{v.join(":").trim()}</span>
                        </>
                      ) : (
                        <span>{l}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
