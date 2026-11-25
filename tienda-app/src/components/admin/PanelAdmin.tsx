"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Database, FolderTree, GalleryHorizontal, KeyRound, Tags, LayoutDashboard, LogOut, Package, Settings, Store, TriangleAlert } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { ErrorDatos, PANEL_DISPONIBLE, type Sesion } from "@/lib/datos";
import { BASE, urlImagen } from "@/lib/rutas";

const MENU = [
  { href: "/admin", texto: "Resumen", Icono: LayoutDashboard },
  { href: "/admin/productos", texto: "Productos y servicios", Icono: Package },
  { href: "/admin/categorias", texto: "Categorías", Icono: FolderTree },
  { href: "/admin/banners", texto: "Banners y promos", Icono: GalleryHorizontal },
  { href: "/admin/marcas", texto: "Marcas", Icono: Tags },
  { href: "/admin/pedidos", texto: "Pedidos", Icono: ClipboardList },
  { href: "/admin/configuracion", texto: "Configuración", Icono: Settings },
];

export function AvisoDemo() {
  const { repo } = useTienda();
  if (repo?.modo !== "local") return null;
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-aviso-demo>
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <strong>Modo demostración:</strong> los datos se guardan solo en este navegador. Lo que agregues aquí no lo ven otros visitantes hasta conectar la base de datos (Supabase).
      </p>
    </div>
  );
}

function Acceso({ alEntrar }: { alEntrar: (s: Sesion) => void }) {
  const { repo } = useTienda();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const local = repo?.modo === "local";

  async function recuperar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!repo?.recuperarClave) return;
    const correo = String(new FormData(e.currentTarget).get("correo") ?? "").trim();
    setCargando(true);
    setError(null);
    try {
      await repo.recuperarClave(correo, `${window.location.origin}${BASE}/admin/clave`);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo enviar el correo.");
    } finally {
      setCargando(false);
    }
  }

  if (recuperando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-4">
        <form onSubmit={recuperar} className="tarjeta w-full max-w-sm space-y-4 p-6" data-form-recuperar>
          <img src={urlImagen("/img/logo-sotec.webp")} alt="SOTEC" className="h-10 w-auto" />
          <h1 className="text-xl font-bold">Recuperar contraseña</h1>
          {enviado ? (
            <p role="status" className="text-sm" data-recuperar-enviado>
              Si el correo pertenece a un usuario del panel, te llegará un enlace para crear una contraseña nueva. Ábrelo en este mismo navegador y revisa también la carpeta de spam.
            </p>
          ) : (
            <div>
              <label htmlFor="correo" className="etiqueta">Correo</label>
              <input id="correo" name="correo" type="email" autoComplete="username" required className="campo" />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {!enviado && (
            <button type="submit" className="btn-primario w-full" disabled={cargando}>
              {cargando ? "Enviando…" : "Enviar enlace"}
            </button>
          )}
          <button type="button" className="btn-secundario w-full" onClick={() => (setRecuperando(false), setEnviado(false), setError(null))}>
            Volver a entrar
          </button>
        </form>
      </main>
    );
  }

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!repo) return;
    const f = new FormData(e.currentTarget);
    setCargando(true);
    setError(null);
    try {
      alEntrar(await repo.entrar(String(f.get("correo") ?? ""), String(f.get("clave") ?? "")));
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo entrar.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo p-4">
      <form onSubmit={entrar} className="tarjeta w-full max-w-sm space-y-4 p-6">
        <img src={urlImagen("/img/logo-sotec.webp")} alt="SOTEC" className="h-10 w-auto" />
        <h1 className="text-xl font-bold">Panel de la tienda</h1>
        {local ? (
          <>
            <AvisoDemo />
            <p className="text-sm">En este modo no hay usuarios: entra para probar el panel.</p>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="correo" className="etiqueta">Correo</label>
              <input id="correo" name="correo" type="email" autoComplete="username" required className="campo" />
            </div>
            <div>
              <label htmlFor="clave" className="etiqueta">Contraseña</label>
              <input id="clave" name="clave" type="password" autoComplete="current-password" required className="campo" />
            </div>
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primario w-full" disabled={cargando || !repo}>
          {local ? "Entrar al modo demostración" : cargando ? "Entrando…" : "Entrar"}
        </button>
        {repo?.recuperarClave && (
          <button type="button" className="btn w-full text-sm text-tenue hover:text-tinta" onClick={() => (setRecuperando(true), setError(null))} data-olvide-clave>
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <Link href="/" className="btn-secundario w-full">Volver a la tienda</Link>
      </form>
    </main>
  );
}

/** Sin base de datos (y sin NEXT_PUBLIC_TIENDA_PANEL_DEMO=1) el panel no se abre. */
function PanelCerrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo p-4">
      <div className="tarjeta w-full max-w-md space-y-4 p-6" data-panel-cerrado>
        <img src={urlImagen("/img/logo-sotec.webp")} alt="SOTEC" className="h-10 w-auto" />
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Database className="h-5 w-5 shrink-0" aria-hidden /> Panel no disponible
        </h1>
        <p className="text-sm">
          El panel de administración requiere la base de datos de la tienda, que todavía no está conectada. Mientras tanto la tienda funciona en modo demostración y los pedidos llegan por WhatsApp.
        </p>
        <Link href="/" className="btn-primario w-full">Volver a la tienda</Link>
      </div>
    </main>
  );
}

export function PanelAdmin({ children }: { children: ReactNode }) {
  if (!PANEL_DISPONIBLE) return <PanelCerrado />;
  return <PanelAbierto>{children}</PanelAbierto>;
}

function PanelAbierto({ children }: { children: ReactNode }) {
  const { repo, recargar } = useTienda();
  const ruta = usePathname();
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);

  const revisar = useCallback(async () => {
    if (!repo) return;
    setSesion(await repo.sesion());
  }, [repo]);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  if (sesion === undefined) return <main className="p-6" aria-busy="true">Cargando…</main>;
  if (!sesion || !sesion.esAdmin) return <Acceso alEntrar={setSesion} />;

  const activo = (href: string) => (href === "/admin" ? ruta === "/admin" : ruta.startsWith(href));

  return (
    <div className="min-h-screen bg-fondo md:flex">
      <aside className="border-b border-linea bg-oscuro text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 md:block md:py-5">
          <p className="font-titulo text-lg font-bold">Tienda SOTEC</p>
          <p className="hidden text-xs text-white/60 md:block">{sesion.correo}</p>
        </div>
        <nav aria-label="Panel" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-0">
          {[...MENU, ...(repo?.cambiarClave ? [{ href: "/admin/clave", texto: "Contraseña", Icono: KeyRound }] : [])].map(({ href, texto, Icono }) => (
            <Link
              key={href}
              href={href}
              aria-current={activo(href) ? "page" : undefined}
              className={`btn shrink-0 justify-start whitespace-nowrap ${activo(href) ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
            >
              <Icono className="h-4 w-4" aria-hidden /> {texto}
            </Link>
          ))}
          <Link href="/" className="btn shrink-0 justify-start whitespace-nowrap text-white/75 hover:bg-white/10 hover:text-white">
            <Store className="h-4 w-4" aria-hidden /> Ver tienda
          </Link>
          <button
            type="button"
            className="btn shrink-0 justify-start whitespace-nowrap text-white/75 hover:bg-white/10 hover:text-white"
            onClick={async () => {
              await repo?.salir();
              await recargar();
              setSesion(null);
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden /> Salir
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <AvisoDemo />
          {children}
        </div>
      </main>
    </div>
  );
}
