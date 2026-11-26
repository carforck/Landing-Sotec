"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, FolderTree, GalleryHorizontalEnd, Package, PackagePlus, Wrench, type LucideIcon } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { InicioGuia, type PasoGuia } from "@/components/admin/InicioGuia";
import { fechaCorta, formatoCOP } from "@/lib/formato";
import { BASE } from "@/lib/rutas";
import { esEjemplo } from "@/lib/semilla";
import { CONFIG_INICIAL, ETIQUETA_ESTADO, type Banner, type Categoria, type Configuracion, type EstadoPedido, type Marca, type Pedido, type Producto } from "@/lib/tipos";

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  contactado: "bg-sky-100 text-sky-900",
  cotizado: "bg-violet-100 text-violet-900",
  vendido: "bg-green-100 text-green-900",
  cancelado: "bg-gray-200 text-gray-700",
};

interface Datos {
  productos: Producto[];
  categorias: Categoria[];
  banners: Banner[];
  marcas: Marca[];
  pedidos: Pedido[];
  config: Configuracion;
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function armarPasos(d: Datos): PasoGuia[] {
  const propios = d.productos.filter((p) => !esEjemplo(p.id));
  const nProd = propios.filter((p) => p.tipo === "producto").length;
  const nServ = propios.filter((p) => p.tipo === "servicio").length;
  const bannersPropios = d.banners.filter((b) => b.ubicacion === "carrusel" && !esEjemplo(b.id)).length;
  const marcasPropias = d.marcas.filter((m) => !esEjemplo(m.id)).length;
  const catActivas = d.categorias.filter((c) => c.activa);
  const sinFoto = catActivas.filter((c) => !c.imagen).length;
  const ejemplos = d.productos.filter((p) => esEjemplo(p.id)).length + d.banners.filter((b) => esEjemplo(b.id)).length + d.marcas.filter((m) => esEjemplo(m.id)).length;
  const wpPorDefecto = d.config.whatsappHogar === CONFIG_INICIAL.whatsappHogar && d.config.whatsappEmpresa === CONFIG_INICIAL.whatsappEmpresa;

  const pasos: PasoGuia[] = [
    {
      id: "whatsapp",
      titulo: "Revisar los números de WhatsApp",
      detalle: wpPorDefecto
        ? "Los pedidos llegan al número de ejemplo. Confirma que sea el de ventas de SOTEC o cámbialo."
        : "Los pedidos de hogar y de empresas ya llegan a tus números.",
      estado: wpPorDefecto ? "revisar" : "hecho",
      href: "/admin/configuracion",
      boton: wpPorDefecto ? "Revisar números" : "Ver números",
    },
    {
      id: "categorias",
      titulo: "Poner foto a las categorías",
      detalle: !catActivas.length
        ? "Todavía no hay categorías visibles en la tienda."
        : sinFoto
          ? `Falta foto en ${plural(sinFoto, "categoría", "categorías")}. Sin foto se muestra solo un ícono.`
          : "Todas las categorías visibles tienen foto.",
      estado: catActivas.length && !sinFoto ? "hecho" : "pendiente",
      href: "/admin/categorias",
      boton: catActivas.length && !sinFoto ? "Ver categorías" : "Agregar fotos",
    },
    {
      id: "producto",
      titulo: "Agregar tu primer producto",
      detalle: nProd ? `Ya tienes ${plural(nProd, "producto propio", "productos propios")}.` : "Un equipo que vendas: nombre, foto, precio (o «a cotizar») y categoría.",
      estado: nProd ? "hecho" : "pendiente",
      href: nProd ? "/admin/productos" : "/admin/productos/editar",
      boton: nProd ? "Ver productos" : "Agregar producto",
    },
    {
      id: "servicio",
      titulo: "Agregar tu primer servicio",
      detalle: nServ ? `Ya tienes ${plural(nServ, "servicio propio", "servicios propios")}.` : "Por ejemplo, una instalación o un mantenimiento, con lo que incluye.",
      estado: nServ ? "hecho" : "pendiente",
      href: nServ ? "/admin/productos" : "/admin/productos/editar?tipo=servicio",
      boton: nServ ? "Ver servicios" : "Agregar servicio",
    },
    {
      id: "banner",
      titulo: "Crear el primer banner del carrusel",
      detalle: bannersPropios ? `Ya tienes ${plural(bannersPropios, "banner propio", "banners propios")} en la portada.` : "La imagen grande que se ve al entrar a la tienda.",
      estado: bannersPropios ? "hecho" : "pendiente",
      href: "/admin/banners",
      boton: bannersPropios ? "Ver banners" : "Crear banner",
    },
  ];
  if (ejemplos)
    pasos.push({
      id: "ejemplo",
      titulo: "Borrar el catálogo de ejemplo",
      detalle: `Hay ${plural(ejemplos, "elemento de ejemplo", "elementos de ejemplo")} (productos, banners o marcas). Bórralos cuando tengas los tuyos.`,
      estado: "pendiente",
      href: "/admin/productos",
      boton: "Ir a borrarlo",
    });
  pasos.push({
    id: "marcas",
    titulo: "Agregar las marcas que vendes",
    detalle: marcasPropias ? `Ya tienes ${plural(marcasPropias, "marca", "marcas")}.` : "Sirven para que el cliente filtre por marca. Puedes hacerlo después.",
    estado: marcasPropias ? "hecho" : "pendiente",
    href: "/admin/marcas",
    boton: marcasPropias ? "Ver marcas" : "Agregar marcas",
    opcional: true,
  });
  return pasos;
}

const ACCESOS: { texto: string; ayuda: string; href: string; Icono: LucideIcon; externo?: boolean }[] = [
  { texto: "Agregar producto", ayuda: "Un equipo para vender", href: "/admin/productos/editar", Icono: PackagePlus },
  { texto: "Agregar servicio", ayuda: "Instalación, mantenimiento…", href: "/admin/productos/editar?tipo=servicio", Icono: Wrench },
  { texto: "Nuevo banner", ayuda: "Imagen de la portada", href: "/admin/banners", Icono: GalleryHorizontalEnd },
  { texto: "Ver la tienda", ayuda: "Se abre en otra pestaña", href: `${BASE}/`, Icono: ExternalLink, externo: true },
];

export default function Resumen() {
  const { repo } = useTienda();
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    if (!repo) return;
    void (async () => {
      const [productos, categorias, banners, marcas, pedidos, config] = await Promise.all([
        repo.productos({ todos: true }),
        repo.categorias({ todas: true }),
        repo.banners({ todos: true }),
        repo.marcas({ todas: true }),
        repo.pedidos(),
        repo.configuracion(),
      ]);
      setDatos({ productos, categorias, banners, marcas, pedidos, config });
    })();
  }, [repo]);

  const pedidos = datos?.pedidos ?? [];
  const productos = datos?.productos ?? [];
  const pendientes = pedidos.filter((p) => p.estado === "pendiente").length;
  const tarjetas = [
    { t: "Pedidos pendientes", v: pendientes, href: "/admin/pedidos", Icono: ClipboardList, alerta: pendientes > 0 },
    { t: "Pedidos en total", v: pedidos.length, href: "/admin/pedidos", Icono: ClipboardList },
    { t: "Productos y servicios activos", v: `${productos.filter((p) => p.activo).length} de ${productos.length}`, href: "/admin/productos", Icono: Package },
    { t: "Categorías", v: datos?.categorias.length ?? 0, href: "/admin/categorias", Icono: FolderTree },
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Resumen</h1>
        <p className="mt-1 text-sm" data-saludo>
          {saludo()}. Desde aquí manejas la tienda virtual de SOTEC: lo que se vende, la portada y los pedidos que llegan por WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-accesos-rapidos>
        {ACCESOS.map(({ texto, ayuda, href, Icono, externo }) => {
          const contenido = (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-suave text-marca-oscuro">
                <Icono className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-3 block font-bold text-tinta">{texto}</span>
              <span className="block text-xs text-tenue">{ayuda}</span>
            </>
          );
          const clase = "tarjeta block min-h-[44px] p-4 transition-colors hover:border-marca-btn hover:bg-marca-suave/40";
          return externo ? (
            <a key={texto} href={href} target="_blank" rel="noopener" className={clase}>
              {contenido}
            </a>
          ) : (
            <Link key={texto} href={href} className={clase}>
              {contenido}
            </Link>
          );
        })}
      </div>

      {datos ? <InicioGuia pasos={armarPasos(datos)} /> : <div className="tarjeta h-40 animate-pulse" aria-busy="true" aria-label="Cargando la guía" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((x) => (
          <Link key={x.t} href={x.href} className={`tarjeta block p-4 hover:border-marca-btn ${x.alerta ? "border-amber-300 bg-amber-50" : ""}`}>
            <p className="flex items-center gap-2 text-sm">
              <x.Icono className="h-4 w-4 shrink-0" aria-hidden /> {x.t}
            </p>
            <p className="mt-1 text-2xl font-bold text-tinta">{x.v}</p>
          </Link>
        ))}
      </div>

      <section className="tarjeta p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-marca-oscuro underline-offset-4 hover:underline">
            Ver todos
          </Link>
        </div>
        {pedidos.length ? (
          <ul className="mt-1 divide-y divide-linea">
            {pedidos.slice(0, 5).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0">
                  <strong className="text-tinta">{p.codigo}</strong> · {p.cliente.nombre} · {fechaCorta(p.creado)}
                </span>
                <span className="flex items-center gap-2">
                  {formatoCOP(p.total)}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[p.estado]}`}>{ETIQUETA_ESTADO[p.estado]}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">Todavía no hay pedidos. Cuando un cliente envíe su carrito por WhatsApp, aparecerá aquí.</p>
        )}
      </section>
    </>
  );
}
