"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CircleAlert, ClipboardList, Database, Loader2, LogIn, Mail, MailCheck, ShieldCheck, FolderTree, GalleryHorizontal, KeyRound, Tags, LayoutDashboard, LogOut, Package, Settings, Store, TriangleAlert } from "lucide-react";

import { useTienda } from "@/components/Proveedor";
import { CampoClave } from "@/components/admin/CampoClave";
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

const CLAVE_CORREO = "sotec-tienda-correo-admin";

function leerCorreo() {
  try {
    return localStorage.getItem(CLAVE_CORREO) ?? "";
  } catch {
    return "";
  }
}

/** Marco común del ingreso: foto de SOTEC a la izquierda (escritorio) o arriba (celular) y la tarjeta. */
function MarcoAcceso({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-oscuro lg:grid lg:grid-cols-[1.1fr_1fr]" data-acceso-tienda>
      <div className="relative h-52 overflow-hidden sm:h-60 lg:h-auto">
        <img src={urlImagen("/img/categorias/cctv-tecnico-sotec.webp")} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-oscuro via-oscuro/70 to-oscuro/30 lg:bg-gradient-to-r lg:from-oscuro/95 lg:via-oscuro/70 lg:to-oscuro/20" />
        <div className="relative flex h-full flex-col justify-end p-5 pb-10 text-white sm:p-8 sm:pb-12 lg:justify-between lg:p-12">
          <img src={urlImagen("/img/sotec-emblem.webp")} alt="" className="hidden h-14 w-14 lg:block" />
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-widest text-marca">Tienda SOTEC</p>
            <p className="mt-1 font-titulo text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">Administra tu catálogo en un solo lugar</p>
            <ul className="mt-4 hidden space-y-2 text-sm text-white/80 lg:block">
              <li className="flex items-center gap-2"><Package className="h-4 w-4 text-marca" aria-hidden /> Productos, servicios, precios y fotos</li>
              <li className="flex items-center gap-2"><GalleryHorizontal className="h-4 w-4 text-marca" aria-hidden /> Banners y promociones de la portada</li>
              <li className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-marca" aria-hidden /> Pedidos que llegan por WhatsApp</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex items-start justify-center px-4 pb-10 lg:items-center lg:bg-fondo lg:p-10">
        <div className="-mt-6 w-full max-w-md lg:mt-0">
          <div className="tarjeta space-y-5 p-6 shadow-xl sm:p-8 lg:shadow-sm">{children}</div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-white/60 lg:text-tenue">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Conexión cifrada · Solo personal autorizado de SOTEC
          </p>
        </div>
      </div>
    </main>
  );
}

function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <img src={urlImagen("/img/logo-sotec.webp")} alt="SOTEC" className="h-10 w-auto" />
      <h1 className="mt-4 font-titulo text-2xl font-bold text-tinta">{titulo}</h1>
      <p className="mt-1 text-sm text-tenue">{texto}</p>
    </div>
  );
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" data-error-acceso>
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {texto}
    </p>
  );
}

function CampoCorreo({ valor }: { valor?: string }) {
  return (
    <div>
      <label htmlFor="correo" className="etiqueta">Correo</label>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tenue" aria-hidden />
        <input id="correo" name="correo" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required defaultValue={valor} placeholder="tu@sotecse.com" className="campo pl-10" />
      </div>
    </div>
  );
}

function Acceso({ alEntrar }: { alEntrar: (s: Sesion) => void }) {
  const { repo } = useTienda();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [correoGuardado, setCorreoGuardado] = useState<string | null>(null);
  const local = repo?.modo === "local";

  useEffect(() => setCorreoGuardado(leerCorreo()), []);

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

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!repo) return;
    const f = new FormData(e.currentTarget);
    const correo = String(f.get("correo") ?? "").trim();
    setCargando(true);
    setError(null);
    try {
      const sesion = await repo.entrar(correo, String(f.get("clave") ?? ""));
      try {
        if (f.get("recordar")) localStorage.setItem(CLAVE_CORREO, correo);
        else localStorage.removeItem(CLAVE_CORREO);
      } catch {
        /* sin almacenamiento: no pasa nada */
      }
      alEntrar(sesion);
    } catch (err) {
      setError(err instanceof ErrorDatos ? err.message : "No se pudo entrar.");
    } finally {
      setCargando(false);
    }
  }

  if (recuperando) {
    return (
      <MarcoAcceso>
        <form onSubmit={recuperar} className="space-y-5" data-form-recuperar>
          <Encabezado titulo="Recuperar contraseña" texto="Te enviaremos un enlace para crear una contraseña nueva." />
          {enviado ? (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900" data-recuperar-enviado>
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Si el correo pertenece a un usuario del panel, te llegará un enlace para crear una contraseña nueva. Ábrelo en este mismo navegador y revisa también la carpeta de spam.
            </p>
          ) : (
            <CampoCorreo valor={correoGuardado ?? undefined} key={correoGuardado ?? "vacio"} />
          )}
          {error && <MensajeError texto={error} />}
          {!enviado && (
            <button type="submit" className="btn-primario min-h-[48px] w-full text-base" disabled={cargando}>
              {cargando ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Enviando…</> : "Enviar enlace"}
            </button>
          )}
          <button type="button" className="btn w-full text-sm font-medium text-tenue hover:bg-fondo hover:text-tinta" onClick={() => (setRecuperando(false), setEnviado(false), setError(null))}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a iniciar sesión
          </button>
        </form>
      </MarcoAcceso>
    );
  }

  return (
    <MarcoAcceso>
      <form onSubmit={entrar} className="space-y-5" data-form-acceso>
        <Encabezado titulo="Inicia sesión" texto="Panel de administración de la tienda virtual." />
        {local ? (
          <>
            <AvisoDemo />
            <p className="text-sm">En este modo no hay usuarios: entra para probar el panel.</p>
          </>
        ) : (
          correoGuardado !== null && (
            <>
              <CampoCorreo valor={correoGuardado} />
              <CampoClave id="clave" name="clave" etiqueta="Contraseña" autoComplete="current-password" required conIcono autoFocus={!!correoGuardado} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-texto">
                  <input type="checkbox" name="recordar" defaultChecked={!!correoGuardado} className="h-4 w-4 rounded border-linea accent-marca-btn" data-recordar-correo />
                  Recordar mi correo
                </label>
                {repo?.recuperarClave && (
                  <button type="button" className="min-h-[44px] text-sm font-semibold text-marca-btn underline-offset-4 hover:text-marca-oscuro hover:underline" onClick={() => (setRecuperando(true), setError(null))} data-olvide-clave>
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
            </>
          )
        )}
        {error && <MensajeError texto={error} />}
        <button type="submit" className="btn-primario min-h-[48px] w-full text-base" disabled={cargando || !repo}>
          {local ? "Entrar al modo demostración" : cargando ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Entrando…</> : <><LogIn className="h-4 w-4" aria-hidden /> Entrar</>}
        </button>
        <Link href="/" className="btn w-full text-sm font-medium text-tenue hover:bg-fondo hover:text-tinta">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a la tienda
        </Link>
      </form>
    </MarcoAcceso>
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
