"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useTienda } from "@/components/Proveedor";
import { fechaCorta, formatoCOP } from "@/lib/formato";
import { ETIQUETA_ESTADO, type Pedido } from "@/lib/tipos";

export default function Resumen() {
  const { repo } = useTienda();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [conteo, setConteo] = useState({ productos: 0, activos: 0, categorias: 0 });

  useEffect(() => {
    if (!repo) return;
    void (async () => {
      const [ps, cs, ped] = await Promise.all([repo.productos({ todos: true }), repo.categorias({ todas: true }), repo.pedidos()]);
      setConteo({ productos: ps.length, activos: ps.filter((p) => p.activo).length, categorias: cs.length });
      setPedidos(ped);
    })();
  }, [repo]);

  const pendientes = pedidos.filter((p) => p.estado === "pendiente").length;
  const tarjetas = [
    { t: "Pedidos pendientes", v: pendientes, href: "/admin/pedidos" },
    { t: "Pedidos en total", v: pedidos.length, href: "/admin/pedidos" },
    { t: "Productos activos", v: `${conteo.activos} de ${conteo.productos}`, href: "/admin/productos" },
    { t: "Categorías", v: conteo.categorias, href: "/admin/categorias" },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold">Resumen</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((x) => (
          <Link key={x.t} href={x.href} className="tarjeta block p-4 hover:border-marca-btn">
            <p className="text-sm">{x.t}</p>
            <p className="mt-1 text-2xl font-bold text-tinta">{x.v}</p>
          </Link>
        ))}
      </div>
      <section className="tarjeta p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-sm font-semibold text-marca-oscuro underline-offset-4 hover:underline">Ver todos</Link>
        </div>
        {pedidos.length ? (
          <ul className="mt-3 divide-y divide-linea">
            {pedidos.slice(0, 5).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span><strong className="text-tinta">{p.codigo}</strong> · {p.cliente.nombre} · {fechaCorta(p.creado)}</span>
                <span>{formatoCOP(p.total)} · {ETIQUETA_ESTADO[p.estado]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">Todavía no hay pedidos.</p>
        )}
      </section>
    </>
  );
}
