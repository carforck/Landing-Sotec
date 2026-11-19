"use client";

/** Estado compartido de la tienda: repositorio, catálogo, configuración y carrito persistente. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import * as C from "@/lib/carrito";
import { obtenerRepo, type Repositorio } from "@/lib/datos";
import { CONFIG_INICIAL, type Banner, type Categoria, type Configuracion, type ItemCarrito, type Producto } from "@/lib/tipos";

const CLAVE_CARRITO = "sotec-tienda-carrito";

interface Ctx {
  repo: Repositorio | null;
  listo: boolean;
  error: string | null;
  categorias: Categoria[];
  productos: Producto[];
  banners: Banner[];
  config: Configuracion;
  recargar: () => Promise<void>;
  carrito: ItemCarrito[];
  agregar: (p: Producto, cantidad?: number) => void;
  cambiarCantidad: (id: string, cantidad: number) => void;
  quitar: (id: string) => void;
  vaciar: () => void;
  aviso: string | null;
  avisar: (t: string) => void;
  /** Carrito lateral (drawer). */
  carritoAbierto: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
}

const Contexto = createContext<Ctx | null>(null);

export function useTienda(): Ctx {
  const c = useContext(Contexto);
  if (!c) throw new Error("useTienda fuera de <ProveedorTienda>");
  return c;
}

export function ProveedorTienda({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<Repositorio | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [config, setConfig] = useState<Configuracion>(CONFIG_INICIAL);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoLeido, setCarritoLeido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    const r = obtenerRepo();
    setRepo(r);
    try {
      const [cs, ps, cfg, bs] = await Promise.all([r.categorias(), r.productos(), r.configuracion(), r.banners()]);
      setCategorias(cs);
      setBanners(bs);
      setProductos(ps);
      setConfig(cfg);
      setError(null);
      setCarrito((actual) => C.sincronizar(actual, ps));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la tienda.");
    } finally {
      setListo(true);
    }
  }, []);

  useEffect(() => {
    try {
      setCarrito(C.leerCarrito(localStorage.getItem(CLAVE_CARRITO)));
    } catch {
      /* sin almacenamiento: carrito en memoria */
    }
    setCarritoLeido(true);
    void recargar();
  }, [recargar]);

  useEffect(() => {
    if (!carritoLeido) return;
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch {
      /* ignorar */
    }
  }, [carrito, carritoLeido]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  const valor = useMemo<Ctx>(
    () => ({
      repo,
      listo,
      error,
      categorias,
      productos,
      banners,
      config,
      recargar,
      carrito,
      agregar: (p, cantidad = 1) => {
        setCarrito((c) => C.agregar(c, p, cantidad));
        setAviso(`Agregaste «${p.nombre}» al carrito`);
      },
      cambiarCantidad: (id, cantidad) => setCarrito((c) => C.cambiarCantidad(c, id, cantidad)),
      quitar: (id) => setCarrito((c) => C.quitar(c, id)),
      vaciar: () => setCarrito([]),
      aviso,
      avisar: setAviso,
      carritoAbierto,
      abrirCarrito: () => setCarritoAbierto(true),
      cerrarCarrito: () => setCarritoAbierto(false),
    }),
    [repo, listo, error, categorias, productos, banners, config, recargar, carrito, aviso, carritoAbierto],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
